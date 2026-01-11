"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Brain } from "lucide-react";

export function AnalysisSkeleton() {
    return (
        <div
            className="space-y-4 p-6 bg-muted/30 rounded-xl animate-pulse"
            role="status"
            aria-label="Analyzing invoice..."
        >
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                </div>
            </div>

            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
                <Skeleton className="h-3 w-[60%]" />
            </div>

            <div className="flex justify-center">
                <div className="text-sm text-muted-foreground">
                    AI is analyzing your invoice...
                </div>
            </div>
        </div>
    );
}
