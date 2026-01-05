// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./InvoiceNFT.sol";

interface IRWADynamicOracle {
    function getPrice() external view returns (uint256);
}

contract CredStreamVault is ReentrancyGuard, Ownable, IERC721Receiver {
    IERC20 public immutable usdyToken;
    InvoiceNFT public immutable invoiceNft;
    IRWADynamicOracle public immutable ondoOracle;

    // LTV: 80% (8000 basis points)
    uint256 public ltvBasisPoints = 8000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    event LoanDisbursed(
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 usdyAmount,
        uint256 usdValue
    );
    event LoanRepaid(uint256 indexed tokenId, uint256 usdyAmount);

    constructor(
        address _usdyToken,
        address _invoiceNft,
        address _ondoOracle
    ) Ownable(msg.sender) {
        usdyToken = IERC20(_usdyToken);
        invoiceNft = InvoiceNFT(_invoiceNft);
        ondoOracle = IRWADynamicOracle(_ondoOracle);
    }

    /**
     * @notice Finances an invoice by collateralizing the NFT.
     * @dev Solves Asset-Liability Mismatch via dynamic Oracle pricing.
     */
    function financeInvoice(uint256 tokenId) external nonReentrant {
        // 1. Verify Ownership
        require(invoiceNft.ownerOf(tokenId) == msg.sender, "Not owner");

        // 2. Fetch Data & Checks
        (uint256 principal, , , , , bool isRepaid) = invoiceNft.invoices(
            tokenId
        );
        require(!isRepaid, "Invoice already repaid");

        // 3. Asset-Liability Calculation
        // Formula: (Invoice Principal USD * LTV) / Current USDy Price
        uint256 usdyPrice = ondoOracle.getPrice(); // Returns price with 18 decimals (e.g. 1.05e18)
        require(usdyPrice > 0, "Oracle price invalid");

        uint256 loanAmountUSD = (principal * ltvBasisPoints) / BPS_DENOMINATOR;

        // Conversion: (USD * 1e18) / (USD/USDy)
        uint256 usdyToTransfer = (loanAmountUSD * 1e18) / usdyPrice;

        // 4. Collateralize: Transfer NFT to Vault
        invoiceNft.safeTransferFrom(msg.sender, address(this), tokenId);

        // 5. Disburse USDy
        require(
            usdyToken.balanceOf(address(this)) >= usdyToTransfer,
            "Insufficient Vault Liquidity"
        );
        require(
            usdyToken.transfer(msg.sender, usdyToTransfer),
            "Transfer failed"
        );

        emit LoanDisbursed(tokenId, msg.sender, usdyToTransfer, loanAmountUSD);
    }

    /**
     * @notice Allow admin to withdraw stuck funds or yield.
     */
    function withdrawLiquidity(uint256 amount) external onlyOwner {
        usdyToken.transfer(msg.sender, amount);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
