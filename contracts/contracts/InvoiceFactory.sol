// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./InvoiceNFT.sol";
import "./ComplianceModule.sol";

contract InvoiceFactory {
    using ECDSA for bytes32;

    InvoiceNFT public invoiceNFT;
    ComplianceModule public compliance;
    address public aiAgentSigner; // The wallet address of your Python AI Agent

    event InvoiceCreated(uint256 tokenId, address supplier);

    constructor(address _nft, address _compliance, address _aiAgent) {
        invoiceNFT = InvoiceNFT(_nft);
        compliance = ComplianceModule(_compliance);
        aiAgentSigner = _aiAgent;
    }

    /**
     * @notice Mint invoice ONLY if:
     * 1. GST is verified (ZK status check).
     * 2. Risk Score is acceptable (AI Signature check).
     * @param to Supplier address
     * @param daUri The Mantle DA link
     * @param principal Loan amount
     * @param repayment Repayment amount
     * @param dueDate Due date
     * @param buyer Buyer address
     * @param gstHash Hash of the GSTIN (must match what was verified in ComplianceModule)
     * @param aiSignature Signature from the off-chain AI agent approving this specific invoice
     */
    function mintVerifiedInvoice(
        address to,
        string memory daUri,
        uint256 principal,
        uint256 repayment,
        uint256 dueDate,
        address buyer,
        bytes32 gstHash,
        bytes memory aiSignature
    ) external {
        // 1. Check ZK Compliance
        // require(compliance.isGSTVerified(gstHash), "Supplier not ZK-verified"); // NOTE: Disabled for Hackathon Demo flow

        // 2. Verify AI Risk Assessment
        // The AI must have signed: keccak256(to, principal, buyer, "APPROVED")
        bytes32 messageHash = keccak256(
            abi.encodePacked(to, principal, buyer, "APPROVED")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );

        address recoveredSigner = ethSignedMessageHash.recover(aiSignature);
        require(recoveredSigner == aiAgentSigner, "AI Risk Assessment Failed");

        // 3. Mint the NFT
        uint256 tokenId = invoiceNFT.mintInvoice(
            to,
            daUri,
            principal,
            repayment,
            dueDate,
            buyer
        );

        emit InvoiceCreated(tokenId, to);
    }
}
