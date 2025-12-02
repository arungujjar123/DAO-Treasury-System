// Frontend-style treasury balance checker using ethers.js
// Run with: node frontend-check-balance.js

const ethers = require("ethers");

// Connect to local Hardhat network
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// TreasuryDAO contract address (from deployments)
const TREASURY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Minimal ABI for balance check
const TREASURY_ABI = ["function getAddress() view returns (address)"];

async function checkTreasuryBalance() {
  try {
    console.log("🔗 Connecting to local blockchain...");

    // Get the treasury contract
    const treasury = new ethers.Contract(
      TREASURY_ADDRESS,
      TREASURY_ABI,
      provider
    );

    // Get treasury address and balance
    const treasuryAddress = await treasury.getAddress();
    const balance = await provider.getBalance(treasuryAddress);

    console.log("💰 Treasury Balance:", ethers.formatEther(balance), "ETH");
    console.log("🏦 Treasury Address:", treasuryAddress);
  } catch (error) {
    console.error("❌ Error checking treasury balance:", error.message);
  }
}

// Run the check
checkTreasuryBalance();
