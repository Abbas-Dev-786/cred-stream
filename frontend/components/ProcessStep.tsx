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
        <div className={`flex items-center gap-3 w-full ${status === 'active' ? 'opacity-100' : 'opacity-70'} transition-opacity`}>
            {/* Step indicator */}
            <div className="relative flex items-center">
                <div
                    className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${status === "complete"
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : status === "active"
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                                : "bg-muted text-muted-foreground"
                        }`}
                >
                    {status === "complete" ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : status === "active" ? (
                        <Icon className="h-5 w-5" />
                    ) : (
                        <Icon className="h-5 w-5" />
                    )}
                </div>
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-medium truncate transition-colors ${status === "idle" ? "text-muted-foreground" : "text-foreground"
                        }`}
                >
                    {label}
                </p>
                {status === "active" && (
                    <p className="text-xs text-primary animate-pulse">In Progress</p>
                )}
                {status === "complete" && (
                    <p className="text-xs text-primary font-medium">Completed</p>
                )}
            </div>

            {/* Connector line (Horizontal only for wizard context) */}
            {!isLast && (
                <div className={`hidden sm:block h-0.5 flex-1 mx-2 rounded-full transition-colors duration-500 ${status === "complete" ? "bg-primary" : "bg-muted"
                    }`} />
            )}
        </div>
    );
}
