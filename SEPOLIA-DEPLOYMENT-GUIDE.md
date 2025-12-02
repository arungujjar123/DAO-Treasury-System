# 🚀 Sepolia Testnet Deployment Guide

## ✅ What Has Been Configured

Your project now supports **Sepolia testnet** deployment! Here's what was added:

### 1. Environment Variables (`.env`)

- ✅ `PRIVATE_KEY` - Your wallet private key
- ✅ `INFURA_API_KEY` - Infura project API key
- ✅ `SEPOLIA_RPC_URL` - Sepolia RPC endpoint
- ✅ `ETHERSCAN_API_KEY` - For contract verification

### 2. Hardhat Configuration (`hardhat.config.js`)

- ✅ Sepolia network added (chainId: 11155111)
- ✅ Etherscan verification configured
- ✅ dotenv package integrated

### 3. Package Scripts (`package.json`)

- ✅ `npm run deploy:sepolia` - Deploy to Sepolia
- ✅ `npm run verify:sepolia` - Verify contracts on Etherscan

### 4. Frontend Support (`useWeb3.js`)

- ✅ Sepolia chainId detection
- ✅ Support for both localhost and Sepolia networks

### 5. Security (`.gitignore`)

- ✅ `.env` file excluded from Git
- ✅ Private keys will NOT be committed

---

## 📋 Prerequisites

Before deploying to Sepolia, make sure you have:

### 1. Sepolia Test ETH

Your deployer wallet needs Sepolia ETH for:

- Deploying GovernanceToken contract (~0.01 ETH)
- Deploying TreasuryDAO contract (~0.02 ETH)
- Minting tokens to test accounts (~0.005 ETH each)
- Initial treasury deposit (~10 ETH or adjust in deploy script)

**Get Sepolia ETH from faucets:**

- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia
- https://faucet.quicknode.com/ethereum/sepolia

### 2. Check Your Wallet Balance

```powershell
# Your wallet address (from private key):
# 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Check balance on Sepolia Etherscan:
# https://sepolia.etherscan.io/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

## 🚀 Deployment Steps

### Step 1: Compile Contracts

```powershell
npm run compile
```

Expected output: "Compiled X Solidity files successfully"

### Step 2: Test Locally First (Recommended)

```powershell
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy to localhost
npm run deploy:localhost

# Terminal 3: Test frontend
npm run frontend
```

### Step 3: Deploy to Sepolia

```powershell
npm run deploy:sepolia
```

**What happens:**

1. Connects to Sepolia via Infura RPC
2. Deploys GovernanceToken contract
3. Deploys TreasuryDAO contract
4. Authorizes TreasuryDAO as minter
5. Mints tokens to test accounts
6. Deposits initial ETH to treasury
7. Saves contract addresses to `deployments.json`
8. Copies ABIs to frontend

**Expected deployment time:** 2-5 minutes (depends on network congestion)

### Step 4: Verify Contracts (Optional but Recommended)

After deployment, verify your contracts on Etherscan:

```powershell
# Verify GovernanceToken
npx hardhat verify --network sepolia <GOVERNANCE_TOKEN_ADDRESS> "DAO Governance Token" "GOV" 1000000 <DEPLOYER_ADDRESS>

# Verify TreasuryDAO
npx hardhat verify --network sepolia <TREASURY_DAO_ADDRESS> <GOVERNANCE_TOKEN_ADDRESS>
```

Replace:

- `<GOVERNANCE_TOKEN_ADDRESS>` - From deployment output
- `<TREASURY_DAO_ADDRESS>` - From deployment output
- `<DEPLOYER_ADDRESS>` - Your wallet address (0xf39Fd...)

---

## 🔧 Configure MetaMask for Sepolia

### Add Sepolia Network to MetaMask

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Select "Sepolia Test Network"
5. Or add manually:
   - **Network Name:** Sepolia Test Network
   - **RPC URL:** `https://sepolia.infura.io/v3/f6a44e05fce84babb0f93092a8cf3761`
   - **Chain ID:** `11155111`
   - **Currency Symbol:** SepoliaETH
   - **Block Explorer:** `https://sepolia.etherscan.io`

### Import Your Deployer Account

1. Click account icon in MetaMask
2. Select "Import Account"
3. Paste private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. Account imported! (Address: 0xf39Fd...)

---

## 🌐 Using Frontend with Sepolia

### Step 1: Start Frontend

```powershell
npm run frontend
```

### Step 2: Connect MetaMask

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. **Make sure MetaMask is on Sepolia network!**
4. Approve connection

### Step 3: Interact with Contracts

- **Dashboard:** View treasury balance, your GOV tokens
- **Deposit:** Send ETH to treasury (get GOV tokens)
- **Proposals:** Create spending proposals
- **Voting:** Vote on active proposals
- **Analytics:** View DAO metrics

---

## 📊 Monitoring Your Deployment

### Etherscan

View your contracts on Sepolia Etherscan:

