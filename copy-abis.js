const fs = require("fs");
const path = require("path");

console.log("Copying contract ABIs to frontend...\n");

// Source paths
const treasuryDAOArtifact = path.join(
  __dirname,
  "artifacts",
  "contracts",
  "TreasuryDAO.sol",
  "TreasuryDAO.json"
);
const governanceTokenArtifact = path.join(
  __dirname,
  "artifacts",
  "contracts",
  "GovernanceToken.sol",
  "GovernanceToken.json"
);

// Destination paths
const frontendContractsDir = path.join(
  __dirname,
  "frontend",
  "src",
  "contracts"
);
const frontendPublicContractsDir = path.join(
  __dirname,
  "frontend",
  "public",
  "contracts"
);

// Create directories if they don't exist
if (!fs.existsSync(frontendContractsDir)) {
  fs.mkdirSync(frontendContractsDir, { recursive: true });
}
if (!fs.existsSync(frontendPublicContractsDir)) {
  fs.mkdirSync(frontendPublicContractsDir, { recursive: true });
}

// Read artifacts
const treasuryDAOData = JSON.parse(
  fs.readFileSync(treasuryDAOArtifact, "utf8")
);
const governanceTokenData = JSON.parse(
  fs.readFileSync(governanceTokenArtifact, "utf8")
);

// Create ABI files
const abis = {
  TreasuryDAO: treasuryDAOData.abi,
  GovernanceToken: governanceTokenData.abi,
};

// Save to src/contracts
fs.writeFileSync(
  path.join(frontendContractsDir, "abis.json"),
  JSON.stringify(abis, null, 2)
);

// Save to public/contracts (for fetch)
fs.writeFileSync(
  path.join(frontendPublicContractsDir, "abis.json"),
  JSON.stringify(abis, null, 2)
);

console.log("✅ Copied TreasuryDAO ABI");
console.log("✅ Copied GovernanceToken ABI");
console.log("\n💾 Saved to:");
console.log("   - frontend/src/contracts/abis.json");
console.log("   - frontend/public/contracts/abis.json");
console.log("\n🎉 Done! ABIs are ready for frontend use.");
