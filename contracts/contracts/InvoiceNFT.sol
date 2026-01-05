// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract InvoiceNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextTokenId;

    struct InvoiceData {
        uint256 principalAmount; // In USD (18 decimals)
        uint256 repaymentAmount;
        uint256 dueDate;
        address supplier;
        address buyer;
        bool isRepaid;
    }

    // Mapping from tokenId to InvoiceData
    mapping(uint256 => InvoiceData) public invoices;

    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed supplier,
        uint256 principal,
        string daUri
    );
    event InvoiceRepaid(uint256 indexed tokenId);

    constructor() ERC721("CredStream Invoice", "CSI") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // We will grant MINTER_ROLE to the InvoiceFactory later
    }

    /**
     * @notice Mints a new invoice NFT linked to Mantle DA metadata.
     * @param to The MSME (supplier) address.
     * @param uri The Mantle DA URI (e.g., "mantle-da://<blob_id>").
     * @param principal The loan principal in USD (18 decimals).
     * @param repayment The expected repayment amount.
     * @param dueDate Timestamp of the invoice due date.
     * @param buyer Address of the invoice payer.
     */
    function mintInvoice(
        address to,
        string memory uri,
        uint256 principal,
        uint256 repayment,
        uint256 dueDate,
        address buyer
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = ++_nextTokenId;

        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);

        invoices[tokenId] = InvoiceData({
            principalAmount: principal,
            repaymentAmount: repayment,
            dueDate: dueDate,
            supplier: to,
            buyer: buyer,
            isRepaid: false
        });

        emit InvoiceMinted(tokenId, to, principal, uri);
        return tokenId;
    }

    /**
     * @dev Called by the Vault or Oracle to mark an invoice as settled.
     */
    function markRepaid(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        require(!invoices[tokenId].isRepaid, "Already repaid");
        invoices[tokenId].isRepaid = true;
        emit InvoiceRepaid(tokenId);
    }

    // Required override
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
