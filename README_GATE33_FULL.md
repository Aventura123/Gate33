# Gate33 – Secure & Innovative Web3 Job Marketplace

## Overview
Gate33 is a next-generation portal designed to bring security, transparency, and innovation to the Web3 employment ecosystem. Our platform connects companies and professionals, enabling safe job postings, decentralized payments, and automated contract management using blockchain technology.

Gate33 is not just a job board—it's a secure environment where every transaction, permission, and configuration is auditable, automated, and protected by smart contracts. We empower both employers and job seekers to interact with confidence in a trustless, decentralized world.

---

## Key Features

### 1. Multi-Network Smart Contract Integration
- Supports Ethereum, Polygon, Binance Smart Chain, Optimism, Avalanche, and more.
- Dynamic contract address management for each supported network.
- All contract addresses and settings are validated and stored securely in Firestore.

### 2. Decentralized Payment Distribution
- Payments are split automatically: 70% to the main recipient wallet, 30% distributed among fee, development, charity, and evolution wallets.
- Distribution percentages are fully configurable and enforced on-chain.
- All wallet addresses and percentages are validated for security and correctness.

### 3. Permissioned Admin Dashboards
- **Admin Dashboard**: Manage system-wide settings, contract addresses, and payment configurations.
- **Company Dashboard**: For employers to manage job postings, payments, and company profiles.
- **Seeker Dashboard**: For job seekers to track applications, earnings, and opportunities.
- **Support Dashboard**: For platform support and compliance monitoring.
- **System Activity Dashboard**: Audit logs and system health for transparency and compliance.

### 4. Security & Ownership Verification
- On-chain contract ownership checks before allowing sensitive operations.
- Only contract owners can update critical settings (wallets, percentages).
- Bytecode and contract interface validation to prevent misconfiguration or fraud.
- All changes are logged and auditable.

### 5. Modern, Responsive UI
- Built with React and Tailwind CSS for a seamless, accessible experience.
- Dynamic forms for contract and wallet management, with real-time validation and feedback.
- Visual dashboards for payment flows, distribution, and system status.

### 6. Firestore & Blockchain Synchronization
- All settings are stored in Firestore and mirrored on-chain for redundancy and auditability.
- Automatic fallback and recovery if settings are missing or corrupted.
- Real-time updates and event-driven refreshes on network or wallet changes.

### 7. Developer & User Utilities
- Wallet connection and authentication via MetaMask and other providers.
- Utility scripts for admin permission management, job seeding, and contract deployment.
- Modular service architecture for easy extension and maintenance.

---

## Security & Innovation Focus
Gate33 is built from the ground up with security and innovation as core principles:
- **Trustless Payments**: No central authority can intercept or alter payment flows.
- **Permissioned Actions**: Only verified owners and admins can perform sensitive operations.
- **Auditability**: Every change is logged, and all critical actions require on-chain verification.
- **Configurability**: The system adapts to new networks, contracts, and business models with minimal friction.
- **Transparency**: All payment splits, wallet addresses, and contract settings are visible and verifiable.

---

## Smart Contracts
Gate33 leverages a suite of audited smart contracts, including:
- `Gate33PaymentProcessor.sol`: Handles payment distribution and fee logic.
- `G33TokenDistributorv2.sol`: Manages token-based rewards and Learn2Earn flows.
- `InstantJobsEscrow.sol`: Provides escrow for instant job payments.
- `Learn2EarnContract.sol`: Supports gamified learning and earning experiences.

All contracts are upgradable and designed for extensibility.

---

## Project Structure
- **/components**: UI components and dashboards.
- **/config**: Network and contract configuration files.
- **/contracts**: Solidity smart contracts.
- **/services**: Web3, authentication, and business logic services.
- **/lib**: Firebase and utility libraries.
- **/pages**: Next.js routing and page components.
- **/docs**: Guides, best practices, and style guides.
- **/scripts**: Automation and utility scripts (e.g., job seeding, admin updates).

---

## Crypto Tools Suite
Gate33 offers a unique set of crypto tools designed to empower both Web3 professionals and enthusiasts with actionable insights and fun wallet analytics. These tools are available in the Crypto Tools dashboard and include:

- **ENS Name Checker**: Instantly look up the ENS (Ethereum Name Service) name for any wallet address, with support for fallback providers to maximize reliability. Our implementation uses multiple provider fallbacks (MetaMask, Infura, BlastAPI) to ensure maximum uptime and resolution success.

- **Wallet Age Calculator**: Discover how old a wallet is by checking its first transaction date, with fallback deterministic estimation for privacy or when APIs are unavailable. This tool leverages the Moralis API with a proprietary deterministic algorithm that generates consistent, privacy-preserving results when transaction data cannot be retrieved.

- **Wallet Luck Score**: Analyze the 'luck' of a wallet address based on patterns, rare sequences, and crypto numerology—gamifying the wallet experience. Our algorithm examines character sequences, special patterns (like repeated digits), and crypto-significant numbers to generate an engagement-driving score between 0-100.

- **Flex Card Generator**: Create a shareable, gamified card for any wallet, showing a custom crypto score, NFT collection size, wallet age, and a fun mood or nickname. Great for social bragging and community engagement. The cards feature animated elements, adaptive theming based on the wallet's score, and randomly generated but deterministic personality traits.

- **Market & Governance Tools**: Access market cap comparisons, token analytics, and governance copilot features to help users make informed decisions and participate in DAO governance. Includes real-time market cap visualizations, token ROI calculators, and AI-powered governance proposal analysis.

- **Bitcoin Network Analysis**: Explore Bitcoin network health metrics, transaction volume trends, and market sentiment indicators, presented through interactive visualizations. This tool helps users understand macro Bitcoin trends and make more informed decisions.

- **Governance Copilot**: AI-powered assistant that helps users understand complex DAO proposals, analyzes potential impacts of governance votes, and summarizes past governance outcomes to make on-chain governance more accessible.

All tools are built with privacy and UX in mind, using deterministic calculations when needed and never storing sensitive data. The Crypto Tools suite is a key differentiator for Gate33, blending utility, education, and entertainment for the Web3 workforce. Unlike traditional analytics platforms, our tools combine practical utility with gamified elements that make Web3 data more engaging and accessible to all user skill levels.

---

## Why Gate33?
Gate33 is the first Web3 job portal to combine:
- Multi-chain payment automation
- On-chain permission and ownership enforcement
- Transparent, auditable admin controls
- Modular, extensible architecture for rapid innovation

**Gate33 is your gateway to a safer, smarter, and more transparent Web3 job market.**

---

For more details, see the [Gate33 UI Components Guide](docs/Gate33_UI_Components_Guide.md) and [Security Best Practices](docs/security-best-practices.md).

---

**Gate33 – Building trust and innovation for the future of work in Web3.**
