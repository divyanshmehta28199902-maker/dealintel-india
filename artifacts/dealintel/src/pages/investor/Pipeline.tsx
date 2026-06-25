import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PlanGate from "@/components/PlanGate";
import {
  TrendingUp, Clock, CheckCircle2, MessageSquare, ChevronRight,
  GitBranch, ArrowRight, IndianRupee, AlertTriangle, BarChart3,
  Activity, LayoutGrid, Search, Bookmark, Zap,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Pipeline as PipelineDeal, MarketplaceStats } from "@/lib/types";

const STAGES = [
  { key: "interested",   label: "Interested",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",    prob: 0.10 },
  { key: "contacted",    label: "Contacted",     color: "bg-purple-500/15 text-purple-400 border-purple-500/30", prob: 0.25 },
  { key: "due_diligence",label: "Due Diligence", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", prob: 0.50 },
  { key: "negotiation",  label: "Negotiation",   color: "bg-orange-500/15 text-orange-400 border-orange-500/30", prob: 0.75 },
  { key: "closed",       label: "Closed",        color: "bg-green-500/15 text-green-400 border-green-500/30",  prob: 1.00 },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function stageInfo(stage: string) {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

function nextStage(current: string): string | null {
  const idx = STAGES.findIndex((s) => s.key === current);
  return idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
}

type Tab = "overview" | "kanban" | "analytics";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",   icon: BarChart3 },
  { id: "kanban",    label: "Kanban Board", icon: LayoutGrid },
  { id: "analytics", label: "Analytics",  icon: Activity },
];

export default function Pipeline() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<PipelineDeal | null>(null);
  const [stageNote, setStageNote] = useState("");
  const [targetStage, setTargetStage] = useState<string>("");
  const [feeDialog, setFeeDialog] = useState<PipelineDeal | null>(null);

  const { data: pipeline, isLoading } = useQuery<PipelineDeal[]>({
    queryKey: ["pipeline"],
    queryFn: () => api.get("/pipeline"),
  });

  const { data: market } = useQuery<MarketplaceStats>({
    queryKey: ["dashboard", "marketplace-stats"],
    queryFn: () => api.get("/dashboard/marketplace-stats"),
  });

  const advance = useMutation({
    mutationFn: ({ id, stage, notes }: { id: number; stage: string; notes?: string }) =>
      api.patch<PipelineDeal>(`/pipeline/${id}/stage`, { stage, notes }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      setSelected(updated);
      setStageNote("");
      if (updated.stage === "closed" && !updated.successFeePrompted) {
        setFeeDialog(updated);
      }
      toast({ title: "Stage updated", description: `Deal moved to ${stageInfo(updated.stage).label}` });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const recordFee = useMutation({
    mutationFn: ({ id, answer }: { id: number; answer: "yes" | "no" }) =>
      api.patch<PipelineDeal>(`/pipeline/${id}/stage`, { stage: "closed", successFeePrompted: answer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      setFeeDialog(null);
      toast({ title: "Recorded", description: "Deal outcome saved." });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pipeline/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      setSelected(null);
      toast({ title: "Removed from pipeline" });
    },
  });

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = (pipeline ?? []).filter((p) => p.stage === s.key);
    return acc;
  }, {} as Record<string, PipelineDeal[]>);

  return (
    <PlanGate requiredPlan="investor_pro" fullPage featureName="Deal Pipeline">
      <PortalLayout
        title="Deal Pipeline"
        subtitle="Track every acquisition from interest to close"
        backTo="/investor/dashboard"
      >

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border -mt-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <OverviewTab pipeline={pipeline ?? []} isLoading={isLoading} navigate={navigate} />
        )}

        {/* ── KANBAN TAB ── */}
        {tab === "kanban" && (
          <KanbanTab
            pipeline={pipeline ?? []}
            isLoading={isLoading}
            grouped={grouped}
            navigate={navigate}
            onSelect={(p) => { setSelected(p); setTargetStage(nextStage(p.stage) ?? p.stage); setStageNote(""); }}
          />
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <AnalyticsTab pipeline={pipeline ?? []} market={market} isLoading={isLoading} />
        )}

        {/* Deal detail sheet */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    {selected.listing.name}
                    <Badge variant="outline" className={`text-xs ${stageInfo(selected.stage).color}`}>
                      {stageInfo(selected.stage).label}
                    </Badge>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 border-card-border">
                      <p className="text-xs text-muted-foreground">Asking Price</p>
                      <p className="font-mono font-semibold text-primary mt-0.5">
                        {selected.listing.askingValuation ? formatINR(selected.listing.askingValuation) : "—"}
                      </p>
                    </Card>
                    <Card className="p-3 border-card-border">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-mono font-semibold mt-0.5">
                        {selected.listing.revenue ? formatINR(selected.listing.revenue) : "—"}
                      </p>
                    </Card>
                  </div>

                  {selected.stage !== "closed" && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Advance Stage</h4>
                      <Select value={targetStage} onValueChange={setTargetStage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAGES.filter((s) => {
                            const idx = STAGES.findIndex((x) => x.key === selected.stage);
                            return STAGES.indexOf(s) > idx;
                          }).map((s) => (
                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <Label>Stage Note</Label>
                        <Textarea
                          value={stageNote}
                          onChange={(e) => setStageNote(e.target.value)}
                          placeholder="What happened? Key contacts, decisions, next steps…"
                          rows={3}
                          className="mt-1.5"
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        disabled={!targetStage || advance.isPending}
                        onClick={() => advance.mutate({ id: selected.id, stage: targetStage, notes: stageNote || undefined })}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Move to {stageInfo(targetStage).label}
                      </Button>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Activity Timeline
                    </h4>
                    <div className="space-y-3">
                      {[...(selected.activityLog ?? [])].reverse().map((entry, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                            {i < (selected.activityLog?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                          </div>
                          <div className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${stageInfo(entry.stage).color}`}>{stageInfo(entry.stage).label}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(entry.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => navigate(`/investor/marketplace/${selected.listingId}`)}>
                      <TrendingUp className="h-3.5 w-3.5" /> View Listing
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => navigate("/messages")}>
                      <MessageSquare className="h-3.5 w-3.5" /> Messages
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive ml-auto"
                      onClick={() => remove.mutate(selected.id)}
                      disabled={remove.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Success fee dialog */}
        <Dialog open={!!feeDialog} onOpenChange={(o) => !o && setFeeDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" /> Deal Closed!
              </DialogTitle>
              <DialogDescription>
                Congratulations on completing the deal for <strong>{feeDialog?.listing.name}</strong>. Was this deal completed through DealIntel India?
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  A <strong className="text-foreground">1–2% success fee</strong> applies on deals completed through the platform.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => recordFee.mutate({ id: feeDialog!.id, answer: "no" })}>
                No, completed elsewhere
              </Button>
              <Button onClick={() => recordFee.mutate({ id: feeDialog!.id, answer: "yes" })}>
                Yes — completed through DealIntel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </PortalLayout>
    </PlanGate>
  );
}

/* ─────────────────────────── Overview Tab ─────────────────────────── */
function OverviewTab({
  pipeline, isLoading, navigate,
}: { pipeline: PipelineDeal[]; isLoading: boolean; navigate: (to: string) => void }) {
  const total   = pipeline.length;
  const active  = pipeline.filter((p) => p.stage !== "closed").length;
  const closed  = pipeline.filter((p) => p.stage === "closed").length;
  const winRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  const pipelineValue = pipeline
    .filter((p) => p.stage !== "closed")
    .reduce((s, p) => s + (p.listing.askingValuation ?? 0), 0);

  const expectedRevenue = pipeline.reduce((s, p) => {
    const prob = stageInfo(p.stage).prob ?? 0;
    return s + (p.listing.askingValuation ?? 0) * prob;
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <Card className="p-12 text-center border-border max-w-lg mx-auto">
        <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your Pipeline is Empty</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You haven't added any deals to your pipeline yet. Start by browsing the Deal Marketplace or your Private Deals.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/investor/marketplace")}>
            Browse Marketplace
          </Button>
          <Button variant="outline" onClick={() => navigate("/investor/private-deals")}>
            View Private Deals
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Deals" value={total} icon={GitBranch} />
        <StatCard label="Active Deals" value={active} icon={Activity} />
        <StatCard label="Closed Deals" value={closed} icon={CheckCircle2} accent="green" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon={TrendingUp} accent={winRate > 0 ? "green" : undefined} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <StatCard label="Pipeline Value" value={pipelineValue > 0 ? formatINR(pipelineValue) : "—"} icon={IndianRupee} />
        <StatCard label="Expected Revenue" value={expectedRevenue > 0 ? formatINR(Math.round(expectedRevenue)) : "—"} icon={IndianRupee} accent="green" />
      </div>

      {/* Stage distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4">Stage Distribution</h3>
          <div className="space-y-3">
            {STAGES.map((s) => {
              const count = pipeline.filter((p) => p.stage === s.key).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                    <span className="text-xs num text-muted-foreground">{count} deals · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
          {pipeline
            .flatMap((p) =>
              (p.activityLog ?? []).map((a) => ({
                dealName: p.listing.name ?? "—",
                stage: a.stage,
                ts: a.ts,
                note: a.note,
              })),
            )
            .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
            .slice(0, 6)
            .map((a, i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-border last:border-0">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{a.dealName}</p>
                  <p className="text-xs text-muted-foreground">→ {stageInfo(a.stage).label}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(a.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          {pipeline.flatMap((p) => p.activityLog ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No activity yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── Kanban Tab ─────────────────────────── */
function KanbanTab({
  pipeline, isLoading, grouped, navigate, onSelect,
}: {
  pipeline: PipelineDeal[];
  isLoading: boolean;
  grouped: Record<string, PipelineDeal[]>;
  navigate: (to: string) => void;
  onSelect: (p: PipelineDeal) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-28 rounded-xl bg-muted" />
            <div className="h-28 rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (pipeline.length === 0) {
    return (
      <Card className="p-12 text-center border-border max-w-lg mx-auto">
        <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your Pipeline is Empty</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You haven't added any deals to your pipeline yet. Start by browsing the Deal Marketplace or your Private Deals.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/investor/marketplace")}>
            Browse Marketplace
          </Button>
          <Button variant="outline" onClick={() => navigate("/investor/private-deals")}>
            View Private Deals
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-4">
        {STAGES.map((s) => (
          <div key={s.key} className="w-72">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">{grouped[s.key].length}</span>
            </div>
            <div className="space-y-3">
              {grouped[s.key].map((p) => (
                <Card
                  key={p.id}
                  className="p-4 border-card-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onSelect(p)}
                >
                  <p className="font-semibold text-sm truncate">{p.listing.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.listing.industry ?? "—"}</p>
                  {p.listing.askingValuation != null && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-mono text-primary">
                      <IndianRupee className="h-3 w-3" />
                      {formatINR(p.listing.askingValuation)}
                    </div>
                  )}
                  {p.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-t border-border pt-2">{p.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Analytics Tab ─────────────────────────── */
function AnalyticsTab({
  pipeline, market, isLoading,
}: { pipeline: PipelineDeal[]; market?: MarketplaceStats; isLoading: boolean }) {
  const total        = pipeline.length;
  const active       = pipeline.filter((p) => p.stage !== "closed").length;
  const closed       = pipeline.filter((p) => p.stage === "closed").length;
  const winRate      = total > 0 ? ((closed / total) * 100).toFixed(1) : "—";

  const pipelineValue = pipeline
    .filter((p) => p.stage !== "closed")
    .reduce((s, p) => s + (p.listing.askingValuation ?? 0), 0);

  const expectedRevenue = pipeline.reduce((s, p) => {
    const prob = stageInfo(p.stage).prob ?? 0;
    return s + (p.listing.askingValuation ?? 0) * prob;
  }, 0);

  /* Average deal cycle (closed deals only, days from createdAt → updatedAt) */
  const cycles = pipeline
    .filter((p) => p.stage === "closed")
    .map((p) => Math.round((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86_400_000));
  const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null;

  /* Deal velocity — deals with activity in last 30 days */
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const velocity = pipeline.filter((p) =>
    (p.activityLog ?? []).some((a) => new Date(a.ts).getTime() > thirtyDaysAgo),
  ).length;

  /* Stage conversion funnel */
  const funnel = STAGES.map((s) => ({
    ...s,
    count: pipeline.filter((p) => p.stage === s.key).length,
  }));

  /* All activity sorted newest first */
  const allActivity = pipeline
    .flatMap((p) =>
      (p.activityLog ?? []).map((a) => ({
        dealName: p.listing.name ?? "—",
        industry: p.listing.industry ?? "—",
        stage: a.stage,
        ts: a.ts,
        note: a.note,
      })),
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Deals" value={total} icon={GitBranch} />
        <StatCard label="Active Deals" value={active} icon={Activity} />
        <StatCard label="Closed Deals" value={closed} icon={CheckCircle2} accent="green" />
        <StatCard label="Win Rate" value={typeof winRate === "string" ? winRate : `${winRate}%`} icon={TrendingUp} accent={closed > 0 ? "green" : undefined} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pipeline Value" value={pipelineValue > 0 ? formatINR(pipelineValue) : "—"} icon={IndianRupee} />
        <StatCard label="Expected Revenue" value={expectedRevenue > 0 ? formatINR(Math.round(expectedRevenue)) : "—"} icon={IndianRupee} accent="green" />
        <StatCard label="Avg Deal Cycle" value={avgCycle != null ? `${avgCycle}d` : "—"} icon={Clock} />
        <StatCard label="Deal Velocity" value={`${velocity} / 30d`} icon={Zap} accent={velocity > 0 ? "green" : undefined} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Stage funnel */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4">Stage Conversion Funnel</h3>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">No deals yet.</p>
          ) : (
            <div className="space-y-3">
              {funnel.map((s, i) => {
                const prevCount = i === 0 ? total : funnel[i - 1].count;
                const convRate = prevCount > 0 ? Math.round((s.count / prevCount) * 100) : 0;
                const widthPct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs num text-muted-foreground">
                        <span>{s.count} deals</span>
                        {i > 0 && <span className="text-xs text-muted-foreground/60">→ {convRate}% conv.</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Market context */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4">Market Context</h3>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: "Live market deals",    value: market?.totalListings ?? "—" },
              { label: "Market deal value",    value: market ? formatINR(market.totalDealValue) : "—" },
              { label: "Active sectors",       value: market?.byIndustry?.length ?? "—" },
              { label: "Your pipeline vs market",
                value: market?.totalListings
                  ? `${((total / market.totalListings) * 100).toFixed(1)}%`
                  : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm num font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 border-border md:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Activity Timeline</h3>
          {allActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-0">
              {allActivity.slice(0, 12).map((a, i) => (
                <div key={i} className="flex gap-4 py-2.5 border-b border-border last:border-0">
                  <div className="flex flex-col items-center pt-1.5 shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {i < Math.min(allActivity.length, 12) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{a.dealName}</span>
                      <Badge variant="outline" className={`text-xs ${stageInfo(a.stage).color} shrink-0`}>
                        {stageInfo(a.stage).label}
                      </Badge>
                    </div>
                    {a.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.note}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {new Date(a.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
