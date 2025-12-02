const { ethers } = require("ethers");

async function testContract() {
  try {
    console.log("Testing contract connection...\n");

    // Connect to local Hardhat node
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    console.log("✅ Connected to Hardhat node");

    // Load contract addresses
    const deployments = require("./frontend/public/contracts/deployments.json");
    console.log("✅ Loaded deployment addresses");
    console.log("   TreasuryDAO:", deployments.treasuryDAO);
    console.log("   GovernanceToken:", deployments.governanceToken);

    // Load contract ABIs from artifacts
    const TreasuryDAO_Artifact = require("./artifacts/contracts/TreasuryDAO.sol/TreasuryDAO.json");
    const GovernanceToken_Artifact = require("./artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
    console.log("✅ Loaded contract ABIs from artifacts\n");

    // Create contract instances
    const treasuryDAO = new ethers.Contract(
      deployments.treasuryDAO,
      TreasuryDAO_Artifact.abi,
      provider
    );

    const governanceToken = new ethers.Contract(
      deployments.governanceToken,
      GovernanceToken_Artifact.abi,
      provider
    );

    // Test TreasuryDAO calls
    console.log("Testing TreasuryDAO contract calls:");
    console.log("=====================================");

    const proposalCount = await treasuryDAO.proposalCount();
    console.log("✅ Proposal Count:", proposalCount.toString());

    const treasuryBalance = await treasuryDAO.getTreasuryBalance();
    console.log(
      "✅ Treasury Balance:",
      ethers.formatEther(treasuryBalance),
      "ETH"
    );

    const govTokenAddress = await treasuryDAO.governanceToken();
    console.log("✅ Governance Token Address:", govTokenAddress);

    // Test GovernanceToken calls
    console.log("\nTesting GovernanceToken contract calls:");
    console.log("========================================");

    const tokenName = await governanceToken.name();
    console.log("✅ Token Name:", tokenName);

    const tokenSymbol = await governanceToken.symbol();
    console.log("✅ Token Symbol:", tokenSymbol);

    const totalSupply = await governanceToken.totalSupply();
    console.log("✅ Total Supply:", ethers.formatEther(totalSupply), "GOV");

    console.log("\n🎉 All contract calls successful!");
    console.log(
      "\n💡 The issue is likely that the frontend is using simplified ABIs."
    );
    console.log("   We need to use the full ABIs from compiled artifacts.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\nFull error:", error);
  }
}

testContract();
