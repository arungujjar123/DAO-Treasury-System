const { ethers } = require("hardhat");

async function main() {
  console.log("Hardhat Test Accounts:");
  console.log("======================\n");

  const accounts = await ethers.getSigners();

  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const account = accounts[i];
    const balance = await ethers.provider.getBalance(account.address);

    console.log(`Account ${i}:`);
    console.log(`  Address: ${account.address}`);
    console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
    console.log();
  }

  console.log("\nPrivate Keys (for MetaMask import):");
  console.log("====================================\n");

  const privateKeys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account 0
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account 1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account 2
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account 3
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account 4
  ];

  privateKeys.forEach((pk, i) => {
    const wallet = new ethers.Wallet(pk);
    console.log(`Account ${i}:`);
    console.log(`  Private Key: ${pk}`);
    console.log(`  Starts with: 0x${pk.substring(2, 6)}...`);
    console.log(`  Address: ${wallet.address}`);
    console.log();
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
