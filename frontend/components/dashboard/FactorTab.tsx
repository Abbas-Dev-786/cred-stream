"use client";

import { useState, useRef, useCallback } from "react";
import { ethers, formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadProgress } from "@/components/UploadProgress";
import { TransactionStepper } from "@/components/TransactionStepper";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { RiskGauge } from "@/components/RiskGauge";
import { ProcessStep } from "@/components/ProcessStep";
import { toast } from "sonner";
import {
    Upload,
    Brain,
    Coins,
    FileText,
    CheckCircle2,
    Loader2,
    X,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import { prepareContractCall, estimateGas, ThirdwebContract } from "thirdweb";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { CONTRACTS } from "@/lib/constants";

type ProcessStatus = "idle" | "uploading" | "analyzing" | "minting" | "complete";

interface FactorTabProps {
    factoryContract: ThirdwebContract;
    nftContract: ThirdwebContract;
}

export function FactorTab({ factoryContract, nftContract }: FactorTabProps) {
    const account = useActiveAccount();
    const { mutate: sendTx } = useSendTransaction();

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
    const [txHash, setTxHash] = useState<string | null>(null);
    const [usedFallback, setUsedFallback] = useState(false);

    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

    // Transaction Flow State
    const [txStep, setTxStep] = useState<"pending" | "current" | "complete">("pending");
    const [gasEstimate, setGasEstimate] = useState<string | null>(null);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

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

    // Upload invoice to IPFS
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
                        reject(new Error("Upload failed"));
                    }
                });

                xhr.addEventListener("error", () => reject(new Error("Network error")));
                xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
                xhr.open("POST", "/api/upload-invoice");
                xhr.send(formData);
            });

            const data = await promise;

            if (data.daUri) {
                setIpfsUri(data.daUri);
                // toast.success("Uploaded to IPFS", { description: "Applying AI Analysis..." });
                await handleAnalyze(data.daUri);
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (e: any) {
            if (e.message !== "Upload cancelled") {
                console.error(e);
                setError(e.message || "Upload failed");
                toast.error("Upload Failed");
            }
            setStatus("idle");
        } finally {
            uploadXhrRef.current = null;
        }
    };

    const handleCancelUpload = () => {
        if (uploadXhrRef.current) uploadXhrRef.current.abort();
    };

    // Analyze risk
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
                toast.success("Risk Analysis Complete", { description: `Score: ${data.riskScore}/100` });
            } else {
                const reason = data.reason || "Risk too high";
                setError(`Invoice rejected: ${reason}`);
                toast.error("Invoice Rejected", { description: reason });
                setStatus("idle");
            }
        } catch (e) {
            setError("Analysis failed");
            setStatus("idle");
        }
    };

    // Mint NFT
    const handleMint = async () => {
        if (!account || !signature) return;
        setStatus("minting");
        setError(null);
        setTxStep("current");
        setGasEstimate(null);

        try {
            const transaction = prepareContractCall({
                contract: factoryContract,
                method: "function mintVerifiedInvoice(address to, string daUri, uint256 principal, uint256 repayment, uint256 dueDate, address buyer, bytes32 gstHash, bytes aiSignature)",
                params: [
                    account.address as `0x${string}`,
                    ipfsUri || "mantle-da://placeholder",
                    ethers.parseUnits(principal, 18),
                    ethers.parseUnits(principal, 18),
                    BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
                    (buyer || "0x0000000000000000000000000000000000000000") as `0x${string}`,
                    ethers.keccak256(ethers.toUtf8Bytes("GST_HASH_PLACEHOLDER")) as `0x${string}`,
                    signature as `0x${string}`,
                ],
            });

            try {
                const gasWei = await estimateGas({ transaction });
                const gasEth = formatUnits(gasWei, 18);
                setGasEstimate(`${parseFloat(gasEth).toFixed(6)} MNT`);
            } catch (err) {
                console.warn("Gas estimate failed", err);
            }

            sendTx(transaction, {
                onSuccess: (result) => {
                    setStatus("complete");
                    setTxStep("complete");
                    if (result?.transactionHash) setTxHash(result.transactionHash);
                    toast.success("Invoice Minted Successfully!");
                },
                onError: (err: any) => {
                    console.error(err);
                    const msg = err.message?.includes("execution reverted")
                        ? "Transaction reverted. Check inputs."
                        : "Minting failed.";
                    setError(msg);
                    toast.error(msg);
                    setStatus("idle");
                    setTxStep("pending");
                },
            });
        } catch (e) {
            setError("Failed to prepare transaction");
            setStatus("idle");
            setTxStep("pending");
        }
    };

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

    const getStepStatus = (step: "upload" | "analyze" | "mint") => {
        const map: Record<ProcessStatus, Record<string, "idle" | "active" | "complete">> = {
            idle: { upload: "idle", analyze: "idle", mint: "idle" },
            uploading: { upload: "active", analyze: "idle", mint: "idle" },
            analyzing: { upload: "complete", analyze: "active", mint: "idle" },
            minting: { upload: "complete", analyze: "complete", mint: "active" },
            complete: { upload: "complete", analyze: "complete", mint: "complete" },
        };
        return map[status][step];
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Steps Header */}
            <div className="grid grid-cols-3 gap-4">
                <ProcessStep step={1} label="Upload Invoice" icon={Upload} status={getStepStatus("upload")} />
                <ProcessStep step={2} label="AI Analysis" icon={Brain} status={getStepStatus("analyze")} />
                <ProcessStep step={3} label="Mint Token" icon={Coins} status={getStepStatus("mint")} isLast />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-lg">
                        <CardHeader>
                            <CardTitle>Invoice Details</CardTitle>
                            <CardDescription>Upload your invoice and set financing terms.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Upload Area */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                                    ${isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"}
                                    ${file ? "bg-primary/5 border-primary/60" : ""}
                                `}
                            >
                                {file ? (
                                    <div className="flex items-center justify-between p-2">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-background/80 rounded-lg shadow-sm ring-1 ring-border/50">
                                                <FileText className="h-8 w-8 text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-foreground">{file.name}</p>
                                                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="hover:bg-destructive/10 hover:text-destructive">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 py-4">
                                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-foreground">Drag & drop invoice PDF</p>
                                            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) setFile(f);
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Inputs */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="principal">Principal Amount (USD)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                        <Input
                                            id="principal"
                                            type="number"
                                            value={principal}
                                            onChange={(e) => setPrincipal(e.target.value)}
                                            className="pl-7 bg-background/50"
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="buyer">Buyer Address (Optional)</Label>
                                    <Input
                                        id="buyer"
                                        value={buyer}
                                        onChange={(e) => setBuyer(e.target.value)}
                                        placeholder="0x..."
                                        className="bg-background/50"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            {error && (
                                <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <UploadProgress
                                progress={uploadProgress}
                                isUploading={status === "uploading"}
                                onCancel={handleCancelUpload}
                            />

                            {status === "complete" ? (
                                <Button onClick={handleReset} className="w-full h-12 text-lg" size="lg">
                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                    Mint Another Invoice
                                </Button>
                            ) : !signature ? (
                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || status !== "idle"}
                                    className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                                    size="lg"
                                >
                                    {status === "uploading" || status === "analyzing" ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            {status === "uploading" ? "Uploading..." : "Analyzing Risk..."}
                                        </>
                                    ) : (
                                        <>
                                            Analyze & Mint <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <TransactionStepper
                                        steps={[
                                            { id: "sign", label: "Sign & Approve", status: txStep === "complete" ? "complete" : "current" },
                                            { id: "mint", label: "Mint NFT", status: txStep === "complete" ? "complete" : txStep === "current" ? "current" : "pending" },
                                            { id: "confirm", label: "Confirmation", status: txStep === "complete" ? "complete" : "pending" },
                                        ]}
                                    />
                                    {gasEstimate && status === "minting" && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            Est. Gas: <span className="font-mono text-primary">{gasEstimate}</span>
                                        </p>
                                    )}
                                    {status === "minting" && (
                                        <Button disabled className="w-full">
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Minting in progress...
                                        </Button>
                                    )}
                                    {status !== "minting" && txStep !== "complete" && (
                                        <Button onClick={handleMint} className="w-full h-12 text-lg" size="lg">
                                            Proceed to Mint
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Analysis Results */}
                <div className="space-y-6">
                    {/* Analysis Skeleton or Result */}
                    {status === "analyzing" ? (
                        <AnalysisSkeleton />
                    ) : (
                        <Card className={`border-border/50 bg-card/60 backdrop-blur-xl h-full transition-all duration-500 ${riskScore !== null ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale'}`}>
                            <CardHeader>
                                <CardTitle>Risk Assessment</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
                                {riskScore !== null ? (
                                    <>
                                        <RiskGauge score={riskScore} />
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-bold">
                                                {riskScore >= 80 ? "Low Risk" : riskScore >= 60 ? "Medium Risk" : "High Risk"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground px-4">
                                                AI Analysis confirms this invoice is suitable for financing based on supplier history and document integrity.
                                            </p>
                                        </div>
                                        {usedFallback && (
                                            <Alert className="bg-yellow-500/10 border-yellow-500/20">
                                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                                <AlertDescription className="text-yellow-500 text-xs">
                                                    AI service unavailable – used fallback scoring.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-muted-foreground py-12">
                                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>Upload an invoice to view risk analysis.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Transaction Success Card */}
                    {txHash && status === "complete" && (
                        <Card className="bg-primary/5 border-primary/20 overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <p className="font-medium text-sm">Minting Successful</p>
                                </div>
                                <a
                                    href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block font-mono bg-background/50 p-2 rounded border border-border/50"
                                >
                                    {txHash}
                                </a>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
