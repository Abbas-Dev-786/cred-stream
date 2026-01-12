import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  // --- 1. DEPLOY MOCKS (Testnet Only) ---
  let usdyAddress;
  let oracleAddress;
  let verifierAddress;

  // If we are on Localhost or Mantle Sepolia, we need Mocks
  if (network.name === "hardhat" || network.name === "mantleSepolia") {
    console.log("\n--- Deploying Mocks ---");

    // Mock USDy
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdy = await MockERC20.deploy("Ondo USDy (Testnet)", "USDy");
    await usdy.waitForDeployment();
    usdyAddress = await usdy.getAddress();
    console.log("✅ MockUSDy deployed to:", usdyAddress);

    // Mock Oracle (Price = $1.05)
    const MockOracle = await ethers.getContractFactory("MockOracle");
    // 1.05 * 10^18
    const oracle = await MockOracle.deploy(ethers.parseEther("1.05"));
    await oracle.waitForDeployment();
    oracleAddress = await oracle.getAddress();
    console.log("✅ MockOracle deployed to:", oracleAddress);

    // Mock Verifier
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const verifier = await MockVerifier.deploy();
    await verifier.waitForDeployment();
    verifierAddress = await verifier.getAddress();
    console.log("✅ MockVerifier deployed to:", verifierAddress);
  } else {
    // PRODUCTION: Set real Mainnet addresses here
    usdyAddress = "0x5bE26527e817998A7206475496fDE1E68957c5A6"; // Real Ondo USDy
    oracleAddress = "0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f"; // Real Ondo Oracle
    // verifierAddress = "0x..."; // Your Real ZK Verifier
  }

  // --- 2. DEPLOY CORE CONTRACTS ---
  console.log("\n--- Deploying Core ---");

  // A. Compliance Module
  const ComplianceModule = await ethers.getContractFactory("ComplianceModule");
  const compliance = await ComplianceModule.deploy(verifierAddress);
  await compliance.waitForDeployment();
  console.log("✅ ComplianceModule:", await compliance.getAddress());

  // B. Invoice NFT
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNft = await InvoiceNFT.deploy();
  await invoiceNft.waitForDeployment();
  console.log("✅ InvoiceNFT:", await invoiceNft.getAddress());

  // C. Invoice Factory
  const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
  // NOTE: For 'aiAgent', we use the deployer address for now so YOU can sign the tests
  const factory = await InvoiceFactory.deploy(
    await invoiceNft.getAddress(),
    await compliance.getAddress(),
    deployer.address
  );
  await factory.waitForDeployment();
  console.log("✅ InvoiceFactory:", await factory.getAddress());

  // D. CredStream Vault
  const CredStreamVault = await ethers.getContractFactory("CredStreamVault");
  const vault = await CredStreamVault.deploy(
    usdyAddress,
    await invoiceNft.getAddress(),
    oracleAddress
  );
  await vault.waitForDeployment();
  console.log("✅ CredStreamVault:", await vault.getAddress());

  // --- 3. CONFIGURATION & WIRING ---
  console.log("\n--- Wiring Permissions ---");

  // Grant MINTER_ROLE to Factory
  const MINTER_ROLE = await invoiceNft.MINTER_ROLE();
  const tx1 = await invoiceNft.grantRole(
    MINTER_ROLE,
    await factory.getAddress()
  );
  await tx1.wait();
  console.log("👉 Granted MINTER_ROLE to Factory");

  // Grant MINTER_ROLE to Vault (Required for repayLoan to mark invoices as repaid)
  const txVault = await invoiceNft.grantRole(
    MINTER_ROLE,
    await vault.getAddress()
  );
  await txVault.wait();
  console.log("👉 Granted MINTER_ROLE to Vault");

  // Seed Vault with Liquidity (If Mock)
  if (network.name === "mantleSepolia") {
    const MockERC20 = await ethers.getContractAt("MockERC20", usdyAddress);
    const amount = ethers.parseEther("50000"); // 50k USDy
    const tx2 = await MockERC20.mint(deployer.address, amount); // Mint to self first
    await tx2.wait();

    const tx3 = await MockERC20.approve(await vault.getAddress(), amount);
    await tx3.wait();

    // Use deposit() to mint LP shares (Direct transfer would break accounting)
    const tx4 = await vault.deposit(amount);
    await tx4.wait();
    console.log("👉 Seeded Vault with 50,000 Mock USDy (via deposit)");
  }

  console.log("\n🚀 DEPLOYMENT COMPLETE 🚀");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
