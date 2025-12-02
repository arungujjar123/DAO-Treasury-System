const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceToken", function () {
  let GovernanceToken;
  let governanceToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "DAO Governance Token",
      "GOV",
      1000000, // 1M tokens
      owner.address
    );
    await governanceToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await governanceToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await governanceToken.balanceOf(owner.address);
      expect(await governanceToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await governanceToken.name()).to.equal("DAO Governance Token");
      expect(await governanceToken.symbol()).to.equal("GOV");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await governanceToken.mint(addr1.address, mintAmount);

      expect(await governanceToken.balanceOf(addr1.address)).to.equal(
        mintAmount
      );
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        governanceToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(
        governanceToken,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Burning", function () {
    it("Should allow token holders to burn their tokens", async function () {
      const initialBalance = await governanceToken.balanceOf(owner.address);
      const burnAmount = ethers.parseEther("1000");

      await governanceToken.burn(burnAmount);

      expect(await governanceToken.balanceOf(owner.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("Should fail when trying to burn more than balance", async function () {
      const balance = await governanceToken.balanceOf(addr1.address);
      const burnAmount = balance + ethers.parseEther("1");

      await expect(
        governanceToken.connect(addr1).burn(burnAmount)
      ).to.be.revertedWithCustomError(
        governanceToken,
        "ERC20InsufficientBalance"
      );
    });
  });

  describe("Voting Power", function () {
    it("Should return correct voting power", async function () {
      const mintAmount = ethers.parseEther("5000");
      await governanceToken.mint(addr1.address, mintAmount);

      expect(await governanceToken.getVotingPower(addr1.address)).to.equal(
        mintAmount
      );
    });

    it("Should return zero voting power for accounts with no tokens", async function () {
      expect(await governanceToken.getVotingPower(addr2.address)).to.equal(0);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("1000");

      await governanceToken.transfer(addr1.address, transferAmount);

      expect(await governanceToken.balanceOf(addr1.address)).to.equal(
        transferAmount
      );
    });

    it("Should update voting power after transfer", async function () {
      const transferAmount = ethers.parseEther("1000");

      await governanceToken.transfer(addr1.address, transferAmount);

      expect(await governanceToken.getVotingPower(addr1.address)).to.equal(
        transferAmount
      );
    });
  });
});
