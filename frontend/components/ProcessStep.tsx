import { LucideIcon, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ProcessStepProps {
    step: number;
    label: string;
    icon: LucideIcon;
    status: "idle" | "active" | "complete";
    isLast?: boolean;
}

export function ProcessStep({
    step,
    label,
    icon: Icon,
    status,
    isLast = false,
}: ProcessStepProps) {
    return (
        <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="relative flex flex-col items-center">
                <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${status === "complete"
                            ? "bg-primary text-primary-foreground"
                            : status === "active"
                                ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : "bg-muted text-muted-foreground"
                        }`}
                >
                    {status === "complete" ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : status === "active" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Icon className="h-5 w-5" />
                    )}
                </div>

                {/* Connector line */}
                {!isLast && (
                    <div
                        className={`absolute top-10 w-0.5 h-8 transition-colors duration-300 ${status === "complete" ? "bg-primary" : "bg-border"
                            }`}
                    />
                )}
            </div>

            {/* Label */}
            <div className="flex-1">
                <p
                    className={`text-sm font-medium transition-colors ${status === "idle" ? "text-muted-foreground" : "text-foreground"
                        }`}
                >
                    {label}
                </p>
                {status === "active" && (
                    <p className="text-xs text-primary animate-pulse">In progress...</p>
                )}
                {status === "complete" && (
                    <p className="text-xs text-primary">Complete</p>
                )}
            </div>
        </div>
    );
}
