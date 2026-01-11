import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("CredStream Protocol", function () {
    // Deploy all contracts fixture
    async function deployProtocolFixture() {
        const [owner, supplier, lp1, lp2, buyer, aiAgent] = await hre.ethers.getSigners();

        // Deploy Mock USDy
        const USDy = await hre.ethers.getContractFactory("MyERC20");
        const usdy = await USDy.deploy();

        // Deploy Oracle with initial price of $1.05
        const Oracle = await hre.ethers.getContractFactory("MyOracle");
        const oracle = await Oracle.deploy(ethers.parseUnits("1.05", 18));

        // Deploy Verifier
        const Verifier = await hre.ethers.getContractFactory("MyVerifier");
        const verifier = await Verifier.deploy();

        // Deploy InvoiceNFT
        const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
        const invoiceNFT = await InvoiceNFT.deploy();

        // Deploy ComplianceModule
        const Compliance = await hre.ethers.getContractFactory("ComplianceModule");
        const compliance = await Compliance.deploy(await verifier.getAddress());

        // Deploy InvoiceFactory
        const Factory = await hre.ethers.getContractFactory("InvoiceFactory");
        const factory = await Factory.deploy(
            await invoiceNFT.getAddress(),
            await compliance.getAddress(),
            aiAgent.address
        );

        // Deploy Vault
        const Vault = await hre.ethers.getContractFactory("CredStreamVault");
        const vault = await Vault.deploy(
            await usdy.getAddress(),
            await invoiceNFT.getAddress(),
            await oracle.getAddress()
        );

        // Grant MINTER_ROLE to Factory and Vault
        const MINTER_ROLE = await invoiceNFT.MINTER_ROLE();
        await invoiceNFT.grantRole(MINTER_ROLE, await factory.getAddress());
        await invoiceNFT.grantRole(MINTER_ROLE, await vault.getAddress());

        // Pre-verify GST for supplier (mock)
        const gstHash = ethers.id("TEST_GST_123456789");
        await compliance.verifyGSTProof(
            [0n, 0n],
            [[0n, 0n], [0n, 0n]],
            [0n, 0n],
            [BigInt(gstHash)]
        );

        // Mint USDy to participants
        await usdy.mint(lp1.address, ethers.parseUnits("100000", 18));
        await usdy.mint(lp2.address, ethers.parseUnits("50000", 18));
        await usdy.mint(supplier.address, ethers.parseUnits("20000", 18)); // For repayment

        return {
            usdy, oracle, verifier, invoiceNFT, compliance, factory, vault,
            owner, supplier, lp1, lp2, buyer, aiAgent,
            gstHash, MINTER_ROLE
        };
    }

    describe("Oracle Security", function () {
        it("Should only allow owner to set price", async function () {
            const { oracle, lp1 } = await loadFixture(deployProtocolFixture);
            
            await expect(
                oracle.connect(lp1).setPrice(ethers.parseUnits("1.10", 18))
            ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
        });

        it("Should update price and timestamp correctly", async function () {
            const { oracle, owner } = await loadFixture(deployProtocolFixture);
            
            const newPrice = ethers.parseUnits("1.08", 18);
            await oracle.setPrice(newPrice);
            
            expect(await oracle.price()).to.equal(newPrice);
        });

        it("Should reject zero price", async function () {
            const { oracle } = await loadFixture(deployProtocolFixture);
            
            await expect(oracle.setPrice(0)).to.be.revertedWith("Price must be > 0");
        });
    });

    describe("Vault LP Operations", function () {
        it("Should allow LP to deposit and receive shares", async function () {
            const { vault, usdy, lp1 } = await loadFixture(deployProtocolFixture);
            
            const depositAmount = ethers.parseUnits("10000", 18);
            await usdy.connect(lp1).approve(await vault.getAddress(), depositAmount);
            
            await expect(vault.connect(lp1).deposit(depositAmount))
                .to.emit(vault, "Deposited")
                .withArgs(lp1.address, depositAmount, depositAmount); // 1:1 for first deposit
            
            expect(await vault.lpShares(lp1.address)).to.equal(depositAmount);
            expect(await vault.totalShares()).to.equal(depositAmount);
        });

        it("Should allow LP to withdraw proportional to shares", async function () {
            const { vault, usdy, lp1 } = await loadFixture(deployProtocolFixture);
            
            // Deposit
            const depositAmount = ethers.parseUnits("10000", 18);
            await usdy.connect(lp1).approve(await vault.getAddress(), depositAmount);
            await vault.connect(lp1).deposit(depositAmount);
            
            // Withdraw half
            const withdrawShares = depositAmount / 2n;
            const balanceBefore = await usdy.balanceOf(lp1.address);
            
            await vault.connect(lp1).withdrawLiquidity(withdrawShares);
            
            const balanceAfter = await usdy.balanceOf(lp1.address);
            expect(balanceAfter - balanceBefore).to.equal(withdrawShares);
            expect(await vault.lpShares(lp1.address)).to.equal(depositAmount - withdrawShares);
        });

        it("Should reject withdrawal with insufficient shares", async function () {
            const { vault, usdy, lp1, lp2 } = await loadFixture(deployProtocolFixture);
            
            const depositAmount = ethers.parseUnits("1000", 18);
            await usdy.connect(lp1).approve(await vault.getAddress(), depositAmount);
            await vault.connect(lp1).deposit(depositAmount);
            
            // lp2 tries to withdraw without depositing
            await expect(
                vault.connect(lp2).withdrawLiquidity(ethers.parseUnits("100", 18))
            ).to.be.revertedWith("Insufficient shares");
        });
    });

    describe("Invoice Financing Flow", function () {
        async function mintInvoiceFixture() {
            const base = await loadFixture(deployProtocolFixture);
            const { factory, invoiceNFT, compliance, vault, usdy, supplier, aiAgent, gstHash, lp1 } = base;
            
            // LP deposits liquidity
            const depositAmount = ethers.parseUnits("50000", 18);
            await usdy.connect(lp1).approve(await vault.getAddress(), depositAmount);
            await vault.connect(lp1).deposit(depositAmount);
            
            // Create AI signature
            const principal = ethers.parseUnits("10000", 18);
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "address", "string"],
                [supplier.address, principal, ethers.ZeroAddress, "APPROVED"]
            );
            const signature = await aiAgent.signMessage(ethers.getBytes(messageHash));
            
            // Mint invoice
            await factory.connect(supplier).mintVerifiedInvoice(
                supplier.address,
                "ipfs://test-metadata",
                principal,
                principal, // repayment = principal for simplicity
                Math.floor(Date.now() / 1000) + 86400 * 30,
                ethers.ZeroAddress,
                gstHash,
                signature
            );
            
            const tokenId = 1n;
            
            return { ...base, tokenId, principal };
        }

        it("Should mint invoice with valid AI signature", async function () {
            const { invoiceNFT, supplier, tokenId } = await loadFixture(mintInvoiceFixture);
            
            expect(await invoiceNFT.ownerOf(tokenId)).to.equal(supplier.address);
        });

        it("Should reject invoice with invalid AI signature", async function () {
            const { factory, supplier, lp1, gstHash } = await loadFixture(deployProtocolFixture);
            
            const principal = ethers.parseUnits("10000", 18);
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "address", "string"],
                [supplier.address, principal, ethers.ZeroAddress, "APPROVED"]
            );
            // Sign with wrong signer
            const badSignature = await lp1.signMessage(ethers.getBytes(messageHash));
            
            await expect(
                factory.connect(supplier).mintVerifiedInvoice(
                    supplier.address,
                    "ipfs://test",
                    principal,
                    principal,
                    Math.floor(Date.now() / 1000) + 86400 * 30,
                    ethers.ZeroAddress,
                    gstHash,
                    badSignature
                )
            ).to.be.revertedWith("AI Risk Assessment Failed");
        });

        it("Should finance invoice and transfer USDy to supplier", async function () {
            const { vault, usdy, invoiceNFT, supplier, tokenId, principal } = await loadFixture(mintInvoiceFixture);
            
            // Approve NFT transfer
            await invoiceNFT.connect(supplier).approve(await vault.getAddress(), tokenId);
            
            const balanceBefore = await usdy.balanceOf(supplier.address);
            
            await vault.connect(supplier).financeInvoice(tokenId);
            
            const balanceAfter = await usdy.balanceOf(supplier.address);
            
            // 80% LTV at $1.05 price
            const expectedLoan = (principal * 8000n / 10000n) * BigInt(1e18) / ethers.parseUnits("1.05", 18);
            
            expect(balanceAfter - balanceBefore).to.be.closeTo(expectedLoan, ethers.parseUnits("1", 18));
            expect(await invoiceNFT.ownerOf(tokenId)).to.equal(await vault.getAddress());
        });

        it("Should allow loan repayment and return NFT", async function () {
            const { vault, usdy, invoiceNFT, supplier, tokenId, principal } = await loadFixture(mintInvoiceFixture);
            
            // Finance the invoice
            await invoiceNFT.connect(supplier).approve(await vault.getAddress(), tokenId);
            await vault.connect(supplier).financeInvoice(tokenId);
            
            // Get repayment amount from loan tracking
            const loan = await vault.loans(tokenId);
            
            // Approve repayment
            await usdy.connect(supplier).approve(await vault.getAddress(), loan.repaymentAmount);
            
            // Repay
            await vault.connect(supplier).repayLoan(tokenId);
            
            // NFT should be returned to supplier
            expect(await invoiceNFT.ownerOf(tokenId)).to.equal(supplier.address);
            
            // Invoice should be marked as repaid
            const invoiceData = await invoiceNFT.invoices(tokenId);
            expect(invoiceData.isRepaid).to.be.true;
        });
    });

    describe("ZK Verifier", function () {
        it("Should pass in demo mode", async function () {
            const { verifier } = await loadFixture(deployProtocolFixture);
            
            expect(await verifier.demoMode()).to.be.true;
            expect(await verifier.verifyProof([0n, 0n], [[0n, 0n], [0n, 0n]], [0n, 0n], [0n])).to.be.true;
        });

        it("Should fail when demo mode is disabled", async function () {
            const { verifier } = await loadFixture(deployProtocolFixture);
            
            await verifier.setDemoMode(false);
            
            expect(await verifier.verifyProof([0n, 0n], [[0n, 0n], [0n, 0n]], [0n, 0n], [0n])).to.be.false;
        });

        it("Should only allow owner to toggle demo mode", async function () {
            const { verifier, lp1 } = await loadFixture(deployProtocolFixture);
            
            await expect(
                verifier.connect(lp1).setDemoMode(false)
            ).to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount");
        });
    });
});
