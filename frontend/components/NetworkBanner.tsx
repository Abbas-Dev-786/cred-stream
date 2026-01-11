"use client";

import { useActiveWalletChain, useSwitchActiveWalletChain } from "thirdweb/react";
import { MANTLE_SEPOLIA } from "@/lib/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

export function NetworkBanner() {
    const chain = useActiveWalletChain();
    const switchChain = useSwitchActiveWalletChain();
    const [isSwitching, setIsSwitching] = useState(false);

    // Don't show if no wallet connected or correct network
    if (!chain || chain.id === MANTLE_SEPOLIA.id) {
        return null;
    }

    const handleSwitch = async () => {
        setIsSwitching(true);
        try {
            await switchChain(MANTLE_SEPOLIA);
        } catch (error) {
            console.error("Failed to switch network:", error);
        } finally {
            setIsSwitching(false);
        }
    };

    return (
        <Alert
            variant="destructive"
            className="fixed top-0 left-0 right-0 z-50 rounded-none border-x-0 border-t-0 bg-yellow-500/90 text-yellow-950 backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
        >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between w-full">
                <span className="font-medium">
                    Wrong Network! Please switch to Mantle Sepolia to use CredStream.
                </span>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSwitch}
                    disabled={isSwitching}
                    className="ml-4 bg-yellow-950 text-yellow-100 hover:bg-yellow-900"
                    aria-label="Switch to Mantle Sepolia network"
                >
                    {isSwitching ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Switching...
                        </>
                    ) : (
                        "Switch Network"
                    )}
                </Button>
            </AlertDescription>
        </Alert>
    );
}
