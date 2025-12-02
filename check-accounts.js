const { ethers } = require("ethers");

console.log("Hardhat Test Accounts - Private Keys & Addresses");
console.log("=================================================\n");

const privateKeys = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account 0
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account 1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account 2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account 3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account 4
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // Account 5
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // Account 6
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // Account 7
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // Account 8
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", // Account 9
];

privateKeys.forEach((pk, i) => {
  const wallet = new ethers.Wallet(pk);
  const pkStart = pk.substring(2, 6); // First 4 chars after 0x

  console.log(`Account ${i}:`);
  console.log(`  Private Key: ${pk}`);
  console.log(
    `  Starts with: 0x${pkStart}... ✅ ${
      pkStart === "27ef"
        ? "← YOUR ACCOUNT (27ef)"
        : pkStart === "26ef"
        ? "← CURRENT METAMASK (26ef)"
        : ""
    }`
  );
  console.log(`  Address: ${wallet.address}`);
  console.log();
});

console.log("\n📌 IMPORTANT:");
console.log("==============");
console.log("The app connects to whichever account is SELECTED in MetaMask.");
console.log("MetaMask doesn't auto-connect to a specific private key.");
console.log("\nTo use the account with '27ef' private key:");
console.log(
  "1. Find which account number has private key starting with 27ef (check above)"
);
console.log("2. Import that account in MetaMask if not already imported");
console.log("3. Switch to that account in MetaMask");
console.log("4. Refresh the app - it will connect to the selected account\n");
