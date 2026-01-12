"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers, formatUnits } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText,
    Briefcase,
    LayoutDashboard
} from "lucide-react";
import { client } from "@/lib/thirdweb-client";
import { getContract, prepareContractCall } from "thirdweb";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import {
    useActiveAccount,
    useSendTransaction,
    useReadContract,
    ConnectButton,
} from "thirdweb/react";
import { MANTLE_SEPOLIA, CONTRACTS } from "@/lib/constants";

// New Components
import { FactorTab } from "@/components/dashboard/FactorTab";
import { PortfolioTab } from "@/components/dashboard/PortfolioTab";

export default function DashboardPage() {
    const account = useActiveAccount();
    const { mutate: sendTx } = useSendTransaction();
    const [activeTab, setActiveTab] = useState("factor");

    // Contracts
    const nftContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.nft,
    });

    const factoryContract = getContract({
        client,
        chain: MANTLE_SEPOLIA,
        address: CONTRACTS.factory,
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

    // --- FETCH USER INVOICES ---
    const { data: ownedNFTs, refetch: refetchNFTs } = useReadContract(
        getOwnedNFTs,
        {
            contract: nftContract,
            owner: account?.address || "",
        }
    );

    // --- FETCH ACTIVE LOANS ---
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(false);

    const fetchActiveLoans = useCallback(async () => {
        if (!account?.address) {
            setActiveLoans([]);
            return;
        }

        setIsLoadingLoans(true);
        try {
            const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz");
            const vaultInterface = new ethers.Interface([
                "event LoanDisbursed(uint256 indexed tokenId, address indexed borrower, uint256 usdyAmount, uint256 usdValue)",
                "function loans(uint256) view returns (address borrower, uint256 usdyDisbursed, uint256 repaymentAmount)"
            ]);

            const vaultAddr = CONTRACTS.vault;
            const borrowerFilter = vaultInterface.encodeFilterTopics("LoanDisbursed", [null, account.address]);

            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 5000);

            const logs = await provider.getLogs({
                address: vaultAddr,
                topics: borrowerFilter,
                fromBlock,
                toBlock: "latest"
            });

            const loansData = [];

            for (const log of logs) {
                const parsed = vaultInterface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed) {
                    const tokenId = parsed.args[0].toString();
                    const contract = new ethers.Contract(vaultAddr, vaultInterface, provider);
                    const loanInfo = await contract.loans(tokenId); // Potential optimization: multicall

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
        } finally {
            setIsLoadingLoans(false);
        }
    }, [account?.address]);

    useEffect(() => {
        fetchActiveLoans();
    }, [fetchActiveLoans]);


    // --- FINANCE LOGIC ---
    const [financingId, setFinancingId] = useState<string | null>(null);
    const handleFinance = async (tokenId: string) => {
        if (!account) return;
        setFinancingId(tokenId);

        try {
            const approveTx = prepareContractCall({
                contract: nftContract,
                method: "function approve(address to, uint256 tokenId)",
                params: [CONTRACTS.vault, BigInt(tokenId)],
            });

            sendTx(approveTx, {
                onSuccess: () => {
                    const financeTx = prepareContractCall({
                        contract: vaultContract,
                        method: "function financeInvoice(uint256 tokenId)",
                        params: [BigInt(tokenId)],
                    });

                    sendTx(financeTx, {
                        onSuccess: () => {
                            setFinancingId(null);
                            refetchNFTs();
                            fetchActiveLoans();
                            setActiveTab("portfolio"); // Switch to portfolio to see loan
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

    // --- REPAY LOGIC ---
    const [repayingId, setRepayingId] = useState<string | null>(null);
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

    const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

    if (!account) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="bg-card/40 backdrop-blur-xl border-border/50 max-w-md w-full shadow-2xl">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto ring-1 ring-primary/20">
                            <Briefcase className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">CredStream</h2>
                            <p className="text-muted-foreground">Connect your wallet to access institutional-grade invoice factoring.</p>
                        </div>
                        <div className="pt-2">
                            <ConnectButton client={client} chain={MANTLE_SEPOLIA} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20">
            {/* Navbar Effect Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            Supplier Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Welcome back, <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{truncateAddress(account.address)}</span>
                        </p>
                    </div>
                </div>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-muted/50 p-1 rounded-xl w-full max-w-md mx-auto grid grid-cols-2">
                        <TabsTrigger value="factor" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Factor Invoice
                        </TabsTrigger>
                        <TabsTrigger value="portfolio" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Briefcase className="h-4 w-4 mr-2" />
                            My Portfolio ({(activeLoans.length + (ownedNFTs?.length || 0))})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="factor" className="focus-visible:outline-none">
                        <FactorTab
                            factoryContract={factoryContract}
                            nftContract={nftContract}
                        />
                    </TabsContent>

                    <TabsContent value="portfolio" className="focus-visible:outline-none">
                        <PortfolioTab
                            ownedNFTs={ownedNFTs ? Array.from(ownedNFTs) : []}
                            activeLoans={activeLoans}
                            isLoading={isLoadingLoans}
                            onFinance={handleFinance}
                            onRepay={handleRepay}
                            financingId={financingId}
                            repayingId={repayingId}
                            setActiveTab={setActiveTab}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
