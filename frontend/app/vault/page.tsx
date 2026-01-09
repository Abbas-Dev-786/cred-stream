"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { client } from "@/lib/thirdweb-client";
import { getContract, prepareContractCall } from "thirdweb";
import {
    useActiveAccount,
    useSendTransaction,
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
    Wallet,
} from "lucide-react";

// Mock vault stats
const vaultStats = {
    tvl: "$2,400,000",
    apy: "8.5%",
    totalDepositors: "340",
    yourDeposit: "$0",
    yourShare: "0%",
};

export default function VaultPage() {
    const account = useActiveAccount();
    const { mutate: sendTx, isPending } = useSendTransaction();

    // Form state
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success">("idle");
    const [error, setError] = useState<string | null>(null);

    // Handle deposit
    const handleDeposit = async () => {
        if (!account || !amount) return;
        setError(null);
        setStatus("approving");

        try {
            // First approve USDy spending
            const usdyContract = getContract({
                client,
                chain: MANTLE_SEPOLIA,
                address: CONTRACTS.usdy,
            });

            const approveAmount = ethers.parseUnits(amount, 18);

            const approveTx = prepareContractCall({
                contract: usdyContract,
                method: "function approve(address spender, uint256 amount)",
                params: [CONTRACTS.vault, BigInt(approveAmount.toString())],
            });

            sendTx(approveTx, {
                onSuccess: () => {
                    // Now deposit
                    setStatus("depositing");

                    const vaultContract = getContract({
                        client,
                        chain: MANTLE_SEPOLIA,
                        address: CONTRACTS.vault,
                    });

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

    // Reset after success
    const handleReset = () => {
        setStatus("idle");
        setAmount("");
        setError(null);
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
                            Connect your wallet to deposit USDy and start earning yield.
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
                {/* Hero Header */}
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
                            {vaultStats.tvl}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-accent">
                            <TrendingUp className="h-5 w-5" />
                            <span className="text-lg font-medium">{vaultStats.apy} APY</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid sm:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Current APY"
                        value={vaultStats.apy}
                        icon={Percent}
                    />
                    <StatCard
                        label="Total Depositors"
                        value={vaultStats.totalDepositors}
                        icon={Users}
                    />
                    <StatCard
                        label="Your Deposit"
                        value={vaultStats.yourDeposit}
                        icon={Wallet}
                    />
                    <StatCard
                        label="Your Share"
                        value={vaultStats.yourShare}
                        icon={TrendingUp}
                    />
                </div>

                {/* Deposit Card */}
                <Card className="bg-card/50 backdrop-blur-md border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowDownToLine className="h-5 w-5 text-accent" />
                            Deposit USDy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Amount Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="amount">Amount</Label>
                                <span className="text-sm text-muted-foreground">
                                    Balance: 1,000 USDy
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
                                        onClick={() => setAmount("1000")}
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
                                <span className="text-muted-foreground">Estimated APY</span>
                                <span className="text-foreground font-medium">
                                    {vaultStats.apy}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Estimated Yearly Earning
                                </span>
                                <span className="text-accent font-medium">
                                    {amount
                                        ? `$${(parseFloat(amount) * 0.085).toFixed(2)}`
                                        : "$0.00"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Withdrawal</span>
                                <span className="text-foreground font-medium">
                                    Instant (no lock)
                                </span>
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Action Button */}
                        {status === "success" ? (
                            <Button
                                onClick={handleReset}
                                className="w-full h-14 text-lg"
                                variant="outline"
                            >
                                <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                                Deposit Successful! Deposit More
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
                                        Approving USDy...
                                    </>
                                ) : status === "depositing" ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Depositing...
                                    </>
                                ) : (
                                    <>
                                        <Coins className="h-5 w-5 mr-2" />
                                        Approve & Deposit
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Security Note */}
                        <p className="text-xs text-center text-muted-foreground">
                            Your funds are secured by audited smart contracts on Mantle
                            Network.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
