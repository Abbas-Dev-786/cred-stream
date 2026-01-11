"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export function HelpButton() {
    return (
        <Dialog>
            <DialogTrigger
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 hover:scale-105 transition-transform bg-primary text-primary-foreground inline-flex items-center justify-center p-0"
                aria-label="Help & FAQ"
            >
                <HelpCircle className="h-6 w-6" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Help & FAQ</DialogTitle>
                    <DialogDescription>
                        Common questions about CredStream and factoring.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Accordion className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>How do I factor an invoice?</AccordionTrigger>
                            <AccordionContent>
                                Upload your PDF invoice in the Dashboard. Our AI will analyze it and assign a risk score. Once approved, you can mint it as an NFT and borrow against it from the liquidity pool.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>What determines the Risk Score?</AccordionTrigger>
                            <AccordionContent>
                                We analyze the invoice amount, buyer reputation, and document authenticity. Higher scores (80+) mean lower risk and better borrowing terms.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>When do I have to repay?</AccordionTrigger>
                            <AccordionContent>
                                Loans typically have a 30-day term. You can repay at any time through the "My Portfolio" tab. Repaying early releases your collateral (the NFT).
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>What network is this on?</AccordionTrigger>
                            <AccordionContent>
                                CredStream operates on the Mantle Sepolia Testnet. Ensure your wallet is connected to the correct network.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </DialogContent>
        </Dialog>
    );
}
