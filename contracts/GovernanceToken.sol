// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token used for DAO governance voting
 */
contract GovernanceToken is ERC20, Ownable {
    // Address of TreasuryDAO contract allowed to mint tokens
    address public treasuryDAOAddress;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) {
        _transferOwnership(initialOwner);
        _mint(initialOwner, initialSupply * 10**decimals());
    }
    
    /**
     * @dev Set the TreasuryDAO contract address (only owner)
     * @param _treasuryDAO Address of the TreasuryDAO contract
     */
    function setTreasuryDAOAddress(address _treasuryDAO) external onlyOwner {
        require(_treasuryDAO != address(0), "Invalid TreasuryDAO address");
        treasuryDAOAddress = _treasuryDAO;
    }

    /**
     * @dev Mint new tokens (only owner or TreasuryDAO can mint)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public {
        require(
            msg.sender == owner() || msg.sender == treasuryDAOAddress,
            "Only owner or TreasuryDAO can mint"
        );
        _mint(to, amount);
    }
    
    // --- Minter role for authorized contracts (e.g. TreasuryDAO) ---
    mapping(address => bool) private _minters;
    
    event MinterUpdated(address indexed account, bool allowed);
    
    /**
     * @dev Owner can add/remove minters (e.g. TreasuryDAO contract)
     */
    function setMinter(address account, bool allowed) external onlyOwner {
        _minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }
    
    /**
     * @dev Mint tokens by authorized minters (not only owner). This is
     * intended for minting tokens to users when they deposit ETH into the
     * TreasuryDAO contract. The amount is in token base units (wei-like).
     */
    function mintByMinter(address to, uint256 amount) external {
        require(_minters[msg.sender], "GovernanceToken: caller is not a minter");
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Get voting power of an account (same as balance)
     * @param account Address to check voting power for
     * @return Voting power of the account
     */
    function getVotingPower(address account) public view returns (uint256) {
        return balanceOf(account);
    }
}