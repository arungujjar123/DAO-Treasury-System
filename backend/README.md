# DAO Treasury Backend API

REST API for serving smart contract data to the frontend.

## 📋 Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
copy .env.example .env
notepad .env
```

Fill in your values:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Copy Contract Files
Contract files should already be copied. If not:
```bash
copy ..\frontend\public\contracts\deployments.json contracts\
copy ..\frontend\public\contracts\abis.json contracts\
```

### 4. Run Locally
```bash
npm start
```

Visit: http://localhost:3001/api/health

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

### Get All Contract Addresses
```
GET /api/contracts/addresses
Response: { governanceToken, treasuryDAO, budgetManager, deployer, network, timestamp }
```

### Get All Contract ABIs
```
GET /api/contracts/abis
Response: { TreasuryDAO: [...], GovernanceToken: [...], BudgetManager: [...] }
```

### Get Specific Contract
```
GET /api/contracts/GovernanceToken
GET /api/contracts/TreasuryDAO
GET /api/contracts/BudgetManager
Response: { name, address, abi }
```

### Get Network Info
```
GET /api/network/info
Response: { network, deployer, deployedAt, rpcUrl }
```

### Get Deployment Summary
```
GET /api/deployment/summary
Response: { network, contracts, explorerLinks }
```

## 🚀 Deploy to Vercel

### Via CLI:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Via Dashboard:
1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `SEPOLIA_RPC_URL`
   - `FRONTEND_URL`
4. Deploy

## 🔧 Environment Variables in Vercel

Go to Settings → Environment Variables:
- `SEPOLIA_RPC_URL`: Your Infura/Alchemy RPC URL
- `FRONTEND_URL`: Your frontend URL (e.g., https://dao-treasury.vercel.app)
- `PORT`: 3001 (auto-set by Vercel)
- `NODE_ENV`: production (auto-set by Vercel)

## 🧪 Testing

Test all endpoints:
```bash
# Health check
curl http://localhost:3001/api/health

# Get addresses
curl http://localhost:3001/api/contracts/addresses

# Get ABIs
curl http://localhost:3001/api/contracts/abis

# Get specific contract
curl http://localhost:3001/api/contracts/GovernanceToken
```

## 📁 Project Structure

```
backend/
├── server.js              # Express API server
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment config
├── .env                  # Environment variables (DO NOT COMMIT)
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── contracts/            # Contract data
    ├── deployments.json  # Contract addresses
    └── abis.json         # Contract ABIs
```

## ⚠️ Important Notes

1. **Never commit `.env`** - Contains sensitive keys
2. **Contract files must exist** - Copy from frontend/public/contracts/
3. **CORS configured** - Allow your frontend URL
4. **Read-only API** - No write operations, contracts called from frontend

## 🐛 Troubleshooting

### "Contract data not found"
→ Copy deployments.json and abis.json to backend/contracts/

### "CORS error" 
→ Update FRONTEND_URL in .env

### "Module not found"
→ Run: npm install

### Port already in use
→ Change PORT in .env or kill process on 3001

## 📚 Resources

- [Express.js Docs](https://expressjs.com/)
- [Vercel Node.js](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)
