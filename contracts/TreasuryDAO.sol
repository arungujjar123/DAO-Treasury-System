// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./GovernanceToken.sol";

/**
 * @title TreasuryDAO
 * @dev Main DAO contract for treasury management and governance
 */
contract TreasuryDAO is ReentrancyGuard {
    GovernanceToken public governanceToken;
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        address payable recipient;
        uint256 amount;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        bool exists;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true for yes, false for no
    }
    
    // State variables
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant DEFAULT_VOTING_PERIOD = 3 days;
    uint256 public constant MIN_VOTING_PERIOD = 1 minutes;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total supply needed for quorum
    uint256 public constant MAJORITY_PERCENTAGE = 51; // 51% majority needed to pass
    // Token minting rate: how many GOV tokens per 1 ETH deposited
    // Example: TOKENS_PER_ETH = 100000 => depositing 1 ETH mints 100,000 GOV
    uint256 public constant TOKENS_PER_ETH = 100000;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        string description,
        uint256 deadline
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );
    
    event FundsDeposited(address indexed depositor, uint256 amount);
    
    // Modifiers
    modifier onlyTokenHolder() {
        require(governanceToken.balanceOf(msg.sender) > 0, "Must hold governance tokens");
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposals[proposalId].exists, "Proposal does not exist");
        _;
    }
    
    modifier votingActive(uint256 proposalId) {
        require(block.timestamp <= proposals[proposalId].deadline, "Voting period ended");
        require(!proposals[proposalId].executed, "Proposal already executed");
        _;
    }
    
    constructor(address _governanceToken) {
        governanceToken = GovernanceToken(_governanceToken);
    }
    
    /**
     * @dev Deposit ETH to the treasury and receive GOV tokens
     * Exchange rate: 1 ETH = 100,000 GOV tokens
     */
    function depositFunds() external payable {
        require(msg.value > 0, "Must deposit some ETH");

        // Calculate GOV tokens to mint.
        // msg.value is in wei (1 ETH = 1e18 wei).
        // Token base units also use 18 decimals, so multiplying wei by
        // TOKENS_PER_ETH yields the correct token base units.
        // Example: msg.value = 1e18 (1 ETH) -> tokenAmount = 1e18 * 1000 = 1000 * 1e18
        uint256 tokenAmount = msg.value * TOKENS_PER_ETH;

        // Mint GOV tokens to the depositor using the mintByMinter method.
        // The TreasuryDAO contract must be authorized as a minter in the
        // GovernanceToken contract (owner should call setMinter).
        governanceToken.mintByMinter(msg.sender, tokenAmount);

        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Create a new proposal
     * @param recipient Address to receive funds if proposal passes
     * @param amount Amount of ETH to send
     * @param description Description of the proposal
     * @param duration Voting duration in seconds
     */
    function createProposal(
        address payable recipient,
        uint256 amount,
        string memory description,
        uint256 duration
    ) external onlyTokenHolder {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient treasury balance");
        require(bytes(description).length > 0, "Description cannot be empty");
        if (duration == 0) {
            duration = DEFAULT_VOTING_PERIOD;
        } else {
            require(duration >= MIN_VOTING_PERIOD, "Duration too short");
            require(duration <= MAX_VOTING_PERIOD, "Duration too long");
        }
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        uint256 deadline = block.timestamp + duration;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.recipient = recipient;
        newProposal.amount = amount;
        newProposal.description = description;
        newProposal.deadline = deadline;
        newProposal.exists = true;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            recipient,
            amount,
            description,
            deadline
        );
    }
    
    /**
     * @dev Vote on a proposal
     * @param proposalId ID of the proposal to vote on
     * @param support True for yes vote, false for no vote
     */
    function vote(uint256 proposalId, bool support) 
        external 
        onlyTokenHolder 
        proposalExists(proposalId) 
        votingActive(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votingPower = governanceToken.getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = support;
        
        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votingPower);
    }
    
    /**
     * @dev Execute a proposal if it has passed
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) 
        external 
        nonReentrant 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.deadline, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        // Check if proposal has passed
        require(hasProposalPassed(proposalId), "Proposal did not pass");
        
        proposal.executed = true;
        
        // Transfer funds
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");
        
        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }
    
    /**
     * @dev Check if a proposal has passed
     * @param proposalId ID of the proposal to check
     * @return True if proposal passed, false otherwise
     */
    function hasProposalPassed(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        
        // Check quorum
        uint256 quorumRequired = (totalSupply * QUORUM_PERCENTAGE) / 100;
        if (totalVotes < quorumRequired) {
            return false;
        }
        
        // Check majority
        uint256 majorityRequired = (totalVotes * MAJORITY_PERCENTAGE) / 100;
        return proposal.forVotes >= majorityRequired;
    }
    
    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * @return id The proposal ID
     * @return proposer Address of the proposer
     * @return recipient Address of the recipient
     * @return amount Amount of ETH requested
     * @return description Description of the proposal
     * @return forVotes Number of votes in favor
     * @return againstVotes Number of votes against
     * @return deadline Voting deadline timestamp
     * @return executed Whether proposal has been executed
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        address recipient,
        uint256 amount,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 deadline,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "Proposal does not exist");
        
        return (
            proposal.id,
            proposal.proposer,
            proposal.recipient,
            proposal.amount,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.deadline,
            proposal.executed
        );
    }
    
    /**
     * @dev Check if an address has voted on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address to check
     * @return True if voter has voted, false otherwise
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get vote choice of an address for a proposal
     * @param proposalId ID of the proposal
     * @param voter Address to check
     * @return Vote choice (true for yes, false for no)
     */
    function getVoteChoice(uint256 proposalId, address voter) external view returns (bool) {
        require(proposals[proposalId].hasVoted[voter], "Address has not voted");
        return proposals[proposalId].voteChoice[voter];
    }
    
    /**
     * @dev Get treasury balance
     * @return Current ETH balance of the treasury
     */
    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}