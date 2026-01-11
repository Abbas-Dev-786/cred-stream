"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2 } from "lucide-react";

interface UploadProgressProps {
    progress: number;
    onCancel: () => void;
    isUploading: boolean;
}

export function UploadProgress({ progress, onCancel, isUploading }: UploadProgressProps) {
    if (!isUploading) return null;

    return (
        <div
            className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${progress}%`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium">Uploading to IPFS...</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                    aria-label="Cancel upload"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
                <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pinning to IPFS...
                </span>
            </div>
        </div>
    );
}
