// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for a standard Groth16 Verifier (SnarkJS compatible)
interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view returns (bool);
}

contract ComplianceModule is Ownable {
    IVerifier public immutable gstVerifier;

    // Maps a hash of the GSTIN number to its verification status
    mapping(bytes32 => bool) public isGSTVerified;

    event EntityVerified(bytes32 indexed identityHash, string sourceType);

    constructor(address _gstVerifier) Ownable(msg.sender) {
        gstVerifier = IVerifier(_gstVerifier);
    }

    /**
     * @dev Verifies a ZK proof that the user owns a valid GSTIN without revealing raw tax data.
     * @param a Groth16 proof parameter A
     * @param b Groth16 proof parameter B
     * @param c Groth16 proof parameter C
     * @param pubSignals Public signals. [0] is usually the Hash of the private input (GSTIN).
     */
    function verifyGSTProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory pubSignals
    ) external {
        // 1. Verify the cryptographic proof
        require(
            gstVerifier.verifyProof(a, b, c, pubSignals),
            "Invalid ZK Proof"
        );

        // 2. Extract the Identity Hash (Signal 0)
        bytes32 entityHash = bytes32(pubSignals[0]);

        // 3. Mark as verified
        isGSTVerified[entityHash] = true;

        emit EntityVerified(entityHash, "GST_PORTAL");
    }
}
