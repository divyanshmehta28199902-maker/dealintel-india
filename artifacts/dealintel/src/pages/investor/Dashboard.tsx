import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search, Bookmark, GitBranch, MessageSquare,
  Zap, TrendingUp, IndianRupee, BarChart3,
  ArrowRight,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { MarketplaceStats, Pipeline } from "@/lib/types";

type InvestorStats = {
  watchlistCount: number;
  privateDealsCount: number;
  contactRequestsSent: number;
  pipelineCount: number;
  messageThreads: number;
};

const STAGE_COLORS: Record<string, string> = {
  interested: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  due_diligence: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  negotiation: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  closed: "bg-green-500/15 text-green-400 border-green-500/30",
};

const STAGE_LABELS: Record<string, string> = {
  interested: "Interested",
  contacted: "Contacted",
  due_diligence: "Due Diligence",
  negotiation: "Negotiation",
  closed: "Closed",
};

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: stats } = useQuery<InvestorStats>({
    queryKey: ["dashboard", "investor"],
    queryFn: () => api.get("/dashboard/investor"),
  });

  const { data: market } = useQuery<MarketplaceStats>({
    queryKey: ["dashboard", "marketplace-stats"],
    queryFn: () => api.get("/dashboard/marketplace-stats"),
  });

  const { data: pipeline } = useQuery<Pipeline[]>({
    queryKey: ["pipeline"],
    queryFn: () => api.get("/pipeline"),
  });

  const active = (pipeline ?? []).filter((p) => p.stage !== "closed");
  const pipelineValue = active.reduce(
    (sum, p) => sum + (p.listing.askingValuation ?? 0),
    0,
  );

  const recentActivity = (pipeline ?? [])
    .flatMap((p) =>
      (p.activityLog ?? []).map((a) => ({
        dealName: p.listing.name ?? "—",
        stage: a.stage,
        ts: a.ts,
        note: a.note,
      })),
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5);

  return (
    <PortalLayout
      title="Dashboard"
      subtitle="Your deal intelligence overview"
    >
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Live Deals" value={market?.totalListings ?? 0} icon={Search} />
        <StatCard label="Pipeline Deals" value={stats?.pipelineCount ?? 0} icon={GitBranch} />
        <StatCard
          label="Pipeline Value"
          value={pipelineValue > 0 ? formatINR(pipelineValue) : "—"}
          icon={IndianRupee}
          accent="green"
        />
        <StatCard label="Watchlisted" value={stats?.watchlistCount ?? 0} icon={Bookmark} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        {/* Pipeline snapshot */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-5 border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" /> Pipeline
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => navigate("/investor/pipeline")}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {(pipeline?.length ?? 0) === 0 ? (
              <div className="text-center py-6">
                <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No deals tracked yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-7 text-xs"
                  onClick={() => navigate("/investor/marketplace")}
                >
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {(pipeline ?? []).slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
                    onClick={() => navigate("/investor/pipeline")}
                  >
                    <div>
                      <p className="text-sm font-medium">{p.listing.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.listing.industry ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.listing.askingValuation && (
                        <span className="text-xs num text-primary hidden sm:block">
                          {formatINR(p.listing.askingValuation)}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${STAGE_COLORS[p.stage] ?? ""}`}
                      >
                        {STAGE_LABELS[p.stage] ?? p.stage}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Market snapshot */}
          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" /> Market Snapshot
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Live Deals</p>
                <p className="text-lg num font-semibold mt-0.5">{market?.totalListings ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deal Value Pool</p>
                <p className="text-lg num font-semibold mt-0.5">
                  {market ? formatINR(market.totalDealValue) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sectors</p>
                <p className="text-lg num font-semibold mt-0.5">
                  {market?.byIndustry?.length ?? "—"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Browse deals", icon: Search, to: "/investor/marketplace" },
                { label: "View pipeline", icon: GitBranch, to: "/investor/pipeline" },
                { label: "Watchlist", icon: Bookmark, to: "/investor/watchlist" },
                { label: "Private deals", icon: Zap, to: "/investor/private-deals" },
                { label: "Messages", icon: MessageSquare, to: "/messages" },
              ].map(({ label, icon: Icon, to }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Recent Activity
            </h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{a.dealName}</p>
                      <p className="text-xs text-muted-foreground">
                        Moved to{" "}
                        <span className="text-foreground">{STAGE_LABELS[a.stage] ?? a.stage}</span>
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(a.ts).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </PortalLayout>
  );
}
