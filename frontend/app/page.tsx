"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    FileText,
    Shield,
    Zap,
    Database,
    ArrowRight,
    CheckCircle2,
    Upload,
    Brain,
    Coins,
} from "lucide-react";

const stats = [
    { label: "Total Value Locked", value: "$2.4M", suffix: "+" },
    { label: "Invoices Processed", value: "1,200", suffix: "+" },
    { label: "Active Users", value: "340", suffix: "+" },
    { label: "Avg. Processing Time", value: "< 5", suffix: "min" },
];

const features = [
    {
        icon: Brain,
        title: "AI Risk Scoring",
        description:
            "Advanced machine learning models analyze invoice authenticity and buyer creditworthiness in real-time.",
    },
    {
        icon: Database,
        title: "IPFS Storage",
        description:
            "Your invoice documents are securely stored on decentralized infrastructure, ensuring permanence and privacy.",
    },
    {
        icon: Zap,
        title: "Instant Liquidity",
        description:
            "Get USDy stablecoins within minutes of invoice verification. No more waiting 30-90 days for payment.",
    },
    {
        icon: Shield,
        title: "Mantle Network",
        description:
            "Built on Mantle for low fees and fast transactions. Enterprise-grade DeFi infrastructure.",
    },
];

const steps = [
    {
        icon: Upload,
        title: "Upload Invoice",
        description: "Drag & drop your invoice PDF. We store it securely on IPFS.",
    },
    {
        icon: Brain,
        title: "AI Verification",
        description: "Our AI agent analyzes risk and validates your invoice.",
    },
    {
        icon: Coins,
        title: "Receive Funds",
        description: "Mint your invoice as an RWA NFT and borrow USDy instantly.",
    },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background gradient effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                            </span>
                            Live on Mantle Sepolia Testnet
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                            <span className="text-foreground">Unlock Liquidity</span>
                            <br />
                            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                                From Your Invoices
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10">
                            Transform your pending invoices into instant working capital.
                            AI-powered verification, blockchain security, and DeFi liquidity
                            — all in one platform.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/dashboard">
                                <Button size="lg" className="text-lg px-8 h-12 gap-2 group">
                                    Start Borrowing
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                            <Link href="/vault">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="text-lg px-8 h-12 gap-2"
                                >
                                    <Coins className="h-4 w-4" />
                                    Earn Yield
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="border-y border-border/40 bg-muted/30">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl sm:text-4xl font-bold text-foreground">
                                    {stat.value}
                                    <span className="text-primary">{stat.suffix}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                            Why Choose CredStream?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Enterprise-grade invoice factoring powered by cutting-edge
                            technology.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <Card
                                key={index}
                                className="bg-card/50 backdrop-blur-md border-border/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                            >
                                <CardContent className="p-6">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                        <feature.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 sm:py-32 bg-muted/20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                            How It Works
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Get liquidity in three simple steps.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                                )}

                                <Card className="bg-card/50 backdrop-blur-md border-border/50 relative z-10">
                                    <CardContent className="p-8 text-center">
                                        {/* Step number */}
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>

                                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6 mt-2">
                                            <step.icon className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-muted-foreground">{step.description}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card className="bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/20 overflow-hidden relative">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

                        <CardContent className="relative p-8 sm:p-12 lg:p-16 text-center">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                                Ready to Unlock Your Capital?
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                                Join hundreds of businesses already using CredStream to
                                accelerate their cash flow.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/dashboard">
                                    <Button
                                        size="lg"
                                        className="text-lg px-8 h-14 gap-2 group shadow-lg shadow-primary/25"
                                    >
                                        <FileText className="h-5 w-5" />
                                        Factor Your First Invoice
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            </div>

                            {/* Trust indicators */}
                            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    No hidden fees
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Instant verification
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Secure & transparent
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/40 py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-semibold">CredStream</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Built for the Mantle Hackathon 2026 • Powered by AI & RWA
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}