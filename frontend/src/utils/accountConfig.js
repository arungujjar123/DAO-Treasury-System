// Add this to know which account should be the "default" or "admin" account
// The app will check if connected account matches and show a warning if not

export const EXPECTED_ACCOUNTS = {
  // The deployer/owner account (has special privileges)
  DEPLOYER: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0 from Hardhat

  // Add your preferred account address here
  // To find your account address from private key:
  // In MetaMask: Click account → Account details → Copy address
  PREFERRED: null, // Set this to the address you want to use
};

// Check if connected account is the expected one
export const isExpectedAccount = (connectedAccount) => {
  if (!connectedAccount) return false;

  const expected = EXPECTED_ACCOUNTS.PREFERRED || EXPECTED_ACCOUNTS.DEPLOYER;
  return connectedAccount.toLowerCase() === expected.toLowerCase();
};

// Get account info from private key
export const getAccountFromPrivateKey = (privateKey) => {
  const { ethers } = require("ethers");
  try {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: privateKey,
    };
  } catch (error) {
    console.error("Invalid private key:", error);
    return null;
  }
};
