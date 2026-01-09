"use client";

import Link from "next/link";
import { client } from "@/lib/thirdweb-client";
import { ConnectButton } from "thirdweb/react";
import { MANTLE_SEPOLIA } from "@/lib/constants";
import { FileText, Landmark } from "lucide-react";

export function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        CredStream
                    </span>
                </Link>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-1">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                    >
                        <FileText className="h-4 w-4" />
                        Dashboard
                    </Link>
                    <Link
                        href="/vault"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                    >
                        <Landmark className="h-4 w-4" />
                        Vault
                    </Link>
                </nav>

                {/* Connect Button */}
                <div className="flex items-center gap-4">
                    <ConnectButton client={client} chain={MANTLE_SEPOLIA} />
                </div>
            </div>
        </header>
    );
}
