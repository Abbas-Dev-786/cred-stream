# 🌊 CredStream: Decentralized Invoice Factoring on Mantle
![Mantle Network](https://img.shields.io/badge/Network-Mantle%20Sepolia-green)
![Category](https://img.shields.io/badge/Track-RWA%20%26%20RealFi-blue)
![Tech](https://img.shields.io/badge/Tech-AI%20%2B%20ZK%20%2B%20IPFS-purple)
![Status](https://img.shields.io/badge/Status-Hackathon%20Ready-orange)

> **Bridging the $5.2 Trillion Trade Finance Gap with AI, ZK-Proofs, and Real World Assets.**

---

**CredStream** is a decentralized "RealFi" platform that bridges the $530B credit gap for MSMEs. By tokenizing invoices as **Real World Assets (RWAs)** and collateralizing them against **Ondo Finance's USDy** (Yield-bearing Stablecoin), we provide instant, permissionless liquidity to businesses while offering investors sustainable, institutional-grade yield.

---


## 📽️ Demo & Links

- **🚀 Live Demo:** [https://cred-stream.vercel.app](https://cred-stream.vercel.app) 
- **📹 Demo Video:** [YouTube] *(Replace with your video link)*
- **📄 Pitch Deck:** [Link to Slides]

---

## 🏗 Architectural Vision

CredStream leverages a **Modular Architecture** to solve the scalability and privacy issues of traditional factoring:

1. **Execution Layer (Mantle Network):** High-throughput, low-fee processing of loan origination and repayment.
2. **Data Layer (IPFS/Pinata):** Decentralized, immutable storage for invoice metadata and legal documents.
3. **Intelligence Layer (AI Oracles):** An AI Agent (OpenAI) analyzes invoice risk off-chain and cryptographically signs approvals.
4. **Privacy Layer (ZK-Proofs):** (Demo Mode) Integration for verifying sensitive tax data (GSTIN) without revealing raw business intelligence.

---

## 🚀 Key Features

* **📄 Invoice-as-an-NFT:** Each invoice is minted as a unique ERC-721 token containing the metadata link and loan terms.
* **🤖 AI Risk Assessment:** Automated credit scoring using LLMs. The smart contract validates the AI's cryptographic signature before allowing any minting.
* **💰 USDy Integration:** Collateralized lending using **Ondo USDy**, allowing the Vault to earn passive yield on idle capital.
* **🏦 LP Share System:** Liquidity providers receive proportional shares and can withdraw their USDy at any time.
* **🔒 Gatekeeper Pattern:** Smart contracts utilize `recoverSigner` logic to ensure only AI-verified invoices are funded.
* **📂 Modular Storage:** Invoice PDFs are pinned to IPFS, ensuring decentralization and permanence.
* **🔐 Privacy-First Verification (ZK):** We use a **Groth16 ZK Proof** flow. The user proves they have a valid, tax-compliant invoice *locally* in their browser, and only submits the proof to the chain.

---

## 🔗 Deployed Contracts (Mantle Sepolia)

| Contract | Address | Description |
| --- | --- | --- |
| **CredStreamVault** | `0x18055bA594d4721D3c26D339e4e5db01c78A7d4d` | Liquidity pool for USDy & Lending Logic |
| **InvoiceFactory** | `0xa4BB9d7187bfC1Af0d9FD1E86D1b9910eC1cd9D2` | Orchestrates AI verification & Minting |
| **InvoiceNFT** | `0xe42aA6D6C1917A181BFe7a20D57ea1c7499BC80D` | ERC-721 Standard for RWA Invoices |
| **ComplianceModule** | `0x8E9cbA787DcB63776e590EbEEeA0Aa38135d2596` | ZK-Proof Verification Logic |
| **USDy Oracle** | `0xD3Fc9303d2999e6d9de464Cf36aF39BD6b74E756` | Price feed for USDy/USD |
| **Mock USDy** | `0xe533f14f36C58Ed745248F2A1e148405e484ce74` | Yield-bearing stablecoin simulation |

---

## 🛠 Tech Stack

* **Blockchain:** Mantle Network (Sepolia Testnet)
* **Smart Contracts:** Solidity 0.8.20, Hardhat, OpenZeppelin
* **Frontend:** Next.js 16, Tailwind CSS, Shadcn/UI
* **Web3 Integration:** Thirdweb SDK v5
* **Storage:** IPFS (via Pinata)
* **AI Engine:** OpenAI GPT-3.5 Turbo + Ethers.js (Server-side Signing)

---

## ⚡ Getting Started

### Prerequisites

* Node.js v18+
* Metamask (Configured for Mantle Sepolia)
* Pinata Account (For IPFS)
* OpenAI API Key

### 1. Clone the Repository

```bash
git clone https://github.com/Abbas-Dev-786/cred-stream.git
cd cred-stream
```

### 2. Frontend Setup

```bash
cd frontend
pnpm install

# Create environment file
cp .env.example .env.local
```

**Configure `.env.local`:**

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID="your_thirdweb_key"
OPENAI_API_KEY="sk-..."
PINATA_JWT="eyJhG..."
# Private Key of the wallet used as the 'AI Agent' (Must match contract config)
AI_AGENT_PRIVATE_KEY="0x..."
```

### 3. Run the Application

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the Dapp.

### 4. Run Contract Tests

```bash
cd contracts
pnpm install
npx hardhat test
```

---

## 🔄 User Flow

### For MSMEs (Borrowers)

1. **Upload:** User uploads an invoice PDF via the Dashboard.
2. **Analyze:** The backend uploads the file to **IPFS** and sends the text to the **AI Agent**.
3. **Sign:** If the Risk Score > 70, the AI Agent signs the approval with its private key.
4. **Mint:** User submits the transaction to Mantle. The `InvoiceFactory` verifies the signature and mints the **RWA NFT**.
5. **Get Loan:** User calls `financeInvoice()` on the Vault, transferring the NFT as collateral and receiving **USDy**.
6. **Repay:** When ready, user repays the loan to reclaim their NFT.

### For Investors (Liquidity Providers)

1. **Connect:** User connects wallet to the Vault page.
2. **Deposit:** User approves **USDy** and deposits it into the pool, receiving **LP shares**.
3. **Earn:** Investors earn a share of the interest paid by MSMEs + the native yield from USDy.
4. **Withdraw:** Users can withdraw their share of the pool at any time.

---

## 🛡 Security & Design Decisions

* **Asset-Liability Management:** The Vault dynamically calculates the loan amount based on the Oracle price of USDy to prevent loss during stablecoin de-pegs or rebasing.
* **Role-Based Access:** Only the `InvoiceFactory` and `CredStreamVault` have the `MINTER_ROLE` on the NFT contract.
* **Oracle Security:** Price updates are restricted to the contract owner with staleness checks (1-day max age).
* **Server-Side Signing:** The AI Private Key is kept strictly in the Next.js backend environment variables, never exposed to the client.
* **Comprehensive Tests:** 12+ unit tests covering Oracle security, LP operations, invoice financing, and repayment flows.

---

## 📊 Test Coverage

```
CredStream Protocol
  Oracle Security
    ✔ Should only allow owner to set price
    ✔ Should update price and timestamp correctly
    ✔ Should reject zero price
  Vault LP Operations
    ✔ Should allow LP to deposit and receive shares
    ✔ Should allow LP to withdraw proportional to shares
    ✔ Should reject withdrawal with insufficient shares
  Invoice Financing Flow
    ✔ Should mint invoice with valid AI signature
    ✔ Should reject invoice with invalid AI signature
    ✔ Should finance invoice and transfer USDy to supplier
    ✔ Should allow loan repayment and return NFT
  ZK Verifier
    ✔ Should pass in demo mode
    ✔ Should fail when demo mode is disabled
```

---

## 📜 License

This project is licensed under the MIT License.

---

👥 Team Bios
Abbas Bhanpura wala - Full Stack Blockchain Developer

Role: Smart Contracts, Frontend Architecture, ZK Integration.

GitHub: @Abbas-Dev-786

Email: abbasbhp787@gmail.com


⚖️ Compliance Declaration
Regulated Assets Disclosure: This project utilizes concepts related to Real World Assets (Invoice Factoring).

Current Status: This is a Proof of Concept (PoC) built for the Mantle Hackathon.

Testnet Only: All "USDy" tokens used are Mock Tokens with no real-world value.

Regulation: In a mainnet deployment, this protocol would require integration with a KYC/AML provider (e.g., Ondo Finance's permissioned allowlist) to comply with securities regulations regarding RWA tokenization.

Privacy: We prioritize user privacy using Zero-Knowledge proofs to ensure sensitive business tax data is never exposed on the public ledger.

---

*Built with ❤️ for the Mantle Network Hackathon.*
