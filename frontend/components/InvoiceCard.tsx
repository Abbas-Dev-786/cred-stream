import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, Loader2 } from "lucide-react";

interface InvoiceCardProps {
    id: string;
    amount: string;
    status: "active" | "pending" | "repaid";
    dueDate: string;
    onRepay?: () => void;
    isRepaying?: boolean;
}

export function InvoiceCard({
    id,
    amount,
    status,
    dueDate,
    onRepay,
    isRepaying = false,
}: InvoiceCardProps) {
    const statusColors = {
        active: "bg-primary/10 text-primary border-primary/30",
        pending: "bg-accent/10 text-accent border-accent/30",
        repaid: "bg-muted text-muted-foreground border-muted",
    };

    const statusLabels = {
        active: "Active",
        pending: "Pending",
        repaid: "Repaid",
    };

    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Icon & ID */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">Invoice #{id}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Calendar className="h-3 w-3" />
                                Due: {dueDate}
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-semibold text-foreground">
                            <DollarSign className="h-4 w-4" />
                            {amount}
                        </div>
                        <Badge variant="outline" className={statusColors[status]}>
                            {statusLabels[status]}
                        </Badge>
                    </div>

                    {/* Action */}
                    {status === "active" && onRepay && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRepay}
                            disabled={isRepaying}
                            className="ml-2"
                        >
                            {isRepaying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Repay"
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
