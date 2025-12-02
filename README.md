# DAO Treasury Management System

A complete decentralized autonomous organization (DAO) treasury management system built with Solidity smart contracts and React.js frontend. This system enables transparent, community-driven financial governance through on-chain voting and automated fund allocation.

## 🎯 Project Overview

The DAO Treasury Management System allows community members to:

- 💰 Contribute funds to a shared treasury
- 📝 Create funding proposals for community initiatives
- 🗳️ Vote on proposals using governance tokens
- ⚡ Automatically execute approved proposals
- 📊 Track treasury performance and governance activity

## 🏗️ Architecture

### Smart Contracts

- **GovernanceToken.sol**: ERC20 token for voting rights and governance participation
- **TreasuryDAO.sol**: Main DAO contract managing treasury funds and proposal lifecycle

### Frontend

- **React.js**: Modern web interface for DAO interaction
- **ethers.js**: Web3 integration for blockchain connectivity
- **Tailwind CSS**: Responsive and accessible UI design

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+ recommended)
- Git
- MetaMask browser extension

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd DAO-Treasury-Project
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Start local blockchain**

   ```bash
   npm run node
   ```

   Keep this terminal running. The local blockchain will be available at `http://127.0.0.1:8545`.

4. **Deploy contracts** (in a new terminal)

   ```bash
   npm run deploy:localhost
   ```

5. **Start frontend**

   ```bash
   npm run frontend
   ```

6. **Configure MetaMask**
   - Add local network: RPC URL `http://127.0.0.1:8545`, Chain ID `31337`
   - Import test accounts using private keys from the Hardhat node output

## 📱 Usage Guide

### Dashboard

- View treasury balance and governance statistics
- Monitor your token balance and voting power
- Deposit funds to support the treasury

### Proposals

- Create new funding proposals with recipient, amount, and description
- Browse all proposals with status and voting results
- Track proposal lifecycle from creation to execution

### Voting

- Vote on active proposals using your governance tokens
- View voting progress and time remaining
- Execute approved proposals after voting period ends

### Analytics

- Monitor treasury health and performance metrics
- Track proposal success rates and participation
- View monthly trends and activity summaries

## 🛠️ Development

### Project Structure

```
DAO-Treasury-Project/
├── contracts/                 # Solidity smart contracts
│   ├── GovernanceToken.sol   # ERC20 governance token
│   └── TreasuryDAO.sol       # Main DAO treasury contract
├── frontend/                 # React.js web application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Helper utilities
│   └── public/              # Static assets
├── scripts/                 # Deployment scripts
├── test/                    # Smart contract tests
└── package.json            # Project configuration
```

### Available Scripts

**Backend (Smart Contracts)**

- `npm run compile` - Compile smart contracts
- `npm run test` - Run contract tests
- `npm run node` - Start local Hardhat network
- `npm run deploy` - Deploy to configured network

**Frontend**

- `npm run frontend` - Start React development server
- `cd frontend && npm test` - Run frontend tests
- `cd frontend && npm run build` - Build for production

**Combined**

- `npm run install-all` - Install all dependencies

### Testing

**Smart Contract Tests**

```bash
npm test
```

**Frontend Tests**

```bash
cd frontend && npm test
```

## 🔧 Configuration

### Network Configuration

Edit `hardhat.config.js` to add new networks:

```javascript
networks: {
  goerli: {
    url: "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
    accounts: ["YOUR_PRIVATE_KEY"]
  }
}
```

### Contract Parameters

Key parameters in `TreasuryDAO.sol`:

- `VOTING_PERIOD`: 3 days (time for voting on proposals)
- `QUORUM_PERCENTAGE`: 10% (minimum participation required)
- `MAJORITY_PERCENTAGE`: 51% (votes needed to pass)

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Token-based voting rights
- **Input Validation**: Comprehensive parameter checking
- **Safe Math**: Uses Solidity 0.8+ built-in overflow protection

## 🧪 Testing Strategy

### Smart Contract Tests

- Unit tests for all contract functions
- Integration tests for proposal lifecycle
- Edge case testing for voting mechanics
- Gas optimization verification

### Frontend Tests

- Component rendering tests
- User interaction simulations
- Web3 integration testing
- Responsive design validation

## 📊 Governance Parameters

### Proposal Requirements

- **Minimum Tokens**: Must hold governance tokens to create proposals
- **Voting Period**: 3 days from proposal creation
- **Quorum**: 10% of total token supply must participate
- **Majority**: 51% of votes cast must be in favor

### Token Distribution

- Initial supply: 1,000,000 GOV tokens
- Deployer receives initial allocation
- Additional tokens can be minted by contract owner
- Token balance equals voting power

## 🚀 Deployment Guide

### Local Development

1. Start Hardhat node: `npm run node`
2. Deploy contracts: `npm run deploy:localhost`
3. Start frontend: `npm run frontend`

### Testnet Deployment

1. Configure network in `hardhat.config.js`
2. Fund deployer account with testnet ETH
3. Deploy: `npm run deploy --network <network-name>`
4. Update frontend contract addresses
5. Deploy frontend to hosting service

### Production Considerations

- Audit smart contracts before mainnet deployment
- Use multisig wallet for contract ownership
- Implement timelock for critical operations
- Monitor gas costs and optimize accordingly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions and support:

- Create an issue in the repository
- Join our community discussions
- Check the documentation wiki

## 🎉 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat team for excellent development tools
- React and ethers.js communities for frontend tools
- Ethereum ecosystem for making decentralized governance possible

---

**Built with ❤️ for decentralized governance and financial transparency**
