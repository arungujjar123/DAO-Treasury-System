const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TreasuryDAO", function () {
  let GovernanceToken;
  let TreasuryDAO;
  let governanceToken;
  let treasuryDAO;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy GovernanceToken
    GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "DAO Governance Token",
      "GOV",
      1000000,
      owner.address
    );
    await governanceToken.waitForDeployment();

    // Deploy TreasuryDAO
    TreasuryDAO = await ethers.getContractFactory("TreasuryDAO");
    treasuryDAO = await TreasuryDAO.deploy(await governanceToken.getAddress());
    await treasuryDAO.waitForDeployment();

    // Distribute tokens for testing
    await governanceToken.mint(addr1.address, ethers.parseEther("10000"));
    await governanceToken.mint(addr2.address, ethers.parseEther("5000"));
    await governanceToken.mint(addr3.address, ethers.parseEther("2000"));

    // Add funds to treasury
    await treasuryDAO.depositFunds({ value: ethers.parseEther("10") });
  });

  describe("Deployment", function () {
    it("Should set the correct governance token", async function () {
      expect(await treasuryDAO.governanceToken()).to.equal(
        await governanceToken.getAddress()
      );
    });

    it("Should start with zero proposals", async function () {
      expect(await treasuryDAO.proposalCount()).to.equal(0);
    });
  });

  describe("Fund Management", function () {
    it("Should accept ETH deposits", async function () {
      const depositAmount = ethers.parseEther("5");

      await expect(() =>
        treasuryDAO.connect(addr1).depositFunds({ value: depositAmount })
      ).to.changeEtherBalance(treasuryDAO, depositAmount);
    });

    it("Should emit FundsDeposited event", async function () {
      const depositAmount = ethers.parseEther("1");

      await expect(
        treasuryDAO.connect(addr1).depositFunds({ value: depositAmount })
      )
        .to.emit(treasuryDAO, "FundsDeposited")
        .withArgs(addr1.address, depositAmount);
    });

    it("Should return correct treasury balance", async function () {
      const balance = await treasuryDAO.getTreasuryBalance();
      expect(balance).to.equal(ethers.parseEther("10"));
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow token holders to create proposals", async function () {
      const amount = ethers.parseEther("2");
      const description = "Fund community event";

      await expect(
        treasuryDAO
          .connect(addr1)
          .createProposal(addr3.address, amount, description)
      ).to.emit(treasuryDAO, "ProposalCreated");

      expect(await treasuryDAO.proposalCount()).to.equal(1);
    });

    it("Should not allow non-token holders to create proposals", async function () {
      const amount = ethers.parseEther("1");
      const description = "Test proposal";

      // addr1 has no tokens initially (we need to use a fresh address)
      const [, , , , noTokensAddr] = await ethers.getSigners();

      await expect(
        treasuryDAO
          .connect(noTokensAddr)
          .createProposal(addr3.address, amount, description)
      ).to.be.revertedWith("Must hold governance tokens");
    });

    it("Should not allow proposals with invalid parameters", async function () {
      const amount = ethers.parseEther("1");

      // Invalid recipient
      await expect(
        treasuryDAO
          .connect(addr1)
          .createProposal(ethers.ZeroAddress, amount, "Test")
      ).to.be.revertedWith("Invalid recipient");

      // Zero amount
      await expect(
        treasuryDAO.connect(addr1).createProposal(addr3.address, 0, "Test")
      ).to.be.revertedWith("Amount must be greater than 0");

      // Empty description
      await expect(
        treasuryDAO.connect(addr1).createProposal(addr3.address, amount, "")
      ).to.be.revertedWith("Description cannot be empty");

      // Amount exceeds treasury balance
      const excessiveAmount = ethers.parseEther("20");
      await expect(
        treasuryDAO
          .connect(addr1)
          .createProposal(addr3.address, excessiveAmount, "Test")
      ).to.be.revertedWith("Insufficient treasury balance");
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      const amount = ethers.parseEther("2");
      const description = "Fund community event";
      await treasuryDAO
        .connect(addr1)
        .createProposal(addr3.address, amount, description);
      proposalId = 1;
    });

    it("Should allow token holders to vote", async function () {
      await expect(treasuryDAO.connect(addr1).vote(proposalId, true))
        .to.emit(treasuryDAO, "VoteCast")
        .withArgs(proposalId, addr1.address, true, ethers.parseEther("10000"));
    });

    it("Should not allow voting twice", async function () {
      await treasuryDAO.connect(addr1).vote(proposalId, true);

      await expect(
        treasuryDAO.connect(addr1).vote(proposalId, true)
      ).to.be.revertedWith("Already voted");
    });

    it("Should not allow non-token holders to vote", async function () {
      const [, , , , noTokensAddr] = await ethers.getSigners();

      await expect(
        treasuryDAO.connect(noTokensAddr).vote(proposalId, true)
      ).to.be.revertedWith("Must hold governance tokens");
    });

    it("Should correctly track vote counts", async function () {
      await treasuryDAO.connect(addr1).vote(proposalId, true); // 10000 votes for
      await treasuryDAO.connect(addr2).vote(proposalId, false); // 5000 votes against

      const proposal = await treasuryDAO.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(ethers.parseEther("10000"));
      expect(proposal.againstVotes).to.equal(ethers.parseEther("5000"));
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      const amount = ethers.parseEther("2");
      const description = "Fund community event";
      await treasuryDAO
        .connect(addr1)
        .createProposal(addr3.address, amount, description);
      proposalId = 1;
    });

    it("Should execute proposal when it passes", async function () {
      // Vote to pass the proposal
      await treasuryDAO.connect(addr1).vote(proposalId, true); // 10000 votes
      await treasuryDAO.connect(addr2).vote(proposalId, true); // 5000 votes
      await treasuryDAO.connect(addr3).vote(proposalId, true); // 2000 votes

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]); // 3 days + 1 second
      await ethers.provider.send("evm_mine");

      const initialBalance = await ethers.provider.getBalance(addr3.address);

      await expect(treasuryDAO.executeProposal(proposalId))
        .to.emit(treasuryDAO, "ProposalExecuted")
        .withArgs(proposalId, addr3.address, ethers.parseEther("2"));

      // Check that funds were transferred
      const finalBalance = await ethers.provider.getBalance(addr3.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("2"));
    });

    it("Should not execute proposal before voting period ends", async function () {
      await treasuryDAO.connect(addr1).vote(proposalId, true);

      await expect(treasuryDAO.executeProposal(proposalId)).to.be.revertedWith(
        "Voting period not ended"
      );
    });

    it("Should not execute proposal that didn't pass", async function () {
      // Vote against the proposal
      await treasuryDAO.connect(addr1).vote(proposalId, false);
      await treasuryDAO.connect(addr2).vote(proposalId, false);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(treasuryDAO.executeProposal(proposalId)).to.be.revertedWith(
        "Proposal did not pass"
      );
    });

    it("Should not execute proposal twice", async function () {
      // Vote to pass
      await treasuryDAO.connect(addr1).vote(proposalId, true);
      await treasuryDAO.connect(addr2).vote(proposalId, true);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute once
      await treasuryDAO.executeProposal(proposalId);

      // Try to execute again
      await expect(treasuryDAO.executeProposal(proposalId)).to.be.revertedWith(
        "Proposal already executed"
      );
    });
  });

  describe("Proposal Passing Logic", function () {
    let proposalId;

    beforeEach(async function () {
      const amount = ethers.parseEther("1");
      await treasuryDAO
        .connect(addr1)
        .createProposal(addr3.address, amount, "Test");
      proposalId = 1;
    });

    it("Should require quorum to pass", async function () {
      // Only small vote (less than 10% of total supply)
      await treasuryDAO.connect(addr3).vote(proposalId, true); // 2000 votes (< 10% of ~1M total)

      expect(await treasuryDAO.hasProposalPassed(proposalId)).to.be.false;
    });

    it("Should require majority of votes cast", async function () {
      // Meet quorum but not majority
      await treasuryDAO.connect(addr1).vote(proposalId, false); // 10000 against
      await treasuryDAO.connect(addr2).vote(proposalId, true); // 5000 for

      expect(await treasuryDAO.hasProposalPassed(proposalId)).to.be.false;
    });

    it("Should pass with quorum and majority", async function () {
      await treasuryDAO.connect(addr1).vote(proposalId, true); // 10000 for
      await treasuryDAO.connect(addr2).vote(proposalId, true); // 5000 for
      await treasuryDAO.connect(addr3).vote(proposalId, false); // 2000 against

      expect(await treasuryDAO.hasProposalPassed(proposalId)).to.be.true;
    });
  });

  describe("View Functions", function () {
    let proposalId;

    beforeEach(async function () {
      const amount = ethers.parseEther("1");
      await treasuryDAO
        .connect(addr1)
        .createProposal(addr3.address, amount, "Test proposal");
      proposalId = 1;
      await treasuryDAO.connect(addr1).vote(proposalId, true);
    });

    it("Should return proposal details", async function () {
      const proposal = await treasuryDAO.getProposal(proposalId);

      expect(proposal.id).to.equal(proposalId);
      expect(proposal.proposer).to.equal(addr1.address);
      expect(proposal.recipient).to.equal(addr3.address);
      expect(proposal.amount).to.equal(ethers.parseEther("1"));
      expect(proposal.description).to.equal("Test proposal");
    });

    it("Should track voting status", async function () {
      expect(await treasuryDAO.hasVoted(proposalId, addr1.address)).to.be.true;
      expect(await treasuryDAO.hasVoted(proposalId, addr2.address)).to.be.false;
    });

    it("Should return vote choice", async function () {
      expect(await treasuryDAO.getVoteChoice(proposalId, addr1.address)).to.be
        .true;
    });

    it("Should revert when getting vote choice for non-voter", async function () {
      await expect(
        treasuryDAO.getVoteChoice(proposalId, addr2.address)
      ).to.be.revertedWith("Address has not voted");
    });
  });
});
