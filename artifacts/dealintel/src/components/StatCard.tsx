import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accent?: "amber" | "green" | "blue";
}) {
  const glow = accent === "green" ? "stat-glow-green" : accent === "blue" ? "stat-glow-blue" : "stat-glow";
  const iconColor = accent === "green" ? "text-green-400" : accent === "blue" ? "text-blue-400" : "text-primary";
  const iconBg = accent === "green" ? "bg-green-400/10" : accent === "blue" ? "bg-blue-400/10" : "bg-primary/10";

  return (
    <Card className={`p-4 ${glow} border-card-border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}
