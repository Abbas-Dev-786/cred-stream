"use client";

import { useState } from "react";
import { ethers, formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { client } from "@/lib/thirdweb-client";
import { getContract, prepareContractCall } from "thirdweb";
import {
    useActiveAccount,
    useSendTransaction,
    useReadContract,
    ConnectButton,
} from "thirdweb/react";
import { MANTLE_SEPOLIA, CONTRACTS } from "@/lib/constants";
import {
    Landmark,
    Coins,
    TrendingUp,
    Percent,
    Users,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Wallet,
} from "lucide-react";

export default function VaultPage() {
    const account = useActiveAccount();
    const { mutate: sendTx, isPending } = useSendTransaction();

    // Contracts
    const usdyContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.usdy,
    });

    const vaultContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.vault,
    });

    // --- REAL DATA FETCHING ---
    // 1. User Balance (USDy)
    const { data: userBalanceData } = useReadContract({
        contract: usdyContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account?.address || ethers.ZeroAddress],
    });

    // 2. Vault TVL (USDy Balance of Vault)
    const { data: tvlData } = useReadContract({
        contract: usdyContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [CONTRACTS.vault],
    });

    // Formatted Values
    const userBalance = userBalanceData ? formatUnits(userBalanceData, 18) : "0";
    const tvl = tvlData ? formatUnits(tvlData, 18) : "0";

    // Form state
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "withdrawing" | "success">("idle");
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("deposit");

    // Handle Deposit
    const handleDeposit = async () => {
        if (!account || !amount) return;
        setError(null);
        setStatus("approving");

        try {
            const approveAmount = ethers.parseUnits(amount, 18);

            const approveTx = prepareContractCall({
                contract: usdyContract,
                method: "function approve(address spender, uint256 amount)",
                params: [CONTRACTS.vault, BigInt(approveAmount.toString())],
            });

            sendTx(approveTx, {
                onSuccess: () => {
                    setStatus("depositing");
                    const depositTx = prepareContractCall({
                        contract: vaultContract,
                        method: "function deposit(uint256 amount)",
                        params: [BigInt(approveAmount.toString())],
                    });

                    sendTx(depositTx, {
                        onSuccess: () => {
                            setStatus("success");
                            setAmount("");
                        },
                        onError: (err) => {
                            console.error(err);
                            setError("Deposit failed. Please try again.");
                            setStatus("idle");
                        },
                    });
                },
                onError: (err) => {
                    console.error(err);
                    setError("Approval failed. Please try again.");
                    setStatus("idle");
                },
            });
        } catch (e) {
            console.error(e);
            setError("Transaction failed. Please try again.");
            setStatus("idle");
        }
    };

    // Handle Withdraw
    const handleWithdraw = async () => {
        if (!account || !amount) return;
        setError(null);
        setStatus("withdrawing");

        try {
            const withdrawAmount = ethers.parseUnits(amount, 18);

            const withdrawTx = prepareContractCall({
                contract: vaultContract,
                method: "function withdrawLiquidity(uint256 amount)",
                params: [BigInt(withdrawAmount.toString())],
            });

            sendTx(withdrawTx, {
                onSuccess: () => {
                    setStatus("success");
                    setAmount("");
                },
                onError: (err) => {
                    console.error(err);
                    setError("Withdrawal failed. Please try again.");
                    setStatus("idle");
                },
            });
        } catch (e) {
            console.error(e);
            setError("Transaction failed. Please try again.");
            setStatus("idle");
        }
    };

    const handleReset = () => {
        setStatus("idle");
        setAmount("");
        setError(null);
    };

    const handleMax = () => {
        if (activeTab === "deposit") {
            setAmount(userBalance);
        } else {
            // For simple withdrawal, assuming 1:1 share for now or just max withdrawal allowed
            // In real app, check `userInfo` for deposited amount. 
            // For hackathon MVP, just using a large number logic or user input
            setAmount("1000"); // Ideally fetch user deposited amount here
        }
    };

    if (!account) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="bg-card/50 backdrop-blur-md border-border/50 max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                            <Landmark className="h-8 w-8 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                            Connect Your Wallet
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Connect your wallet to access the Liquidity Vault.
                        </p>
                        <ConnectButton client={client} chain={MANTLE_SEPOLIA} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6">
                        <TrendingUp className="h-4 w-4" />
                        Earn Passive Yield
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                        Liquidity Vault
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Provide liquidity to fund invoice factoring and earn competitive
                        yields backed by real-world assets.
                    </p>
                </div>

                {/* TVL Hero Stat */}
                <Card className="bg-gradient-to-br from-accent/10 via-card to-primary/10 border-accent/20 mb-8">
                    <CardContent className="p-8 sm:p-12 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                            Total Value Locked
                        </p>
                        <p className="text-5xl sm:text-6xl font-bold text-foreground mb-4">
                            ${Number(tvl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-accent">
                            <TrendingUp className="h-5 w-5" />
                            <span className="text-lg font-medium">8.5% APY</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid sm:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Current APY" value="8.5%" icon={Percent} />
                    <StatCard label="Total Depositors" value="340" icon={Users} />
                    {/* Placeholder for fetching user specific deposit info from contract */}
                    <StatCard label="Your Deposit" value="$0" icon={Wallet} />
                    <StatCard label="Your Share" value="0%" icon={TrendingUp} />
                </div>

                {/* Deposit/Withdraw Card */}
                <Card className="bg-card/50 backdrop-blur-md border-border/50">
                    <CardHeader>
                        <CardTitle>Manage Liquidity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                            </TabsList>

                            {/* Common Form Content */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="amount">Amount</Label>
                                        <span className="text-sm text-muted-foreground">
                                            Wallet Balance: {Number(userBalance).toFixed(2)} USDy
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="bg-muted/50 pr-20 text-lg h-14"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleMax}
                                                className="h-8 text-xs"
                                            >
                                                MAX
                                            </Button>
                                            <span className="text-muted-foreground font-medium">
                                                USDy
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Action</span>
                                        <span className="text-foreground font-medium capitalize">
                                            {activeTab}
                                        </span>
                                    </div>
                                    {activeTab === "deposit" && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Est. Yearly Earning</span>
                                            <span className="text-accent font-medium">
                                                {amount ? `$${(parseFloat(amount) * 0.085).toFixed(2)}` : "$0.00"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <TabsContent value="deposit">
                                    {status === "success" ? (
                                        <Button onClick={handleReset} className="w-full h-14 text-lg" variant="outline">
                                            <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                                            Deposit Successful!
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleDeposit}
                                            disabled={!amount || isPending || status !== "idle"}
                                            className="w-full h-14 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                                        >
                                            {status === "approving" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    Approving...
                                                </>
                                            ) : status === "depositing" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    Depositing...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowDownToLine className="h-5 w-5 mr-2" />
                                                    Approve & Deposit
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </TabsContent>

                                <TabsContent value="withdraw">
                                    {status === "success" ? (
                                        <Button onClick={handleReset} className="w-full h-14 text-lg" variant="outline">
                                            <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                                            Withdrawal Successful!
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleWithdraw}
                                            disabled={!amount || isPending || status !== "idle"}
                                            className="w-full h-14 text-lg"
                                            variant="secondary"
                                        >
                                            {status === "withdrawing" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    Withdrawing...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowUpFromLine className="h-5 w-5 mr-2" />
                                                    Withdraw Liquidity
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
