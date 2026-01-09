"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { ProcessStep } from "@/components/ProcessStep";
import { InvoiceCard } from "@/components/InvoiceCard";
import { client } from "@/lib/thirdweb-client";
import { getContract, prepareContractCall } from "thirdweb";
import {
    useActiveAccount,
    useSendTransaction,
    ConnectButton,
} from "thirdweb/react";
import { MANTLE_SEPOLIA, CONTRACTS } from "@/lib/constants";
import {
    Upload,
    Brain,
    Coins,
    FileText,
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    X,
} from "lucide-react";

// Dummy invoice data for portfolio display
const dummyInvoices = [
    { id: "1001", amount: "5,000", status: "active" as const, dueDate: "Feb 15, 2026" },
    { id: "1002", amount: "12,500", status: "active" as const, dueDate: "Mar 01, 2026" },
    { id: "1003", amount: "3,200", status: "repaid" as const, dueDate: "Jan 10, 2026" },
];

type ProcessStatus = "idle" | "uploading" | "analyzing" | "minting" | "complete";

export default function DashboardPage() {
    const account = useActiveAccount();
    const { mutate: sendTx, isPending: isMinting } = useSendTransaction();

    // Form state
    const [file, setFile] = useState<File | null>(null);
    const [principal, setPrincipal] = useState("10000");
    const [buyer, setBuyer] = useState("");

    // Process state
    const [status, setStatus] = useState<ProcessStatus>("idle");
    const [ipfsUri, setIpfsUri] = useState("");
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [signature, setSignature] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    // Truncate address for display
    const truncateAddress = (address: string) =>
        `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Get step status based on current process status
    const getStepStatus = (step: "upload" | "analyze" | "mint") => {
        const statusMap: Record<ProcessStatus, Record<string, "idle" | "active" | "complete">> = {
            idle: { upload: "idle", analyze: "idle", mint: "idle" },
            uploading: { upload: "active", analyze: "idle", mint: "idle" },
            analyzing: { upload: "complete", analyze: "active", mint: "idle" },
            minting: { upload: "complete", analyze: "complete", mint: "active" },
            complete: { upload: "complete", analyze: "complete", mint: "complete" },
        };
        return statusMap[status][step];
    };

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
            setError(null);
        } else {
            setError("Please upload a PDF file");
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Upload invoice to IPFS
    const handleUpload = async () => {
        if (!file) return;
        setStatus("uploading");
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload-invoice", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.daUri) {
                setIpfsUri(data.daUri);
                // Auto-proceed to analysis
                await handleAnalyze(data.daUri);
            } else {
                throw new Error("Upload failed");
            }
        } catch (e) {
            console.error(e);
            setError("Failed to upload invoice. Please try again.");
            setStatus("idle");
        }
    };

    // Analyze risk via AI
    const handleAnalyze = async (uri?: string) => {
        setStatus("analyzing");

        try {
            const res = await fetch("/api/risk-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplier: account?.address,
                    principal: ethers.parseUnits(principal, 18).toString(),
                    buyer: buyer || "0x0000000000000000000000000000000000000000",
                    invoiceText: "INVOICE DATA FROM PDF",
                }),
            });

            const data = await res.json();

            if (data.approved) {
                setRiskScore(data.riskScore);
                setSignature(data.signature);
                setStatus("idle"); // Ready to mint
            } else {
                setError(`Invoice rejected: ${data.reason || "Risk too high"}`);
                setStatus("idle");
            }
        } catch (e) {
            console.error(e);
            setError("Risk analysis failed. Please try again.");
            setStatus("idle");
        }
    };

    // Mint invoice as RWA NFT
    const handleMint = async () => {
        if (!account || !signature) return;
        setStatus("minting");
        setError(null);

        try {
            const factoryContract = getContract({
                client,
                chain: MANTLE_SEPOLIA,
                address: CONTRACTS.factory,
            });

            const gstHash = ethers.id("GST_VERIFIED_PROOF_MOCK") as `0x${string}`;

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
                    buyer || "0x0000000000000000000000000000000000000000",
                    gstHash,
                    signature as `0x${string}`,
                ],
            });

            sendTx(transaction, {
                onSuccess: () => {
                    setStatus("complete");
                },
                onError: (err) => {
                    console.error(err);
                    setError("Minting failed. Please try again.");
                    setStatus("idle");
                },
            });
        } catch (e) {
            console.error(e);
            setError("Failed to prepare transaction.");
            setStatus("idle");
        }
    };

    // Reset the form
    const handleReset = () => {
        setFile(null);
        setPrincipal("10000");
        setBuyer("");
        setStatus("idle");
        setIpfsUri("");
        setRiskScore(null);
        setSignature("");
        setError(null);
    };

    // Risk score color
    const getRiskColor = (score: number) => {
        if (score >= 80) return "text-primary bg-primary/10 border-primary/30";
        if (score >= 60) return "text-accent bg-accent/10 border-accent/30";
        return "text-destructive bg-destructive/10 border-destructive/30";
    };

    const getRiskLabel = (score: number) => {
        if (score >= 80) return "Low Risk";
        if (score >= 60) return "Medium Risk";
        return "High Risk";
    };

    if (!account) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="bg-card/50 backdrop-blur-md border-border/50 max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                            Connect Your Wallet
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Connect your wallet to access the supplier dashboard and start
                            factoring invoices.
                        </p>
                        <ConnectButton client={client} chain={MANTLE_SEPOLIA} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome back,{" "}
                        <span className="text-primary">
                            {truncateAddress(account.address)}
                        </span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Factor your invoices and manage your portfolio
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Left Column - Factor Invoice */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="bg-card/50 backdrop-blur-md border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Factor New Invoice
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* File Upload Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                                            ? "border-primary bg-primary/5"
                                            : file
                                                ? "border-primary/50 bg-primary/5"
                                                : "border-border hover:border-muted-foreground"
                                        }`}
                                >
                                    {file ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <FileText className="h-8 w-8 text-primary" />
                                            <div className="text-left">
                                                <p className="font-medium text-foreground">
                                                    {file.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setFile(null)}
                                                className="ml-2"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-foreground font-medium">
                                                Drag & drop your invoice PDF
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                or click to browse
                                            </p>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setFile(f);
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Input Fields */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="principal">Principal Amount (USD)</Label>
                                        <Input
                                            id="principal"
                                            type="number"
                                            value={principal}
                                            onChange={(e) => setPrincipal(e.target.value)}
                                            placeholder="10000"
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="buyer">Buyer Address (Optional)</Label>
                                        <Input
                                            id="buyer"
                                            value={buyer}
                                            onChange={(e) => setBuyer(e.target.value)}
                                            placeholder="0x..."
                                            className="bg-muted/50"
                                        />
                                    </div>
                                </div>

                                {/* Process Visualizer */}
                                <div className="bg-muted/30 rounded-xl p-6 space-y-6">
                                    <ProcessStep
                                        step={1}
                                        label="Upload to IPFS"
                                        icon={Upload}
                                        status={getStepStatus("upload")}
                                    />
                                    <ProcessStep
                                        step={2}
                                        label="AI Risk Analysis"
                                        icon={Brain}
                                        status={getStepStatus("analyze")}
                                    />
                                    <ProcessStep
                                        step={3}
                                        label="Mint RWA NFT"
                                        icon={Coins}
                                        status={getStepStatus("mint")}
                                        isLast
                                    />
                                </div>

                                {/* Risk Badge */}
                                {riskScore !== null && (
                                    <div className="flex items-center justify-center">
                                        <Badge
                                            variant="outline"
                                            className={`text-lg px-4 py-2 ${getRiskColor(riskScore)}`}
                                        >
                                            <CheckCircle2 className="h-5 w-5 mr-2" />
                                            {riskScore}/100 - {getRiskLabel(riskScore)}
                                        </Badge>
                                    </div>
                                )}

                                {/* Error Display */}
                                {error && (
                                    <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    {status === "complete" ? (
                                        <Button onClick={handleReset} className="flex-1" size="lg">
                                            <CheckCircle2 className="h-5 w-5 mr-2" />
                                            Invoice Minted! Factor Another
                                        </Button>
                                    ) : !signature ? (
                                        <Button
                                            onClick={handleUpload}
                                            disabled={!file || status !== "idle"}
                                            className="flex-1"
                                            size="lg"
                                        >
                                            {status === "uploading" || status === "analyzing" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    {status === "uploading"
                                                        ? "Uploading..."
                                                        : "Analyzing..."}
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-5 w-5 mr-2" />
                                                    Upload & Analyze
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleMint}
                                            disabled={isMinting || status === "minting"}
                                            className="flex-1"
                                            size="lg"
                                        >
                                            {isMinting || status === "minting" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    Minting...
                                                </>
                                            ) : (
                                                <>
                                                    <Coins className="h-5 w-5 mr-2" />
                                                    Mint & Borrow
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Portfolio */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                label="Total Borrowed"
                                value="$17,500"
                                icon={DollarSign}
                                trend={{ value: "+12%", positive: true }}
                            />
                            <StatCard
                                label="Active Invoices"
                                value="2"
                                icon={TrendingUp}
                            />
                        </div>

                        {/* Invoice List */}
                        <Card className="bg-card/50 backdrop-blur-md border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Your Portfolio</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {dummyInvoices.map((invoice) => (
                                    <InvoiceCard
                                        key={invoice.id}
                                        id={invoice.id}
                                        amount={invoice.amount}
                                        status={invoice.status}
                                        dueDate={invoice.dueDate}
                                        onRepay={
                                            invoice.status === "active"
                                                ? () => console.log("Repay", invoice.id)
                                                : undefined
                                        }
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
