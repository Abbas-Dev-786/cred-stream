// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyVerifier
 * @notice Mock ZK Verifier for demo/hackathon purposes.
 * 
 * PRODUCTION ROADMAP:
 * 1. Create Circom circuit for GSTIN verification
 * 2. Generate proving/verification keys using snarkjs
 * 3. Export Solidity verifier using snarkjs export solidityverifier
 * 4. Replace this contract with the generated Groth16Verifier
 * 
 * @dev In demo mode, owner can toggle verification on/off.
 */
contract MyVerifier is Ownable {
    bool public demoMode;

    event DemoModeToggled(bool enabled);

    constructor() Ownable(msg.sender) {
        demoMode = true; // Start in demo mode (always passes)
    }

    /**
     * @notice Toggle demo mode. When enabled, all proofs pass.
     */
    function setDemoMode(bool _enabled) external onlyOwner {
        demoMode = _enabled;
        emit DemoModeToggled(_enabled);
    }

    /**
     * @notice Verify a ZK proof. In demo mode, always returns true.
     * @dev In production, this would verify a Groth16 proof.
     */
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[] memory
    ) external view returns (bool) {
        // In demo mode, always pass for testing
        if (demoMode) {
            return true;
        }
        
        // In production mode, this would contain actual ZK verification
        // For now, reject all proofs in production mode (placeholder)
        return false;
    }
}

