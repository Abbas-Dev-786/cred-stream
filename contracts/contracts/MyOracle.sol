// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyOracle
 * @notice A mock oracle for USDy price. In production, use Chainlink or Ondo's official oracle.
 * @dev Price is stored with 18 decimals (e.g., 1.05e18 = $1.05 per USDy)
 */
contract MyOracle is Ownable {
    uint256 public price;
    uint256 public lastUpdated;
    uint256 public constant MAX_STALENESS = 1 days;

    event PriceUpdated(uint256 newPrice, uint256 timestamp);

    constructor(uint256 _price) Ownable(msg.sender) {
        price = _price;
        lastUpdated = block.timestamp;
    }

    /**
     * @notice Update the USDy price. Only owner can call.
     */
    function setPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be > 0");
        price = _price;
        lastUpdated = block.timestamp;
        emit PriceUpdated(_price, block.timestamp);
    }

    /**
     * @notice Get price with staleness check.
     */
    function getPrice() external view returns (uint256) {
        require(block.timestamp - lastUpdated <= MAX_STALENESS, "Price is stale");
        return price;
    }

    /**
     * @notice Get price without staleness check (for testing).
     */
    function getPriceUnsafe() external view returns (uint256) {
        return price;
    }
}

