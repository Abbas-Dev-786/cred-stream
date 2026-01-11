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

    // --- LP ACCOUNTING ---
    mapping(address => uint256) public lpShares;
    uint256 public totalShares;

    // --- LOAN TRACKING ---
    struct LoanInfo {
        address borrower;
        uint256 usdyDisbursed;
        uint256 repaymentAmount;
    }
    mapping(uint256 => LoanInfo) public loans; // tokenId => LoanInfo

    event Deposited(address indexed lp, uint256 amount, uint256 shares);
    event Withdrawn(address indexed lp, uint256 amount, uint256 shares);
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

    // ==================== LP FUNCTIONS ====================

    /**
     * @notice Deposit USDy to provide liquidity. Receive shares proportional to pool.
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        uint256 shares;
        uint256 totalUSDy = usdyToken.balanceOf(address(this));
        
        if (totalShares == 0 || totalUSDy == 0) {
            shares = amount; // 1:1 for first deposit
        } else {
            shares = (amount * totalShares) / totalUSDy;
        }
        
        lpShares[msg.sender] += shares;
        totalShares += shares;
        
        require(usdyToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit Deposited(msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw USDy proportional to share ownership.
     */
    function withdrawLiquidity(uint256 shareAmount) external nonReentrant {
        require(shareAmount > 0, "Amount must be > 0");
        require(lpShares[msg.sender] >= shareAmount, "Insufficient shares");
        
        uint256 totalUSDy = usdyToken.balanceOf(address(this));
        uint256 usdyAmount = (shareAmount * totalUSDy) / totalShares;
        
        lpShares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        
        require(usdyToken.transfer(msg.sender, usdyAmount), "Transfer failed");
        
        emit Withdrawn(msg.sender, usdyAmount, shareAmount);
    }

    // ==================== BORROWER FUNCTIONS ====================

    /**
     * @notice Finances an invoice by collateralizing the NFT.
     * @dev Solves Asset-Liability Mismatch via dynamic Oracle pricing.
     */
    function financeInvoice(uint256 tokenId) external nonReentrant {
        // 1. Verify Ownership
        require(invoiceNft.ownerOf(tokenId) == msg.sender, "Not owner");

        // 2. Fetch Data & Checks
        (uint256 principal, uint256 repayment, , , , bool isRepaid) = invoiceNft.invoices(
            tokenId
        );
        require(!isRepaid, "Invoice already repaid");
        require(loans[tokenId].borrower == address(0), "Already financed");

        // 3. Asset-Liability Calculation
        uint256 usdyPrice = ondoOracle.getPrice();
        require(usdyPrice > 0, "Oracle price invalid");

        uint256 loanAmountUSD = (principal * ltvBasisPoints) / BPS_DENOMINATOR;
        uint256 usdyToTransfer = (loanAmountUSD * 1e18) / usdyPrice;

        // 4. Collateralize: Transfer NFT to Vault
        invoiceNft.safeTransferFrom(msg.sender, address(this), tokenId);

        // 5. Track the loan
        loans[tokenId] = LoanInfo({
            borrower: msg.sender,
            usdyDisbursed: usdyToTransfer,
            repaymentAmount: (repayment * ltvBasisPoints) / BPS_DENOMINATOR
        });

        // 6. Disburse USDy
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
     * @notice Repay a loan and reclaim the collateralized NFT.
     */
    function repayLoan(uint256 tokenId) external nonReentrant {
        LoanInfo memory loan = loans[tokenId];
        require(loan.borrower != address(0), "Loan not found");
        require(invoiceNft.ownerOf(tokenId) == address(this), "NFT not collateralized");

        // Get invoice data
        (, , , address supplier, , bool isRepaid) = invoiceNft.invoices(tokenId);
        require(!isRepaid, "Already repaid");

        // Transfer repayment from borrower to vault
        require(
            usdyToken.transferFrom(msg.sender, address(this), loan.repaymentAmount),
            "Repayment transfer failed"
        );

        // Return NFT to original supplier
        invoiceNft.safeTransferFrom(address(this), supplier, tokenId);

        // Mark as repaid (requires Vault to have MINTER_ROLE on NFT)
        invoiceNft.markRepaid(tokenId);

        // Clear loan data
        delete loans[tokenId];

        emit LoanRepaid(tokenId, loan.repaymentAmount);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get the USDy value of an LP's shares.
     */
    function getShareValue(address lp) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (lpShares[lp] * usdyToken.balanceOf(address(this))) / totalShares;
    }

    // ==================== ADMIN FUNCTIONS ====================

    function emergencyWithdraw(uint256 amount) external onlyOwner {
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
