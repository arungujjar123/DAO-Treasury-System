#!/usr/bin/env node

/**
 * DAO Treasury System Health Check Script
 * Run this to verify everything is working properly
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║     DAO Treasury Management System - Health Check        ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

// Helper functions
function success(message) {
  results.passed.push(message);
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function fail(message, error) {
  results.failed.push(message);
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  if (error) console.log(`  ${colors.red}Error: ${error}${colors.reset}`);
}

function warning(message) {
  results.warnings.push(message);
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function section(title) {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}\n`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    success(`${description} exists`);
    return true;
  } else {
    fail(`${description} not found`, `Missing: ${filePath}`);
    return false;
  }
}

function runCommand(command, description, silent = true) {
  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: silent ? "pipe" : "inherit",
    });
    success(description);
    return { success: true, output };
  } catch (error) {
    fail(description, error.message);
    return { success: false, error };
  }
}

function checkPort(port, description) {
  return new Promise((resolve) => {
    const request = http.get(`http://localhost:${port}`, (res) => {
      success(`${description} - Port ${port} is accessible`);
      resolve(true);
    });

    request.on("error", () => {
      fail(
        `${description} - Port ${port} not accessible`,
        `Make sure the service is running on port ${port}`
      );
      resolve(false);
    });

    request.setTimeout(1000, () => {
      request.destroy();
      fail(
        `${description} - Port ${port} timeout`,
        `No response from port ${port}`
      );
      resolve(false);
    });
  });
}

// Test 1: Check Project Structure
section("1. Project Structure");

const criticalFiles = [
  ["package.json", "Root package.json"],
  ["hardhat.config.js", "Hardhat configuration"],
  ["contracts/GovernanceToken.sol", "GovernanceToken contract"],
  ["contracts/TreasuryDAO.sol", "TreasuryDAO contract"],
  ["scripts/deploy.js", "Deployment script"],
  ["test/GovernanceToken.test.js", "GovernanceToken tests"],
  ["test/TreasuryDAO.test.js", "TreasuryDAO tests"],
  ["frontend/package.json", "Frontend package.json"],
  ["frontend/src/App.js", "Frontend App component"],
  ["frontend/src/hooks/useWeb3.js", "Web3 hook"],
  ["frontend/public/index.html", "Frontend HTML"],
];

criticalFiles.forEach(([file, desc]) => {
  checkFileExists(path.join(process.cwd(), file), desc);
});

// Test 2: Check Dependencies
section("2. Backend Dependencies");

try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps["hardhat"]) {
    success("Hardhat installed");
  } else {
    fail("Hardhat not found in dependencies");
  }

  if (deps["@openzeppelin/contracts"]) {
    success("OpenZeppelin contracts installed");
  } else {
    fail("OpenZeppelin contracts not found");
  }

  if (fs.existsSync("node_modules")) {
    success("Backend node_modules exists");
  } else {
    fail("Backend dependencies not installed", "Run: npm install");
  }
} catch (error) {
  fail("Error reading package.json", error.message);
}

section("3. Frontend Dependencies");

try {
  const frontendPackage = JSON.parse(
    fs.readFileSync("frontend/package.json", "utf8")
  );
  const frontendDeps = frontendPackage.dependencies;

  if (frontendDeps["react"]) {
    success("React installed");
  } else {
    fail("React not found");
  }

  if (frontendDeps["ethers"]) {
    success("ethers.js installed");
  } else {
    fail("ethers.js not found");
  }

  if (fs.existsSync("frontend/node_modules")) {
    success("Frontend node_modules exists");
  } else {
    warning(
      "Frontend dependencies not installed - Run: cd frontend && npm install"
    );
  }
} catch (error) {
  fail("Error reading frontend package.json", error.message);
}

// Test 4: Check Compilation
section("4. Smart Contract Compilation");

if (fs.existsSync("artifacts")) {
  success("Artifacts directory exists");

  if (
    fs.existsSync(
      "artifacts/contracts/GovernanceToken.sol/GovernanceToken.json"
    )
  ) {
    success("GovernanceToken compiled");
  } else {
    warning("GovernanceToken not compiled - Run: npx hardhat compile");
  }

  if (fs.existsSync("artifacts/contracts/TreasuryDAO.sol/TreasuryDAO.json")) {
    success("TreasuryDAO compiled");
  } else {
    warning("TreasuryDAO not compiled - Run: npx hardhat compile");
  }
} else {
  warning("Contracts not compiled yet - Run: npx hardhat compile");
}

// Test 5: Check Network Status
section("5. Network & Services Status");

(async () => {
  // Check if Hardhat node is running
  const hardhatRunning = await checkPort(8545, "Hardhat Local Node");

  // Check if frontend is running
  const frontendRunning = await checkPort(3000, "React Frontend");

  // Test 6: Check Deployment
  section("6. Contract Deployment");

  if (fs.existsSync("frontend/src/contracts/deployments.json")) {
    try {
      const deployments = JSON.parse(
        fs.readFileSync("frontend/src/contracts/deployments.json", "utf8")
      );

      if (deployments.governanceToken && deployments.treasuryDAO) {
        success("Contracts deployed");
        console.log(`  GovernanceToken: ${deployments.governanceToken}`);
        console.log(`  TreasuryDAO: ${deployments.treasuryDAO}`);
      } else {
        fail("Deployment addresses missing");
      }
    } catch (error) {
      fail("Error reading deployment file", error.message);
    }
  } else {
    warning("Contracts not deployed - Run: npm run deploy:localhost");
  }

  // Test 7: Run Quick Tests
  section("7. Contract Tests");

  console.log("Running smart contract tests (this may take a moment)...\n");
  const testResult = runCommand(
    "npx hardhat test --bail",
    "Smart contract tests executed",
    false
  );

  if (testResult.success) {
    success("All contract tests completed");
  } else {
    warning("Some tests failed - Check output above for details");
  }

  // Final Summary
  section("Summary");

  console.log(
    `${colors.green}✓ Passed: ${results.passed.length}${colors.reset}`
  );
  console.log(`${colors.red}✗ Failed: ${results.failed.length}${colors.reset}`);
  console.log(
    `${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}`
  );

  // Status determination
  let status = "EXCELLENT";
  let statusColor = colors.green;

  if (results.failed.length > 5) {
    status = "NEEDS ATTENTION";
    statusColor = colors.red;
  } else if (results.failed.length > 2 || results.warnings.length > 3) {
    status = "MOSTLY WORKING";
    statusColor = colors.yellow;
  } else if (results.failed.length === 0 && results.warnings.length === 0) {
    status = "PERFECT";
    statusColor = colors.green;
  }

  console.log(`\n${statusColor}Overall Status: ${status}${colors.reset}\n`);

  // Recommendations
  if (results.failed.length > 0 || results.warnings.length > 0) {
    console.log(`${colors.cyan}Recommendations:${colors.reset}\n`);

    if (!hardhatRunning) {
      console.log(
        `• Start Hardhat node: ${colors.yellow}npm run node${colors.reset}`
      );
    }

    if (!fs.existsSync("frontend/node_modules")) {
      console.log(
        `• Install frontend dependencies: ${colors.yellow}cd frontend && npm install${colors.reset}`
      );
    }

    if (!fs.existsSync("frontend/src/contracts/deployments.json")) {
      console.log(
        `• Deploy contracts: ${colors.yellow}npm run deploy:localhost${colors.reset}`
      );
    }

    if (!frontendRunning) {
      console.log(
        `• Start frontend: ${colors.yellow}cd frontend && npm start${colors.reset}`
      );
    }

    console.log(
      `• Install MetaMask: ${colors.yellow}https://metamask.io/download/${colors.reset}`
    );
  }

  console.log(
    `\n${colors.cyan}For detailed setup instructions, see: README.md${colors.reset}\n`
  );

  // Exit code
  process.exit(results.failed.length > 0 ? 1 : 0);
})();
