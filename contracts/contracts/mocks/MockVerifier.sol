// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVerifier {
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[] memory
    ) external pure returns (bool) {
        return true; // Always passes for testing!
    }
}
