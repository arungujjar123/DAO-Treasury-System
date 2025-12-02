import { ethers } from "ethers";

// Contract ABIs (loaded from compiled artifacts)
let GOVERNANCE_TOKEN_ABI = [];
let TREASURY_DAO_ABI = [];

// Load ABIs from compiled artifacts
export const loadContractABIs = async () => {
  try {
    const response = await fetch("/contracts/abis.json");
    if (response.ok) {
      const abis = await response.json();
      GOVERNANCE_TOKEN_ABI = abis.GovernanceToken;
      TREASURY_DAO_ABI = abis.TreasuryDAO;
      console.log("✅ Contract ABIs loaded successfully");
      console.log(
        `   - GovernanceToken ABI: ${GOVERNANCE_TOKEN_ABI.length} methods`
      );
      console.log(`   - TreasuryDAO ABI: ${TREASURY_DAO_ABI.length} methods`);
      return true;
    } else {
      console.error("❌ Failed to load ABIs. Status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Error loading contract ABIs:", error);
    return false;
  }
};

// Export ABIs (will be populated after loadContractABIs is called)
export const getGovernanceTokenABI = () => GOVERNANCE_TOKEN_ABI;
export const getTreasuryDAOABI = () => TREASURY_DAO_ABI;

// Contract addresses (will be loaded from deployments.json)
let contractAddresses = {
  governanceToken: null,
  treasuryDAO: null,
};

// Load contract addresses
export const loadContractAddresses = async () => {
  try {
    const response = await fetch("/contracts/deployments.json");
    if (response.ok) {
      const deployments = await response.json();
      contractAddresses = {
        governanceToken: deployments.governanceToken,
        treasuryDAO: deployments.treasuryDAO,
      };
      console.log(
        "✅ Contract addresses loaded successfully:",
        contractAddresses
      );
    } else {
      console.error(
        "❌ Failed to load deployments.json. Status:",
        response.status
      );
      console.error(
        "Make sure you have deployed the contracts with: npm run deploy"
      );
    }
  } catch (error) {
    console.error("❌ Error loading contract addresses:", error);
    console.error("Please ensure:");
    console.error("1. Contracts are deployed: npm run deploy");
    console.error("2. Hardhat node is running: npm run node");
    console.error("3. deployments.json exists in frontend/public/contracts/");
  }
  return contractAddresses;
};

// Contract helper class
export class ContractHelper {
  constructor(provider, signer = null) {
    this.provider = provider;
    this.signer = signer;
    this.governanceToken = null;
    this.treasuryDAO = null;
  }

  async init() {
    console.log("🔧 Initializing contracts...");

    // Load ABIs first
    const abisLoaded = await loadContractABIs();
    if (!abisLoaded) {
      throw new Error("Failed to load contract ABIs");
    }

    // Then load addresses
    await loadContractAddresses();

    if (!contractAddresses.governanceToken || !contractAddresses.treasuryDAO) {
      throw new Error(
        "Contract addresses not loaded. Please deploy contracts first."
      );
    }

    console.log("📍 Using contract addresses:");
    console.log(`   - GovernanceToken: ${contractAddresses.governanceToken}`);
    console.log(`   - TreasuryDAO: ${contractAddresses.treasuryDAO}`);

    // Initialize contract instances with loaded ABIs
    this.governanceToken = new ethers.Contract(
      contractAddresses.governanceToken,
      GOVERNANCE_TOKEN_ABI,
      this.signer || this.provider
    );

    this.treasuryDAO = new ethers.Contract(
      contractAddresses.treasuryDAO,
      TREASURY_DAO_ABI,
      this.signer || this.provider
    );

    console.log("✅ Contracts initialized successfully");
  }

  // Governance Token methods
  async getTokenBalance(address) {
    if (!this.governanceToken)
      throw new Error("Governance token contract not initialized");

    // Validate address to avoid ENS resolution
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address format");
    }

    const balance = await this.governanceToken.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async getVotingPower(address) {
    if (!this.governanceToken)
      throw new Error("Governance token contract not initialized");

    // Validate address to avoid ENS resolution
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address format");
    }

    const power = await this.governanceToken.getVotingPower(address);
    return ethers.formatEther(power);
  }

  async getTotalSupply() {
    if (!this.governanceToken)
      throw new Error("Governance token contract not initialized");
    const supply = await this.governanceToken.totalSupply();
    return ethers.formatEther(supply);
  }

  // Treasury DAO methods
  async getTreasuryBalance() {
    if (!this.treasuryDAO) {
      console.error("❌ Treasury DAO contract not initialized");
      console.error("Contract address:", contractAddresses.treasuryDAO);
      throw new Error(
        "Treasury DAO contract not initialized. Please deploy contracts first."
      );
    }
    try {
      const balance = await this.treasuryDAO.getTreasuryBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.warn("⚠️ Error getting treasury balance:", error.message);
      // Return 0 instead of throwing to allow app to continue
      return "0";
    }
  }

  async getProposalCount() {
    if (!this.treasuryDAO) {
      console.error("❌ Treasury DAO contract not initialized");
      throw new Error(
        "Treasury DAO contract not initialized. Please deploy contracts first."
      );
    }
    try {
      const count = await this.treasuryDAO.proposalCount();
      return count.toString();
    } catch (error) {
      console.warn("⚠️ Error getting proposal count:", error.message);
      // Return 0 if there's an error to allow app to continue
      return "0";
    }
  }

  async getProposal(proposalId) {
    if (!this.treasuryDAO) {
      console.error("❌ Treasury DAO contract not initialized");
      throw new Error(
        "Treasury DAO contract not initialized. Please deploy contracts first."
      );
    }
    const proposal = await this.treasuryDAO.getProposal(proposalId);

    return {
      id: proposal[0].toString(),
      proposer: proposal[1],
      recipient: proposal[2],
      amount: ethers.formatEther(proposal[3]),
      description: proposal[4],
      forVotes: ethers.formatEther(proposal[5]),
      againstVotes: ethers.formatEther(proposal[6]),
      deadline: new Date(Number(proposal[7]) * 1000),
      executed: proposal[8],
    };
  }

  async getAllProposals() {
    const count = await this.getProposalCount();
    const proposalsData = [];

    console.log(`📊 Fetching ${count} proposals from contract...`);

    for (let i = 1; i <= parseInt(count); i++) {
      try {
        const proposal = await this.getProposal(i);
        proposalsData.push(proposal);
      } catch (error) {
        console.warn(`⚠️ Error fetching proposal ${i}:`, error.message);
        // Continue fetching other proposals if one fails
      }
    }

    return proposalsData;
  }

  async hasVoted(proposalId, address) {
    if (!this.treasuryDAO)
      throw new Error("Treasury DAO contract not initialized");

    // Validate address to avoid ENS resolution
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address format");
    }

    return await this.treasuryDAO.hasVoted(proposalId, address);
  }

  async getVoteChoice(proposalId, address) {
    if (!this.treasuryDAO)
      throw new Error("Treasury DAO contract not initialized");

    // Validate address to avoid ENS resolution
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address format");
    }

    return await this.treasuryDAO.getVoteChoice(proposalId, address);
  }

  async hasProposalPassed(proposalId) {
    if (!this.treasuryDAO)
      throw new Error("Treasury DAO contract not initialized");
    return await this.treasuryDAO.hasProposalPassed(proposalId);
  }

  // Transaction methods (require signer)
  async depositFunds(amount) {
    if (!this.treasuryDAO || !this.signer)
      throw new Error("Treasury DAO contract not initialized or no signer");
    const tx = await this.treasuryDAO.depositFunds({
      value: ethers.parseEther(amount.toString()),
    });
    return tx;
  }

  async createProposal(recipient, amount, description) {
    console.log("🚀 [DEBUG] createProposal called with:");
    console.log("   - recipient:", recipient);
    console.log("   - amount:", amount);
    console.log("   - description:", description);

    if (!this.treasuryDAO || !this.signer) {
      console.error(
        "❌ [DEBUG] Treasury DAO contract not initialized or no signer"
      );
      console.log("   - treasuryDAO exists:", !!this.treasuryDAO);
      console.log("   - signer exists:", !!this.signer);
      throw new Error("Treasury DAO contract not initialized or no signer");
    }

    console.log("✅ [DEBUG] Contracts and signer are available");

    // Validate and normalize address (avoid ENS resolution on Hardhat)
    console.log("🔍 [DEBUG] Validating recipient address...");
    if (!ethers.isAddress(recipient)) {
      console.error("❌ [DEBUG] Invalid recipient address format:", recipient);
      throw new Error("Invalid recipient address format");
    }
    const normalizedRecipient = ethers.getAddress(recipient); // Checksum address
    console.log(
      "✅ [DEBUG] Address validated and normalized:",
      normalizedRecipient
    );

    // Check signer address
    const signerAddress = await this.signer.getAddress();
    console.log("👤 [DEBUG] Signer address:", signerAddress);

    // Check network
    const network = await this.provider.getNetwork();
    console.log("🌐 [DEBUG] Current network:", {
      name: network.name,
      chainId: network.chainId,
      ensAddress: network.ensAddress,
    });

    // Estimate gas before sending
    console.log("⛽ [DEBUG] Estimating gas...");
    try {
      const gasEstimate = await this.treasuryDAO.createProposal.estimateGas(
        normalizedRecipient,
        ethers.parseEther(amount.toString()),
        description
      );
      console.log(
        "✅ [DEBUG] Gas estimate successful:",
        gasEstimate.toString()
      );
    } catch (gasError) {
      console.error("❌ [DEBUG] Gas estimation failed:", gasError);
      console.log("   - This might indicate the transaction will fail");
    }

    // Get current gas price
    console.log("💰 [DEBUG] Getting gas price...");
    try {
      const gasPrice = await this.provider.getFeeData();
      console.log("✅ [DEBUG] Gas price data:", {
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString(),
      });
    } catch (gasPriceError) {
      console.error("❌ [DEBUG] Failed to get gas price:", gasPriceError);
    }

    console.log("📤 [DEBUG] Sending transaction...");
    try {
      const tx = await this.treasuryDAO.createProposal(
        normalizedRecipient,
        ethers.parseEther(amount.toString()),
        description
      );

      console.log("✅ [DEBUG] Transaction sent successfully!");
      console.log("   - Transaction hash:", tx.hash);
      console.log("   - Transaction details:", {
        to: tx.to,
        from: tx.from,
        data: tx.data?.slice(0, 66) + "...", // First 32 bytes
        value: tx.value?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        nonce: tx.nonce,
      });

      // Wait for transaction to be mined
      console.log("⏳ [DEBUG] Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("✅ [DEBUG] Transaction confirmed!");
      console.log("   - Block number:", receipt.blockNumber);
      console.log("   - Gas used:", receipt.gasUsed?.toString());
      console.log("   - Status:", receipt.status ? "Success" : "Failed");

      if (!receipt.status) {
        console.error("❌ [DEBUG] Transaction failed on-chain");
        console.log("   - Receipt logs:", receipt.logs);
      }

      return tx;
    } catch (txError) {
      console.error("❌ [DEBUG] Transaction failed:", txError);
      console.log("   - Error code:", txError.code);
      console.log("   - Error message:", txError.message);
      console.log("   - Error data:", txError.data);

      // Check if it's a user rejection
      if (txError.code === 4001) {
        console.log("👤 [DEBUG] User rejected the transaction");
      } else if (txError.code === -32000) {
        console.log("💰 [DEBUG] Insufficient funds for gas");
      } else {
        console.log(
          "🔍 [DEBUG] Other transaction error - check contract logic"
        );
      }

      throw txError;
    }
  }

  async vote(proposalId, support) {
    if (!this.treasuryDAO || !this.signer)
      throw new Error("Treasury DAO contract not initialized or no signer");
    const tx = await this.treasuryDAO.vote(proposalId, support);
    return tx;
  }

  async executeProposal(proposalId) {
    if (!this.treasuryDAO || !this.signer)
      throw new Error("Treasury DAO contract not initialized or no signer");
    const tx = await this.treasuryDAO.executeProposal(proposalId);
    return tx;
  }
}

// Utility functions
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatNumber = (number, decimals = 2) => {
  return parseFloat(number).toFixed(decimals);
};

export const calculateTimeRemaining = (deadline) => {
  const now = new Date();
  const timeLeft = deadline.getTime() - now.getTime();

  if (timeLeft <= 0) {
    return "Voting ended";
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};
