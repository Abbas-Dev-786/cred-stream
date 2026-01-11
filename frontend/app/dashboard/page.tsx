"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ethers, formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { ProcessStep } from "@/components/ProcessStep";
import { InvoiceCard } from "@/components/InvoiceCard";
import { RiskGauge } from "@/components/RiskGauge";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadProgress } from "@/components/UploadProgress";
import { TransactionStepper } from "@/components/TransactionStepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { client } from "@/lib/thirdweb-client";
import { getContract, prepareContractCall, estimateGas } from "thirdweb";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import {
    useActiveAccount,
    useSendTransaction,
    useReadContract,
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

type ProcessStatus = "idle" | "uploading" | "analyzing" | "minting" | "complete";

export default function DashboardPage() {
    const account = useActiveAccount();
    const { mutate: sendTx, isPending: isTxPending } = useSendTransaction();

    // Contracts
    const nftContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.nft,
    });

    const vaultContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.vault,
    });

    const usdyContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.usdy,
    });

    // State for active loans (loans where user is borrower, NFT is in Vault)
    const [activeLoans, setActiveLoans] = useState<Array<{
        tokenId: string;
        repaymentAmount: string;
        usdyDisbursed: string;
    }>>([]);

    // --- FETCH USER INVOICES ---
    // Fetch NFTs owned by the user (unfunded invoices)
    const { data: ownedNFTs, isLoading: isLoadingNFTs, refetch: refetchNFTs } = useReadContract(
        getOwnedNFTs,
        {
            contract: nftContract,
            owner: account?.address || "",
        }
    );

    // --- FETCH ACTIVE LOANS (NFTs in Vault where user is borrower) ---
    const [isLoadingLoans, setIsLoadingLoans] = useState(false);

    // Function to fetch active loans by querying the loans mapping
    const fetchActiveLoans = useCallback(async () => {
        if (!account?.address) {
            setActiveLoans([]);
            return;
        }

        setIsLoadingLoans(true);
        try {
            // Create a provider to make direct RPC calls
            const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz");

            // Get recent LoanDisbursed events for this user
            const vaultInterface = new ethers.Interface([
                "event LoanDisbursed(uint256 indexed tokenId, address indexed borrower, uint256 usdyAmount, uint256 usdValue)",
                "function loans(uint256) view returns (address borrower, uint256 usdyDisbursed, uint256 repaymentAmount)"
            ]);

            const vaultAddr = CONTRACTS.vault;
            const borrowerFilter = vaultInterface.encodeFilterTopics("LoanDisbursed", [null, account.address]);

            // Query events from recent blocks (last ~10000 blocks)
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);

            const logs = await provider.getLogs({
                address: vaultAddr,
                topics: borrowerFilter,
                fromBlock,
                toBlock: "latest"
            });

            // Parse events and check if loans are still active
            const loansData: Array<{ tokenId: string; repaymentAmount: string; usdyDisbursed: string }> = [];

            for (const log of logs) {
                const parsed = vaultInterface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed) {
                    const tokenId = parsed.args[0].toString();

                    // Check if loan is still active (borrower != 0x0)
                    const contract = new ethers.Contract(vaultAddr, vaultInterface, provider);
                    const loanInfo = await contract.loans(tokenId);

                    if (loanInfo.borrower !== ethers.ZeroAddress) {
                        loansData.push({
                            tokenId,
                            repaymentAmount: formatUnits(loanInfo.repaymentAmount, 18),
                            usdyDisbursed: formatUnits(loanInfo.usdyDisbursed, 18),
                        });
                    }
                }
            }

            setActiveLoans(loansData);
        } catch (err) {
            console.error("Error fetching active loans:", err);
            setActiveLoans([]);
        } finally {
            setIsLoadingLoans(false);
        }
    }, [account?.address]);

    // Fetch loans on mount and when account changes
    useEffect(() => {
        fetchActiveLoans();
    }, [fetchActiveLoans]);

    // Calculate total borrowed from active loans
    const totalBorrowed = activeLoans.reduce((acc, loan) => {
        return acc + parseFloat(loan.usdyDisbursed || "0");
    }, 0);

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
    const [activeTab, setActiveTab] = useState("factor");

    // Action States
    const [financingId, setFinancingId] = useState<string | null>(null);
    const [repayingId, setRepayingId] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [usedFallback, setUsedFallback] = useState(false);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

    // Transaction Flow State
    const [txStep, setTxStep] = useState<"pending" | "current" | "complete">("pending");
    const [gasEstimate, setGasEstimate] = useState<string | null>(null);

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

    // Upload invoice to IPFS with progress tracking
    const handleUpload = async () => {
        if (!file) return;
        setStatus("uploading");
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const xhr = new XMLHttpRequest();
            uploadXhrRef.current = xhr;

            const promise = new Promise<any>((resolve, reject) => {
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percentComplete);
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            reject(new Error("Invalid response format"));
                        }
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.error || "Upload failed"));
                        } catch (e) {
                            reject(new Error("Upload failed"));
                        }
                    }
                });

                xhr.addEventListener("error", () => {
                    reject(new Error("Network error during upload"));
                });

                xhr.addEventListener("abort", () => {
                    reject(new Error("Upload cancelled"));
                });

                xhr.open("POST", "/api/upload-invoice");
                xhr.send(formData);
            });

            const data = await promise;

            if (data.daUri) {
                setIpfsUri(data.daUri);
                toast.success("Invoice uploaded to IPFS!", {
                    description: `CID: ${data.cid?.slice(0, 20)}...`
                });
                // Auto-proceed to analysis
                await handleAnalyze(data.daUri);
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (e: any) {
            if (e.message === "Upload cancelled") {
                setStatus("idle");
                toast.info("Upload cancelled");
                return;
            }
            console.error(e);
            const errorMsg = e?.message || "Failed to upload invoice. Please try again.";
            setError(errorMsg);
            toast.error("Upload Failed", { description: errorMsg });
            setStatus("idle");
        } finally {
            uploadXhrRef.current = null;
        }
    };

    const handleCancelUpload = () => {
        if (uploadXhrRef.current) {
            uploadXhrRef.current.abort();
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
                setUsedFallback(data.usedFallback || false);
                setStatus("idle"); // Ready to mint

                if (data.usedFallback) {
                    toast.warning("AI service unavailable", {
                        description: "Using heuristic scoring as fallback."
                    });
                } else {
                    toast.success("Risk analysis complete!");
                }
            } else {
                const reason = data.reason || "Risk too high";
                setError(`Invoice rejected: ${reason}`);
                toast.error("Invoice Rejected", { description: reason });
                setStatus("idle");
            }
        } catch (e: any) {
            console.error(e);
            const errorMsg = "Risk analysis failed. Please try again.";
            setError(errorMsg);
            toast.error("Analysis Failed", { description: errorMsg });
            setStatus("idle");
        }
    };

    // Mint invoice as RWA NFT
    const handleMint = async () => {
        if (!account || !signature) return;
        setStatus("minting");
        setError(null);
        setTxStep("current");
        setError(null);
        setGasEstimate(null);

        try {
            // 1. Prepare Transaction
            const transaction = prepareContractCall({
                contract: nftContract,
                method: "function mintInvoice(address to, uint256 principal, uint256 repaymentDate, address buyer, bytes32 gstHash, bytes signature)",
                params: [
                    account.address as `0x${string}`,
                    ethers.parseUnits(principal, 18),
                    BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
                    (buyer || "0x0000000000000000000000000000000000000000") as `0x${string}`,
                    ethers.keccak256(ethers.toUtf8Bytes("GST_HASH_PLACEHOLDER")) as `0x${string}`, // In real app, hash of GST doc
                    signature as `0x${string}`,
                ],
            });

            // 2. Estimate Gas
            try {
                const gasWei = await estimateGas({ transaction });
                const gasEth = formatUnits(gasWei, 18);
                const gasCost = parseFloat(gasEth).toFixed(6);
                setGasEstimate(`${gasCost} MNT`);
                toast.info(`Estimated Gas: ~${gasCost} MNT`);
            } catch (gasError) {
                console.warn("Gas estimation failed:", gasError);
            }

            sendTx(transaction, {
                onSuccess: (result) => {
                    setStatus("complete");
                    setTxStep("complete");
                    // Capture transaction hash for explorer link
                    if (result?.transactionHash) {
                        setTxHash(result.transactionHash);
                    }
                    toast.success("Minting Successful!");
                },
                onError: (err) => {
                    console.error(err);
                    setError("Minting failed. Please try again.");
                    toast.error("Minting Failed");
                    setStatus("idle");
                    setTxStep("pending");
                },
            });
        } catch (e) {
            console.error(e);
            setError("Failed to prepare transaction.");
            setStatus("idle");
            setTxStep("pending");
        }
    };

    // --- FINANCE INVOICE (GET LOAN) ---
    const handleFinance = async (tokenId: string) => {
        if (!account) return;
        setFinancingId(tokenId);

        try {
            // 1. Approve NFT for Vault
            const approveTx = prepareContractCall({
                contract: nftContract,
                method: "function approve(address to, uint256 tokenId)",
                params: [CONTRACTS.vault, BigInt(tokenId)],
            });

            sendTx(approveTx, {
                onSuccess: () => {
                    // 2. Call financeInvoice on Vault
                    const financeTx = prepareContractCall({
                        contract: vaultContract,
                        method: "function financeInvoice(uint256 tokenId)",
                        params: [BigInt(tokenId)],
                    });

                    sendTx(financeTx, {
                        onSuccess: () => {
                            setFinancingId(null);
                            // NFT moves to vault, refresh data
                            refetchNFTs();
                            fetchActiveLoans();
                        },
                        onError: (err) => {
                            console.error(err);
                            setFinancingId(null);
                        }
                    });
                },
                onError: (err) => {
                    console.error(err);
                    setFinancingId(null);
                }
            });
        } catch (e) {
            console.error(e);
            setFinancingId(null);
        }
    };

    // --- REPAYMENT LOGIC ---
    const handleRepay = async (tokenId: string, amount: string) => {
        if (!account) return;
        setRepayingId(tokenId);

        try {
            const repayAmountWei = ethers.parseUnits(amount.replace(/,/g, ''), 18);

            const approveTx = prepareContractCall({
                contract: usdyContract,
                method: "function approve(address spender, uint256 amount)",
                params: [CONTRACTS.vault, BigInt(repayAmountWei.toString())],
            });

            sendTx(approveTx, {
                onSuccess: () => {
                    const repayTx = prepareContractCall({
                        contract: vaultContract,
                        method: "function repayLoan(uint256 tokenId)",
                        params: [BigInt(tokenId)],
                    });

                    sendTx(repayTx, {
                        onSuccess: () => {
                            setRepayingId(null);
                            // Refresh data after repayment
                            fetchActiveLoans();
                            refetchNFTs();
                        },
                        onError: (err) => {
                            console.error(err);
                            setRepayingId(null);
                        }
                    });
                },
                onError: (err) => {
                    console.error(err);
                    setRepayingId(null);
                }
            });
        } catch (e) {
            console.error(e);
            setRepayingId(null);
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
        setTxHash(null);
        setUsedFallback(false);
    };

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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back,{" "}
                        <span className="text-primary">
                            {account ? truncateAddress(account.address) : "User"}
                        </span>
                    </h1>
                    <p className="text-muted-foreground">
                        Factor your invoices and manage your liquidity
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value="factor">Factor Invoice</TabsTrigger>
                        <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
                    </TabsList>

                    <TabsContent value="factor" className="space-y-4">
                        <div className="max-w-2xl mx-auto">
                            <Card className="border-border/50 bg-card/50 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Factor New Invoice
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {/* Drop Zone */}
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`
                                                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                                                ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"}
                                                ${file ? "bg-primary/5 border-primary" : ""}
                                            `}
                                        >
                                            {file ? (
                                                <div className="flex items-center justify-between p-2">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="p-3 bg-background rounded-lg shadow-sm">
                                                            <FileText className="h-8 w-8 text-primary" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-semibold text-foreground">
                                                                {file.name}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                            </p>
                                                        </div>
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

                                        {/* Process Steps */}
                                        <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-6">
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

                                        {/* Analysis Skeleton */}
                                        {status === "analyzing" && (
                                            <AnalysisSkeleton />
                                        )}

                                        {/* AI Fallback Warning */}
                                        {usedFallback && riskScore !== null && (
                                            <Alert className="bg-yellow-500/10 border-yellow-500/30">
                                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                                <AlertDescription className="text-yellow-200">
                                                    AI service unavailable – using heuristic scoring as fallback.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Risk Score Gauge */}
                                        {riskScore !== null && (
                                            <RiskGauge score={riskScore} className="py-4" />
                                        )}

                                        {/* Transaction Hash Display */}
                                        {txHash && status === "complete" && (
                                            <div
                                                className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center"
                                                role="status"
                                                aria-live="polite"
                                            >
                                                <p className="text-sm text-muted-foreground mb-2">Transaction Confirmed!</p>
                                                <a
                                                    href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-sm font-mono break-all"
                                                    aria-label="View transaction on Mantle Explorer"
                                                >
                                                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                                </a>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    View on Mantle Explorer →
                                                </p>
                                            </div>
                                        )}

                                        {/* Error Display */}
                                        {error && (
                                            <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                                <p className="text-sm">{error}</p>
                                            </div>
                                        )}

                                        {/* Upload Progress */}
                                        <UploadProgress
                                            progress={uploadProgress}
                                            isUploading={status === "uploading"}
                                            onCancel={handleCancelUpload}
                                        />

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-3">
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
                                                <>
                                                    {(status === "minting" || txStep === "complete") && (
                                                        <div className="w-full">
                                                            <TransactionStepper
                                                                steps={[
                                                                    { id: "sign", label: "Sign & Approve", status: txStep === "complete" ? "complete" : "current" },
                                                                    { id: "mint", label: "Mint NFT", status: txStep === "complete" ? "complete" : txStep === "current" ? "current" : "pending" },
                                                                    { id: "confirm", label: "Confirmation", status: txStep === "complete" ? "complete" : "pending" },
                                                                ]}
                                                            />
                                                            {gasEstimate && status === "minting" && (
                                                                <div className="text-xs text-center text-muted-foreground mt-2 bg-muted/30 py-1 rounded">
                                                                    ⛽ Est. Gas: <span className="font-mono text-primary">{gasEstimate}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <Button
                                                        onClick={handleMint}
                                                        disabled={isTxPending || status === "minting"}
                                                        className="w-full btn-animate"
                                                        size="lg"
                                                    >
                                                        {isTxPending || status === "minting" ? (
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
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="portfolio" className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Borrowed"
                                value={`$${totalBorrowed.toLocaleString()}`}
                                icon={DollarSign}
                                trend={{ value: "+12%", positive: true }}
                            />
                            <StatCard
                                label="Active Invoices"
                                value={ownedNFTs?.length.toString() || "0"}
                                icon={TrendingUp}
                            />
                        </div>

                        {/* Invoice List */}
                        <Card className="bg-card/50 backdrop-blur-md border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Your Portfolio</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Loading State */}
                                {isLoadingNFTs && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                        Loading invoices...
                                    </div>
                                )}

                                {/* Empty State */}
                                {!isLoadingNFTs && (!ownedNFTs || ownedNFTs.length === 0) && activeLoans.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No active invoices or loans found.
                                    </div>
                                )}

                                {/* User's Unfunded Invoices (Ready to Get Loan) */}
                                {ownedNFTs?.map((nft) => {
                                    // @ts-ignore
                                    const amountStr = nft.metadata?.attributes?.find((a: any) => a.trait_type === "Principal")?.value || "0";
                                    const tokenId = nft.id.toString();

                                    return (
                                        <InvoiceCard
                                            key={tokenId}
                                            id={tokenId}
                                            amount={amountStr}
                                            status="unfunded"
                                            dueDate={new Date().toLocaleDateString()}
                                            // nft={nft} // removed unused prop
                                            onFinance={() => handleFinance(tokenId)}
                                            // onRepay={() => handleRepay(tokenId)} // Not repayable yet
                                            isLoading={financingId === tokenId || repayingId === tokenId}
                                        />
                                    );
                                })}

                                {/* Active Loans from Vault */}
                                {activeLoans.length > 0 && (
                                    <>
                                        <div className="my-4 pt-4 border-t border-border">
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Active Loans</h3>
                                        </div>
                                        {activeLoans.map((loan) => (
                                            <InvoiceCard
                                                key={`loan-${loan.tokenId}`}
                                                id={loan.tokenId.toString()}
                                                amount={formatUnits(loan.repaymentAmount, 18)}
                                                status="active"
                                                dueDate="Due in 30 days"
                                                onFinance={() => { }}
                                                onRepay={() => handleRepay(loan.tokenId.toString(), loan.repaymentAmount.toString())}
                                                isLoading={repayingId === loan.tokenId.toString()}
                                            />
                                        ))}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
