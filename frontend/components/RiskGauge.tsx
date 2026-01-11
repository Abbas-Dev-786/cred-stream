"use client";

import { cn } from "@/lib/utils";

interface RiskGaugeProps {
    score: number;
    className?: string;
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
    // Determine color based on score
    const getColor = () => {
        if (score >= 80) return { bg: "bg-green-500", text: "text-green-600", label: "Low Risk" };
        if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-600", label: "Medium Risk" };
        return { bg: "bg-red-500", text: "text-red-600", label: "High Risk" };
    };

    const { bg, text, label } = getColor();

    return (
        <div
            className={cn("flex flex-col items-center gap-2", className)}
            role="meter"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Risk score: ${score} out of 100, ${label}`}
        >
            {/* Gauge Bar */}
            <div className="w-full max-w-xs">
                <div
                    className="h-3 bg-muted rounded-full overflow-hidden"
                    title={`Risk Score: ${score}/100 - ${label}`}
                >
                    <div
                        className={cn("h-full rounded-full transition-all duration-500 ease-out", bg)}
                        style={{ width: `${score}%` }}
                    />
                </div>

                {/* Scale markers */}
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>High Risk</span>
                    <span>Medium</span>
                    <span>Low Risk</span>
                    <span>100</span>
                </div>
            </div>

            {/* Score Display */}
            <div className={cn("text-3xl font-bold", text)}>
                {score}<span className="text-lg font-normal text-muted-foreground">/100</span>
            </div>

            {/* Label */}
            <span className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
                {label}
            </span>
        </div>
    );
}
