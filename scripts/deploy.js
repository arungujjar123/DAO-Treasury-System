const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DAO Treasury Management System...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // Deploy GovernanceToken
  console.log("\n1. Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DAO Governance Token", // name
    "GOV", // symbol
    1000000, // initial supply (1M tokens)
    deployer.address // initial owner
  );

  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  console.log("GovernanceToken deployed to:", governanceTokenAddress);

  // Deploy TreasuryDAO
  console.log("\n2. Deploying TreasuryDAO...");
  const TreasuryDAO = await ethers.getContractFactory("TreasuryDAO");
  const treasuryDAO = await TreasuryDAO.deploy(governanceTokenAddress);

  await treasuryDAO.waitForDeployment();
  const treasuryDAOAddress = await treasuryDAO.getAddress();
  console.log("TreasuryDAO deployed to:", treasuryDAOAddress);

  // Set TreasuryDAO address in GovernanceToken contract
  console.log("\n2.5. Setting TreasuryDAO address in GovernanceToken...");
  const setAddressTx = await governanceToken.setTreasuryDAOAddress(
    treasuryDAOAddress
  );
  await setAddressTx.wait();
  console.log("✅ TreasuryDAO address set in GovernanceToken");

  // Authorize TreasuryDAO as a minter so it can mint tokens when users deposit
  console.log(
    "\n2.6. Authorizing TreasuryDAO as a minter in GovernanceToken..."
  );
  const setMinterTx = await governanceToken.setMinter(treasuryDAOAddress, true);
  await setMinterTx.wait();
  console.log("✅ TreasuryDAO authorized as a minter");

  // Deploy BudgetManager
  console.log("\n2.7. Deploying BudgetManager...");
  const BudgetManager = await ethers.getContractFactory("BudgetManager");
  const budgetManager = await BudgetManager.deploy();

  await budgetManager.waitForDeployment();
  const budgetManagerAddress = await budgetManager.getAddress();
  console.log("BudgetManager deployed to:", budgetManagerAddress);

  // Set TreasuryDAO address in BudgetManager
  console.log("\n2.8. Linking BudgetManager with TreasuryDAO...");
  const setBudgetTreasuryTx = await budgetManager.setTreasuryDAO(
    treasuryDAOAddress
  );
  await setBudgetTreasuryTx.wait();
  console.log("✅ BudgetManager linked with TreasuryDAO");

  // Initial setup
  console.log("\n3. Setting up initial configuration...");

  // Mint some tokens to additional accounts for testing
  const accounts = await ethers.getSigners();
  if (accounts.length > 1) {
    for (let i = 1; i < Math.min(accounts.length, 4); i++) {
      const mintTx = await governanceToken.mint(
        accounts[i].address,
        ethers.parseEther("10000") // 10,000 tokens per account
      );
      await mintTx.wait();
      console.log(`Minted 10,000 GOV tokens to ${accounts[i].address}`);
    }
  }

  // Add initial funds to treasury
  console.log("\n4. Adding initial funds to treasury...");
  const initialFunds = ethers.parseEther("0.01"); // 0.01 ETH (adjusted for testnet)
  const depositTx = await treasuryDAO.depositFunds({ value: initialFunds });
  await depositTx.wait();
  console.log(`Deposited ${ethers.formatEther(initialFunds)} ETH to treasury`);

  // Save deployment addresses
  const deploymentInfo = {
    governanceToken: governanceTokenAddress,
    treasuryDAO: treasuryDAOAddress,
    budgetManager: budgetManagerAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
  };

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Deployment Summary:");
  console.log("====================");
  console.log(`GovernanceToken: ${governanceTokenAddress}`);
  console.log(`TreasuryDAO: ${treasuryDAOAddress}`);
  console.log(`BudgetManager: ${budgetManagerAddress}`);
  console.log(`Network: ${deploymentInfo.network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(
    `Treasury Balance: ${ethers.formatEther(
      await treasuryDAO.getTreasuryBalance()
    )} ETH`
  );
  console.log(
    `Total GOV Supply: ${ethers.formatEther(
      await governanceToken.totalSupply()
    )} GOV`
  );

  // Save to file for frontend
  const fs = require("fs");
  const path = require("path");

  // Save to both src and public folders
  const srcContractsDir = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "contracts"
  );
  const publicContractsDir = path.join(
    __dirname,
    "..",
    "frontend",
    "public",
    "contracts"
  );

  // Create directories if they don't exist
  if (!fs.existsSync(srcContractsDir)) {
    fs.mkdirSync(srcContractsDir, { recursive: true });
  }
  if (!fs.existsSync(publicContractsDir)) {
    fs.mkdirSync(publicContractsDir, { recursive: true });
  }

  // Write deployment addresses to both locations
  fs.writeFileSync(
    path.join(srcContractsDir, "deployments.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  fs.writeFileSync(
    path.join(publicContractsDir, "deployments.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy ABIs from artifacts
  const TreasuryDAO_Artifact = require("../artifacts/contracts/TreasuryDAO.sol/TreasuryDAO.json");
  const GovernanceToken_Artifact = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
  const BudgetManager_Artifact = require("../artifacts/contracts/BudgetManager.sol/BudgetManager.json");

  const abis = {
    TreasuryDAO: TreasuryDAO_Artifact.abi,
    GovernanceToken: GovernanceToken_Artifact.abi,
    BudgetManager: BudgetManager_Artifact.abi,
  };

  fs.writeFileSync(
    path.join(srcContractsDir, "abis.json"),
    JSON.stringify(abis, null, 2)
  );
  fs.writeFileSync(
    path.join(publicContractsDir, "abis.json"),
    JSON.stringify(abis, null, 2)
  );

  console.log("\n💾 Contract addresses and ABIs saved to:");
  console.log("   - frontend/src/contracts/deployments.json");
  console.log("   - frontend/public/contracts/deployments.json");
  console.log("   - frontend/src/contracts/abis.json");
  console.log("   - frontend/public/contracts/abis.json");
  console.log("\n🚀 You can now start the frontend with: npm run frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
