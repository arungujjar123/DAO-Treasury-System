const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Load contract data
let contractData = {};
try {
  const deploymentsPath = path.join(__dirname, 'contracts', 'deployments.json');
  const abisPath = path.join(__dirname, 'contracts', 'abis.json');
  
  if (fs.existsSync(deploymentsPath)) {
    contractData.deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  }
  if (fs.existsSync(abisPath)) {
    contractData.abis = JSON.parse(fs.readFileSync(abisPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading contract data:', error.message);
}

// ========================================
// API ROUTES
// ========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'DAO Treasury Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get all contract addresses
app.get('/api/contracts/addresses', (req, res) => {
  try {
    if (!contractData.deployments) {
      return res.status(404).json({ 
        error: 'Contract deployments not found',
        message: 'Please ensure deployments.json exists in backend/contracts/'
      });
    }
    res.json(contractData.deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all contract ABIs
app.get('/api/contracts/abis', (req, res) => {
  try {
    if (!contractData.abis) {
      return res.status(404).json({ 
        error: 'Contract ABIs not found',
        message: 'Please ensure abis.json exists in backend/contracts/'
      });
    }
    res.json(contractData.abis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific contract info
app.get('/api/contracts/:contractName', (req, res) => {
  try {
    const { contractName } = req.params;
    
    if (!contractData.deployments || !contractData.abis) {
      return res.status(404).json({ error: 'Contract data not found' });
    }

    const address = contractData.deployments[contractName];
    const abi = contractData.abis[contractName];

    if (!address || !abi) {
      return res.status(404).json({ 
        error: `Contract ${contractName} not found`,
        availableContracts: Object.keys(contractData.deployments)
      });
    }

    res.json({
      name: contractName,
      address,
      abi
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get network info
app.get('/api/network/info', (req, res) => {
  try {
    const network = contractData.deployments?.network || 'unknown';
    const deployer = contractData.deployments?.deployer || 'unknown';
    const timestamp = contractData.deployments?.timestamp || 'unknown';

    res.json({
      network,
      deployer,
      deployedAt: timestamp,
      rpcUrl: process.env.SEPOLIA_RPC_URL ? 'configured' : 'not configured'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployment summary
app.get('/api/deployment/summary', (req, res) => {
  try {
    if (!contractData.deployments) {
      return res.status(404).json({ error: 'No deployment data available' });
    }

    const summary = {
      network: contractData.deployments.network,
      deployer: contractData.deployments.deployer,
      timestamp: contractData.deployments.timestamp,
      contracts: {
        governanceToken: contractData.deployments.governanceToken,
        treasuryDAO: contractData.deployments.treasuryDAO,
        budgetManager: contractData.deployments.budgetManager
      },
      explorerLinks: {
        governanceToken: `https://${contractData.deployments.network}.etherscan.io/address/${contractData.deployments.governanceToken}`,
        treasuryDAO: `https://${contractData.deployments.network}.etherscan.io/address/${contractData.deployments.treasuryDAO}`,
        budgetManager: `https://${contractData.deployments.network}.etherscan.io/address/${contractData.deployments.budgetManager}`
      }
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/contracts/addresses',
      'GET /api/contracts/abis',
      'GET /api/contracts/:contractName',
      'GET /api/network/info',
      'GET /api/deployment/summary'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 DAO Treasury Backend API');
  console.log('========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Contract addresses: http://localhost:${PORT}/api/contracts/addresses`);
  console.log(`📋 Network: ${contractData.deployments?.network || 'unknown'}`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

// Export for Vercel serverless
module.exports = app;
