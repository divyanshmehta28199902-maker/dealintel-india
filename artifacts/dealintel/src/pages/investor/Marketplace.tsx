import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search, SlidersHorizontal, MapPin, TrendingUp, Eye,
  Building2, IndianRupee, BarChart3, Star, ShieldCheck, Zap,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatINR, formatPct, INDUSTRIES, STAGES } from "@/lib/format";
import type { Listing, MarketplaceStats } from "@/lib/types";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [, navigate] = useLocation();

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (industry !== "all") params.set("industry", industry);
  if (stage !== "all") params.set("stage", stage);
  const qs = params.toString();

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["listings", "marketplace", qs],
    queryFn: () => api.get(`/listings${qs ? `?${qs}` : ""}`),
  });

  const { data: stats } = useQuery<MarketplaceStats>({
    queryKey: ["dashboard", "marketplace-stats"],
    queryFn: () => api.get("/dashboard/marketplace-stats"),
  });

  const sorted = [...(listings ?? [])].sort((a, b) => (b.boostScore ?? 0) - (a.boostScore ?? 0));

  return (
    <PortalLayout title="Deal Marketplace" subtitle="Discover and analyze businesses for acquisition">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Live Deals" value={stats?.totalListings ?? 0} icon={Building2} />
        <StatCard label="Total Deal Value" value={stats ? formatINR(stats.totalDealValue) : "—"} icon={IndianRupee} accent="green" />
        <StatCard label="Sectors" value={stats?.byIndustry.length ?? 0} icon={BarChart3} />
      </div>

      {/* Filters */}
      <Card className="p-4 border-border mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name…"
              className="pl-9 h-9 text-sm"
              data-testid="input-search"
            />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="md:w-44 h-9 text-sm" data-testid="select-filter-industry">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-2 shrink-0" /><SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="md:w-36 h-9 text-sm" data-testid="select-filter-stage">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Skeleton loaders */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(null).map((_, i) => (
            <Card key={i} className="p-4 border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
                <div className="skeleton h-8 w-8 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {Array(4).fill(null).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="skeleton h-2.5 w-12 rounded" />
                    <div className="skeleton h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <Card className="p-12 text-center border-border">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">Analyze your first deal in 10 seconds</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            No deals match your filters. Try adjusting search or sector filters.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setIndustry("all"); setStage("all"); }}>
            Clear Filters
          </Button>
        </Card>
      )}

      {/* Deal cards */}
      {!isLoading && sorted.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((l) => {
            return (
              <Card
                key={l.id}
                className={`p-4 border-border flex flex-col hover-elevate cursor-pointer transition-colors ${l.isFeatured || l.isVerified ? "ring-1 ring-primary/25" : ""}`}
                onClick={() => navigate(`/investor/marketplace/${l.id}`)}
                data-testid={`card-listing-${l.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-semibold truncate">{l.companyName}</h3>
                      {l.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-400">
                          <Star className="h-2.5 w-2.5 fill-amber-400" /> Featured
                        </span>
                      )}
                      {l.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs h-5 px-1.5">{l.customIndustry ?? l.industry}</Badge>
                      <span className="text-xs text-muted-foreground capitalize">{l.stage}</span>
                    </div>
                  </div>
                </div>

                {l.city && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 shrink-0" /> {l.city}{l.state ? `, ${l.state}` : ""}
                  </p>
                )}

                {/* Metrics — label left, value right */}
                <div className="mt-3 border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  <Metric label="Revenue" value={formatINR(l.revenue)} />
                  <Metric label="EBITDA" value={formatINR(l.ebitda)} />
                  <Metric label="Asking" value={formatINR(l.askingValuation)} highlight />
                  <Metric label="Growth" value={l.revenueGrowthRate != null ? formatPct(l.revenueGrowthRate, true) : "—"} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {l.viewCount} views
                  </span>
                  <span className="text-xs text-primary flex items-center gap-1 font-medium">
                    Analyze <TrendingUp className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs num ${highlight ? "text-primary font-semibold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
