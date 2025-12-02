// Test Case: Token Minting on Deposit
// File: test/DepositTokenMinting.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Deposit Token Minting", () => {
  let governanceToken;
  let treasuryDAO;
  let owner;
  let user1;
  let user2;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "DAO Governance Token",
      "GOV",
      1000000,
      owner.address
    );
    await governanceToken.waitForDeployment();

    // Deploy TreasuryDAO
    const TreasuryDAO = await ethers.getContractFactory("TreasuryDAO");
    treasuryDAO = await TreasuryDAO.deploy(await governanceToken.getAddress());
    await treasuryDAO.waitForDeployment();

    // Set TreasuryDAO address in GovernanceToken
    await governanceToken.setTreasuryDAOAddress(await treasuryDAO.getAddress());
  });

  it("Should mint 1000 GOV tokens when user deposits 1 ETH", async () => {
    const depositAmount = ethers.parseEther("1.0");

    // Get user's balance before deposit
    const balanceBefore = await governanceToken.balanceOf(user1.address);
    expect(balanceBefore).to.equal(0);

    // User deposits 1 ETH
    await treasuryDAO.connect(user1).depositFunds({ value: depositAmount });

    // Check user received 1000 GOV tokens
    const balanceAfter = await governanceToken.balanceOf(user1.address);
    const expectedTokens = ethers.parseEther("1000"); // 1000 tokens = 1000 * 1e18 wei
    expect(balanceAfter).to.equal(expectedTokens);
  });

  it("Should mint 2500 GOV tokens when user deposits 2.5 ETH", async () => {
    const depositAmount = ethers.parseEther("2.5");

    // User deposits 2.5 ETH
    await treasuryDAO.connect(user1).depositFunds({ value: depositAmount });

    // Check user received 2500 GOV tokens
    const balance = await governanceToken.balanceOf(user1.address);
    const expectedTokens = ethers.parseEther("2500"); // 2.5 * 1000 = 2500
    expect(balance).to.equal(expectedTokens);
  });

  it("Should increase treasury balance when user deposits", async () => {
    const depositAmount = ethers.parseEther("1.0");

    // Get treasury balance before deposit
    const balanceBefore = await treasuryDAO.getTreasuryBalance();

    // User deposits 1 ETH
    await treasuryDAO.connect(user1).depositFunds({ value: depositAmount });

    // Check treasury balance increased
    const balanceAfter = await treasuryDAO.getTreasuryBalance();
    expect(balanceAfter).to.equal(balanceBefore + depositAmount);
  });

  it("Should allow user to create proposal after deposit (has voting power)", async () => {
    // User deposits 1 ETH and gets 1000 GOV tokens
    await treasuryDAO
      .connect(user1)
      .depositFunds({ value: ethers.parseEther("1.0") });

    // User should now have voting power
    const votingPower = await governanceToken.getVotingPower(user1.address);
    expect(votingPower).to.be.gt(0);

    // User should be able to create a proposal (has tokens)
    const recipient = user2.address;
    const amount = ethers.parseEther("1.0");
    const description = "Test Proposal";

    // Deposit some ETH to treasury first so it has funds for the proposal
    await treasuryDAO
      .connect(owner)
      .depositFunds({ value: ethers.parseEther("10.0") });

    // Now user1 can create a proposal
    await expect(
      treasuryDAO.connect(user1).createProposal(recipient, amount, description)
    ).to.not.be.reverted;
  });

  it("Multiple deposits should mint tokens correctly", async () => {
    // First deposit: 1 ETH
    await treasuryDAO
      .connect(user1)
      .depositFunds({ value: ethers.parseEther("1.0") });
    const balance1 = await governanceToken.balanceOf(user1.address);
    expect(balance1).to.equal(ethers.parseEther("1000"));

    // Second deposit: 0.5 ETH
    await treasuryDAO
      .connect(user1)
      .depositFunds({ value: ethers.parseEther("0.5") });
    const balance2 = await governanceToken.balanceOf(user1.address);
    expect(balance2).to.equal(ethers.parseEther("1500")); // 1000 + 500
  });

  it("Should reject deposits of 0 ETH", async () => {
    await expect(
      treasuryDAO.connect(user1).depositFunds({ value: 0 })
    ).to.be.revertedWith("Must deposit some ETH");
  });

  it("Deposit event should be emitted with correct data", async () => {
    const depositAmount = ethers.parseEther("1.0");

    await expect(
      treasuryDAO.connect(user1).depositFunds({ value: depositAmount })
    )
      .to.emit(treasuryDAO, "FundsDeposited")
      .withArgs(user1.address, depositAmount);
  });
});

// EXPECTED OUTPUT:
// ✓ Should mint 1000 GOV tokens when user deposits 1 ETH
// ✓ Should mint 2500 GOV tokens when user deposits 2.5 ETH
// ✓ Should increase treasury balance when user deposits
// ✓ Should allow user to create proposal after deposit (has voting power)
// ✓ Multiple deposits should mint tokens correctly
// ✓ Should reject deposits of 0 ETH
// ✓ Deposit event should be emitted with correct data
//
// 7 tests passed!
