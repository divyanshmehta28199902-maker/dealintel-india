import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accent?: "primary" | "green" | "blue";
}) {
  const iconColor =
    accent === "green" ? "text-green-400" :
    accent === "blue"  ? "text-primary" :
    "text-primary";
  const iconBg =
    accent === "green" ? "bg-green-400/10" :
    "bg-primary/10";

  return (
    <Card className="p-4 border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className="text-xl font-semibold num mt-1.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}