```
GovernanceToken: https://sepolia.etherscan.io/address/<TOKEN_ADDRESS>
TreasuryDAO: https://sepolia.etherscan.io/address/<DAO_ADDRESS>
```

### Check Contract State

After deployment, check:

- Total GOV supply (should be 1,000,000)
- Treasury balance (should be 10 ETH)
- Your GOV balance
- Test accounts' GOV balances

---

## 🐛 Troubleshooting

### Error: "insufficient funds for gas"

**Solution:** Get more Sepolia ETH from faucets

- Your wallet needs ~0.05 ETH minimum for deployment

### Error: "network does not support ENS"

**Solution:** This is normal for Sepolia, deployment will continue

### Error: "Transaction underpriced"

**Solution:** Wait a few minutes and try again (network congestion)

### Error: "Nonce too low"

**Solution:**

```powershell
# Reset MetaMask nonce:
# Settings → Advanced → Clear Activity Tab Data
```

### Frontend not connecting to Sepolia

**Solution:**

1. Check MetaMask is on Sepolia network
2. Check contract addresses in `deployments.json`
3. Refresh frontend page
4. Clear browser cache

### Contracts deployed but frontend shows 0 balance

**Solution:**

1. Check `frontend/public/contracts/deployments.json` has Sepolia addresses
2. Redeploy if addresses are missing:
   ```powershell
   npm run deploy:sepolia
   ```

---

## 💰 Cost Estimate

Typical Sepolia deployment costs (test ETH):

- GovernanceToken deployment: ~0.01 ETH
- TreasuryDAO deployment: ~0.02 ETH
- Minting tokens (3 accounts): ~0.015 ETH
- Initial treasury deposit: 10 ETH (adjust in script)
- **Total needed:** ~10.05 ETH

---

## 📝 Important Notes

### Security Reminders

- ⚠️ Never use your main wallet for testing
- ⚠️ The private key in `.env` is a Hardhat test key (publicly known)
- ⚠️ For production, use a hardware wallet or secure key management
- ⚠️ Never commit `.env` file to Git (already in `.gitignore`)

### Network Differences

| Feature               | Localhost       | Sepolia             |
| --------------------- | --------------- | ------------------- |
| **Deployment Time**   | Instant         | 2-5 minutes         |
| **Transaction Time**  | Instant         | 10-30 seconds       |
| **ETH Cost**          | Free            | Need test ETH       |
| **Persistence**       | Lost on restart | Permanent           |
| **Public Access**     | No              | Yes (via Etherscan) |
| **MetaMask Required** | Yes             | Yes                 |

### When to Use Each Network

- **Localhost:** Development, testing, debugging
- **Sepolia:** Final testing before mainnet, demos, evaluation
- **Mainnet:** Production (NOT covered in this guide)

---

## 🎯 Quick Commands Reference

```powershell
# Compile contracts
npm run compile

# Deploy to localhost
npm run deploy:localhost

# Deploy to Sepolia
npm run deploy:sepolia

# Start frontend
npm run frontend

# Run tests
npm test

# Verify contract on Etherscan
npx hardhat verify --network sepolia <ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## ✅ Deployment Checklist

Before deploying to Sepolia:

- [ ] `.env` file created with all keys
- [ ] `dotenv` package installed (`npm install dotenv`)
- [ ] Contracts compiled successfully
- [ ] Wallet has sufficient Sepolia ETH (>0.05 ETH)
- [ ] MetaMask configured for Sepolia network
- [ ] Tested deployment on localhost first

After deploying to Sepolia:

- [ ] Contract addresses saved in `deployments.json`
- [ ] Contracts verified on Etherscan (optional)
- [ ] Frontend connects to Sepolia successfully
- [ ] Can deposit ETH and receive GOV tokens
- [ ] Can create proposals and vote
- [ ] Documented contract addresses

---

## 🎉 Success!

If deployment succeeded, you should see:

```
🎉 Deployment completed successfully!
📋 Deployment Summary:
====================
GovernanceToken: 0x...
TreasuryDAO: 0x...
Network: sepolia
Deployer: 0xf39Fd...
Treasury Balance: 10.0 ETH
Total GOV Supply: 1040000.0 GOV

💾 Contract addresses and ABIs saved to:
   - frontend/src/contracts/deployments.json
   - frontend/public/contracts/deployments.json
```

**View on Etherscan:**

- GovernanceToken: https://sepolia.etherscan.io/address/<YOUR_TOKEN_ADDRESS>
- TreasuryDAO: https://sepolia.etherscan.io/address/<YOUR_DAO_ADDRESS>

**Next steps:**

1. Verify contracts on Etherscan
2. Share contract addresses with team
3. Test all features on frontend
4. Document any issues or improvements

---

## 📞 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review Hardhat console output for error messages
3. Check Sepolia Etherscan for transaction status
4. Verify `.env` file has correct values
5. Try deploying to localhost first to isolate issues

Good luck with your Sepolia deployment! 🚀
