// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MyERC20
 * @notice Mock USDy token for testing. In production, use Ondo's official USDy.
 */
contract MyERC20 is ERC20 {
    constructor() ERC20("Mock USDy", "mUSDy") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
