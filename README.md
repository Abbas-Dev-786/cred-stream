Here is a professional, hackathon-winning **README.md** for CredStream.

You can copy-paste this directly into your project's root `README.md` file. It highlights your architecture, the specific Mantle integrations, and the AI/RWA features to ensure judges understand the depth of your work.

---

# 🌊 CredStream: Decentralized Invoice Factoring on Mantle

**CredStream** is a decentralized "RealFi" platform that bridges the $530B credit gap for MSMEs. By tokenizing invoices as **Real World Assets (RWAs)** and collateralizing them against **Ondo Finance's USDy** (Yield-bearing Stablecoin), we provide instant, permissionless liquidity to businesses while offering investors sustainable, institutional-grade yield.

---

## 🏗 Architectural Vision

CredStream leverages a **Modular Architecture** to solve the scalability and privacy issues of traditional factoring:

1. **Execution Layer (Mantle Network):** High-throughput, low-fee processing of loan origination and repayment.
2. **Data Layer (IPFS/Pinata):** Decentralized, immutable storage for invoice metadata and legal documents, ensuring data availability without clogging the execution layer.
3. **Intelligence Layer (AI Oracles):** An AI Agent (OpenAI) analyzes invoice risk off-chain and cryptographically signs approvals, acting as a gatekeeper for the protocol.
4. **Privacy Layer (ZK-Proofs):** (Beta) Integration for verifying sensitive tax data (GSTIN) without revealing raw business intelligence.

---

## 🚀 Key Features

* **📄 Invoice-as-an-NFT:** Each invoice is minted as a unique ERC-721 token containing the metadata link and loan terms.
* **🤖 AI Risk Assessment:** Automated credit scoring using LLMs. The smart contract validates the AI's cryptographic signature before allowing any minting.
* **💰 USDy Integration:** Collateralized lending using **Ondo USDy**, allowing the Vault to earn passive yield on idle capital while funding active loans.
* **🔒 Gatekeeper Pattern:** Smart contracts utilize `recoverSigner` logic to ensure only AI-verified invoices are funded.
* **📂 Modular Storage:** Invoice PDFs are pinned to IPFS, ensuring decentralization and permanence.

---

## 🔗 Deployed Contracts (Mantle Sepolia)

| Contract | Address | Description |
| --- | --- | --- |
| **CredStreamVault** | `0x8dB385AFB15CEBe8f345A2F4bCDcc757E1C6EdA3` | Liquidity pool for USDy & Lending Logic. |
| **InvoiceFactory** | `0x5D934Ed328963DF0CB0b69d986c604e9BcC11cfE` | Orchestrates AI verification & Minting. |
| **InvoiceNFT** | `0x566AC179DbFD2d02769dbF5494b620Aa42e0Af59` | ERC-721 Standard for RWA Invoices. |
| **ComplianceModule** | `0x4663E1c09ea9c5120Bc757DD2478f5Ff3FcB6167` | ZK-Proof Verification Logic. |
| **Mock USDy** | `0x73C68bc2635Aa369Ccb31B7a354866Ba9CA1bAbD` | Yield-bearing stablecoin simulation. |

---

## 🛠 Tech Stack

* **Blockchain:** Mantle Network (Sepolia Testnet)
* **Smart Contracts:** Solidity, Hardhat
* **Frontend:** Next.js 14, Tailwind CSS, Shadcn/UI
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
git clone https://github.com/abbas-dev-786/cred-stream.git
cd cred-stream

```

### 2. Frontend Setup

```bash
cd frontend
npm install

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
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) to view the Dapp.

---

## 🔄 User Flow

### For MSMEs (Borrowers)

1. **Upload:** User uploads an invoice PDF via the Dashboard.
2. **Analyze:** The backend uploads the file to **IPFS** and sends the text to the **AI Agent**.
3. **Sign:** If the Risk Score > 70, the AI Agent signs the approval with its private key.
4. **Mint:** User submits the transaction to Mantle. The `InvoiceFactory` verifies the signature and mints the **RWA NFT**.

### For Investors (Liquidity Providers)

1. **Connect:** User connects wallet to the Vault page.
2. **Deposit:** User approves **USDy** and deposits it into the pool.
3. **Earn:** Investors earn a share of the interest paid by MSMEs + the native yield from USDy.

---

## 🛡 Security & Design Decisions

* **Asset-Liability Management:** The Vault dynamically calculates the loan amount based on the Oracle price of USDy to prevent loss during stablecoin de-pegs or rebasing.
* **Role-Based Access:** Only the `InvoiceFactory` has the `MINTER_ROLE` on the NFT contract, ensuring no unverified invoices can ever be created.
* **Server-Side Signing:** The AI Private Key is kept strictly in the Next.js backend environment variables, never exposed to the client.

---

## 📜 License

This project is licensed under the MIT License.

---

*Built with ❤️ for the Mantle Network Hackathon.*