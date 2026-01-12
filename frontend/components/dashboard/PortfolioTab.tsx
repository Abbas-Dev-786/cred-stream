"use client";

import { useMemo } from "react";
import { formatUnits } from "ethers"; // Only import if needing manual formatting, else StatCard handles strings
import { StatCard } from "@/components/StatCard";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, AlertTriangle, Plus } from "lucide-react";

interface PortfolioTabProps {
    ownedNFTs: any[]; // Replace 'any' with proper type if available from thirdweb
    activeLoans: any[];
    isLoading: boolean;
    onFinance: (id: string) => void;
    onRepay: (id: string, amount: string) => void;
    financingId: string | null;
    repayingId: string | null;
    setActiveTab: (tab: string) => void;
}

export function PortfolioTab({
    ownedNFTs,
    activeLoans,
    isLoading,
    onFinance,
    onRepay,
    financingId,
    repayingId,
    setActiveTab,
}: PortfolioTabProps) {

    // --- Metrics Calculation ---
    const metrics = useMemo(() => {
        const totalBorrowed = activeLoans.reduce((acc, loan) => {
            return acc + parseFloat(loan.usdyDisbursed || "0");
        }, 0);

        const activeCount = activeLoans.length;
        const unfundedCount = ownedNFTs?.length || 0;

        // Mock avg risk score (in real app, fetch from subgraph or store on-chain)
        const avgRisk = 85;

        return {
            totalBorrowed: totalBorrowed.toLocaleString("en-US", { style: "currency", currency: "USD" }),
            activeCount: activeCount.toString(),
            unfundedCount: unfundedCount.toString(),
            avgRisk: avgRisk.toString(),
        };
    }, [activeLoans, ownedNFTs]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted/20 rounded-xl" />)}
            </div>
        );
    }

    const hasItems = (ownedNFTs && ownedNFTs.length > 0) || activeLoans.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Metrics Row */}
            {hasItems && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Active Loans"
                        value={metrics.totalBorrowed}
                        icon={TrendingUp}
                        trend={{ value: `${metrics.activeCount} Active`, positive: true }}
                    />
                    <StatCard
                        label="Invoices Ready"
                        value={metrics.unfundedCount}
                        icon={FileText}
                    />
                    <StatCard
                        label="Avg. Portfolio Risk"
                        value={metrics.avgRisk}
                        icon={AlertTriangle}
                        trend={{ value: "Low Risk", positive: true }}
                    />
                </div>
            )}

            {/* Content Area */}
            {!hasItems ? (
                // Empty State
                <div className="text-center py-20 bg-card/30 backdrop-blur-sm rounded-xl border border-dashed border-border/50">
                    <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Invoices Found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                        Upload your first invoice to get started with factoring.
                    </p>
                    <Button onClick={() => setActiveTab("factor")} size="lg" className="shadow-lg shadow-primary/20">
                        <Plus className="h-5 w-5 mr-2" />
                        Factor New Invoice
                    </Button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active Loans Section */}
                    {activeLoans.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Active Loans
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeLoans.map((loan) => (
                                    <InvoiceCard
                                        key={loan.tokenId}
                                        id={loan.tokenId}
                                        amount={`$${parseFloat(loan.repaymentAmount).toLocaleString()}`}
                                        status="active" // In real app, check 'repaid' status field
                                        dueDate="30 Days"
                                        onRepay={() => onRepay(loan.tokenId, loan.repaymentAmount)}
                                        isLoading={repayingId === loan.tokenId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unfunded/Owned NFTs Section */}
                    {ownedNFTs && ownedNFTs.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                Ready to Factor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ownedNFTs.map((nft) => (
                                    <InvoiceCard
                                        key={nft.id.toString()}
                                        id={nft.id.toString()}
                                        amount="$10,000" // Metadata lookup needed in real app
                                        status="unfunded"
                                        dueDate="Unknown" // Metadata lookup needed
                                        onFinance={() => onFinance(nft.id.toString())}
                                        isLoading={financingId === nft.id.toString()}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
