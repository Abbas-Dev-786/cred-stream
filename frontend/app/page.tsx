"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/thirdweb-client";

// Thirdweb Imports
import { getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction, ConnectButton } from "thirdweb/react";
import { MANTLE_SEPOLIA, CONTRACTS } from "@/lib/constants";


export default function Dashboard() {
    const account = useActiveAccount();
    const { mutate: sendTx, isPending: isMinting } = useSendTransaction();

    // State
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState("IDLE");
    const [ipfsUri, setIpfsUri] = useState("");
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [signature, setSignature] = useState("");
    const [principal, setPrincipal] = useState("10000");
    const [buyer, setBuyer] = useState("0x0000000000000000000000000000000000000000");

    // 1. Upload
    const handleUpload = async () => {
        if (!file) return;
        setStatus("UPLOADING");
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/api/upload-invoice", { method: "POST", body: formData });
            const data = await res.json();
            if (data.daUri) {
                setIpfsUri(data.daUri);
                setStatus("IDLE");
            }
        } catch (e) {
            console.error(e);
            setStatus("IDLE");
        }
    };

    // 2. Analyze
    const handleAnalyze = async () => {
        if (!ipfsUri) return;
        setStatus("ANALYZING");
        try {
            const res = await fetch("/api/risk-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplier: account?.address,
                    principal: ethers.parseUnits(principal, 18).toString(),
                    buyer: buyer,
                    invoiceText: "INVOICE DATA",
                }),
            });
            const data = await res.json();
            if (data.approved) {
                setRiskScore(data.riskScore);
                setSignature(data.signature);
                setStatus("IDLE");
            }
        } catch (e) {
            console.error(e);
            setStatus("IDLE");
        }
    };

    // 3. Mint via Thirdweb
    const handleMint = async () => {
        if (!account) return;

        // Connect to Factory Contract
        const factoryContract = getContract({
            client,
            chain: MANTLE_SEPOLIA,
            address: CONTRACTS.factory,
        });

        // Prepare Transaction
        const gstHash = ethers.id("GST_VERIFIED_PROOF_MOCK") as `0x${string}`; // Mock for demo
        const transaction = prepareContractCall({
            contract: factoryContract,
            method:
                "function mintVerifiedInvoice(address to, string daUri, uint256 principal, uint256 repayment, uint256 dueDate, address buyer, bytes32 gstHash, bytes aiSignature)",
            params: [
                account.address,
                ipfsUri,
                BigInt(ethers.parseUnits(principal, 18).toString()),
                BigInt(ethers.parseUnits(principal, 18).toString()),
                BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
                buyer,
                gstHash,
                signature as `0x${string}`
            ],
        });

        // Send
        sendTx(transaction);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">CredStream</h1>
                    {/* Thirdweb Connect Button handles everything! */}
                    <ConnectButton client={client} chain={MANTLE_SEPOLIA} />
                </div>

                {/* ... (Keep your existing UI Cards here, just update the buttons to call handleMint) ... */}
                <Button onClick={handleMint} disabled={isMinting}>
                    {isMinting ? "Minting..." : "Mint RWA"}
                </Button>
            </div>
        </div>
    );
}