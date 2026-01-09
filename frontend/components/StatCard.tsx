import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        positive: boolean;
    };
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                        {trend && (
                            <p
                                className={`text-sm mt-1 ${trend.positive ? "text-primary" : "text-destructive"
                                    }`}
                            >
                                {trend.positive ? "↑" : "↓"} {trend.value}
                            </p>
                        )}
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
