"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    id: string;
    label: string;
    status: "pending" | "current" | "complete";
}

interface TransactionStepperProps {
    steps: Step[];
    className?: string;
}

export function TransactionStepper({ steps, className }: TransactionStepperProps) {
    return (
        <div className={cn("w-full py-4", className)}>
            <div className="relative flex justify-between">
                {/* Connecting Line */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />

                {steps.map((step, index) => (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-background",
                                step.status === "complete" ? "border-primary bg-primary text-primary-foreground" :
                                    step.status === "current" ? "border-primary animate-pulse" :
                                        "border-muted text-muted-foreground"
                            )}
                        >
                            {step.status === "complete" ? (
                                <Check className="w-4 h-4" />
                            ) : step.status === "current" ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                                <Circle className="w-4 h-4" />
                            )}
                        </div>
                        <span className={cn(
                            "text-xs font-medium transition-colors duration-300",
                            step.status === "pending" ? "text-muted-foreground" : "text-foreground"
                        )}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
