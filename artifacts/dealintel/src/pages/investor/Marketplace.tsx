import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search, SlidersHorizontal, MapPin, TrendingUp, Eye, BookmarkPlus,
  Bookmark, Building2, IndianRupee, BarChart3, Star, ShieldCheck, Zap, Lock,
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
import { useToast } from "@/hooks/use-toast";
import type { Listing, WatchlistItem, MarketplaceStats } from "@/lib/types";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

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

  const { data: watchlist } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => api.get("/watchlist"),
  });
  const watchedIds = new Set((watchlist ?? []).map((w) => w.listingId));

  const toggleWatch = useMutation({
    mutationFn: async ({ id, watched }: { id: number; watched: boolean }) =>
      watched ? api.delete(`/watchlist/${id}`) : api.post(`/watchlist/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  // Sort: featured/verified listings rise to the top via boostScore
  const sorted = [...(listings ?? [])].sort((a, b) => (b.boostScore ?? 0) - (a.boostScore ?? 0));

  return (
    <PortalLayout title="Deal Marketplace" subtitle="Discover and analyze businesses for acquisition">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Live Deals" value={stats?.totalListings ?? 0} icon={Building2} />
        <StatCard label="Total Deal Value" value={stats ? formatINR(stats.totalDealValue) : "—"} icon={IndianRupee} accent="green" />
        <StatCard label="Sectors" value={stats?.byIndustry.length ?? 0} icon={BarChart3} accent="blue" />
        <StatCard label="Watchlisted" value={watchlist?.length ?? 0} icon={Bookmark} accent="green" />
      </div>

      {/* Cross-role value banner */}
      <Card className="mb-6 p-4 border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Access exclusive deals from verified business owners
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {["Off-market opportunities", "Verified seller listings", "Institutional-grade deal data"].map((label) => (
              <span key={label} className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />{label}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Featured deals sorted first
        </span>
      </Card>

      {/* Filters */}
      <Card className="p-4 border-card-border mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company name…" className="pl-9" data-testid="input-search" />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="md:w-48" data-testid="select-filter-industry">
              <SlidersHorizontal className="h-4 w-4 mr-2" /><SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="md:w-40" data-testid="select-filter-stage"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading deals…</p>}

      {!isLoading && sorted.length === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">No deals match your filters</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((l) => {
          const watched = watchedIds.has(l.id);
          return (
            <Card
              key={l.id}
              className={`p-5 border-card-border flex flex-col hover-elevate cursor-pointer ${l.isFeatured || l.isVerified ? "ring-1 ring-primary/30" : ""}`}
              onClick={() => navigate(`/investor/marketplace/${l.id}`)}
              data-testid={`card-listing-${l.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <h3 className="font-semibold truncate">{l.companyName}</h3>
                    {l.isFeatured && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-400">
                        <Star className="h-3 w-3 fill-amber-400" /> Featured
                      </span>
                    )}
                    {l.isVerified && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{l.customIndustry ?? l.industry}</Badge>
                    <span className="text-xs text-muted-foreground capitalize">{l.stage}</span>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={(e) => { e.stopPropagation(); toggleWatch.mutate({ id: l.id, watched }); }}
                  data-testid={`button-watch-${l.id}`}
                >
                  {watched ? <Bookmark className="h-4 w-4 fill-primary text-primary" /> : <BookmarkPlus className="h-4 w-4" />}
                </Button>
              </div>

              {l.city && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {l.city}{l.state ? `, ${l.state}` : ""}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <Metric label="Revenue" value={formatINR(l.revenue)} />
                <Metric label="EBITDA" value={formatINR(l.ebitda)} />
                <Metric label="Asking" value={formatINR(l.askingValuation)} highlight />
                <Metric label="Growth" value={l.revenueGrowthRate != null ? formatPct(l.revenueGrowthRate, true) : "—"} />
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> {l.viewCount}</span>
                <span className="text-xs text-primary flex items-center gap-1 font-medium">
                  Analyze <TrendingUp className="h-3 w-3" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </PortalLayout>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-medium ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
