import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, TrendingUp, IndianRupee, Search, Bookmark, GitBranch, Zap,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { MarketplaceStats } from "@/lib/types";

type InvestorDashboard = {
  watchlistCount: number;
  privateDealsCount: number;
  contactRequestsSent: number;
  pipelineCount: number;
  messageThreads: number;
};

export default function Analytics() {
  const { data: market } = useQuery<MarketplaceStats>({
    queryKey: ["dashboard", "marketplace-stats"],
    queryFn: () => api.get("/dashboard/marketplace-stats"),
  });

  const { data: investor } = useQuery<InvestorDashboard>({
    queryKey: ["dashboard", "investor"],
    queryFn: () => api.get("/dashboard/investor"),
  });

  const sectors = market?.byIndustry ?? [];

  return (
    <PortalLayout title="Analytics" subtitle="Market intelligence and deal flow overview">

      {/* Market stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Live Deals" value={market?.totalListings ?? 0} icon={Search} />
        <StatCard label="Total Deal Value" value={market ? formatINR(market.totalDealValue) : "—"} icon={IndianRupee} accent="green" />
        <StatCard label="Avg Deal Size" value={market?.totalListings ? formatINR(Math.round(market.totalDealValue / market.totalListings)) : "—"} icon={BarChart3} />
        <StatCard label="Sectors Active" value={sectors.length} icon={TrendingUp} />
      </div>

      {/* Your activity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Watchlisted" value={investor?.watchlistCount ?? 0} icon={Bookmark} accent="green" />
        <StatCard label="Private Deals" value={investor?.privateDealsCount ?? 0} icon={Zap} />
        <StatCard label="Pipeline Deals" value={investor?.pipelineCount ?? 0} icon={GitBranch} />
        <StatCard label="Contact Requests" value={investor?.contactRequestsSent ?? 0} icon={Search} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Sector breakdown */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-4">Deal Flow by Sector</h3>
          {sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {sectors.map(({ industry, count }: { industry: string; count: number }) => {
                const max = Math.max(...sectors.map((s: { count: number }) => s.count));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={industry}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{industry}</span>
                      <span className="text-xs num text-muted-foreground">{count} deals</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Activity summary */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-4">Your Activity Summary</h3>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: "Deals watchlisted",     value: investor?.watchlistCount ?? 0 },
              { label: "Private deals analyzed", value: investor?.privateDealsCount ?? 0 },
              { label: "Pipeline tracked",       value: investor?.pipelineCount ?? 0 },
              { label: "Contact requests sent",  value: investor?.contactRequestsSent ?? 0 },
              { label: "Active deal threads",    value: investor?.messageThreads ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm num font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </PortalLayout>
  );
}
