import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PlanGate from "@/components/PlanGate";
import {
  TrendingUp, Clock, CheckCircle2, MessageSquare, ChevronRight,
  GitBranch, ArrowRight, IndianRupee, AlertTriangle, BarChart3,
  Activity, LayoutGrid, Search, Zap, Brain, Lightbulb,
  TrendingDown, Target, Filter, X,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  { key: "interested",    label: "Interested",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",      prob: 0.10 },
  { key: "contacted",     label: "Contacted",     color: "bg-purple-500/15 text-purple-400 border-purple-500/30", prob: 0.25 },
  { key: "due_diligence", label: "Due Diligence", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", prob: 0.50 },
  { key: "negotiation",   label: "Negotiation",   color: "bg-orange-500/15 text-orange-400 border-orange-500/30", prob: 0.75 },
  { key: "closed",        label: "Closed",        color: "bg-green-500/15 text-green-400 border-green-500/30",    prob: 1.00 },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function stageInfo(stage: string) {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

function nextStage(current: string): string | null {
  const idx = STAGES.findIndex((s) => s.key === current);
  return idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

function lastActivityTs(deal: PipelineDeal): number {
  const log = deal.activityLog ?? [];
  if (log.length === 0) return new Date(deal.createdAt).getTime();
  return Math.max(...log.map((a) => new Date(a.ts).getTime()));
}

function daysInCurrentStage(deal: PipelineDeal): number {
  const log = [...(deal.activityLog ?? [])].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
  const lastEntry = log[0];
  const since = lastEntry ? new Date(lastEntry.ts).getTime() : new Date(deal.createdAt).getTime();
  return Math.floor((Date.now() - since) / 86_400_000);
}

function generateInsights(pipeline: PipelineDeal[]): string[] {
  const insights: string[] = [];
  const active = pipeline.filter((p) => p.stage !== "closed");
  const closed = pipeline.filter((p) => p.stage === "closed");
  const total = pipeline.length;

  // Stuck deals (no activity > 45 days, not closed)
  const stuckDeals = active.filter((p) => {
    const daysSinceActivity = Math.floor((Date.now() - lastActivityTs(p)) / 86_400_000);
    return daysSinceActivity > 45;
  });
  if (stuckDeals.length === 1) {
    insights.push(`"${stuckDeals[0].listing.name ?? "One deal"}" has been inactive for over 45 days — a follow-up may be warranted.`);
  } else if (stuckDeals.length > 1) {
    insights.push(`${stuckDeals.length} deals have had no activity for over 45 days and may need follow-up.`);
  }

  // Negotiation stage (close to closing)
  const negotiation = active.filter((p) => p.stage === "negotiation");
  if (negotiation.length === 1) {
    insights.push(`"${negotiation[0].listing.name ?? "One deal"}" is in Negotiation — your closest deal to a completed acquisition.`);
  } else if (negotiation.length > 1) {
    insights.push(`${negotiation.length} deals are in Negotiation — you're close to completing multiple acquisitions.`);
  }

  // Industry concentration
  const byIndustry: Record<string, number> = {};
  for (const p of active) {
    const ind = p.listing.industry ?? "Unknown";
    byIndustry[ind] = (byIndustry[ind] ?? 0) + 1;
  }
  const topEntry = Object.entries(byIndustry).sort((a, b) => b[1] - a[1])[0];
  if (topEntry && topEntry[1] >= 2) {
    insights.push(`${topEntry[0]} is your most-tracked sector with ${topEntry[1]} active deals.`);
  }

  // Win rate (only if meaningful sample)
  if (total >= 3) {
    const winRate = Math.round((closed.length / total) * 100);
    if (closed.length > 0) {
      insights.push(`Your win rate is ${winRate}% — ${closed.length} deal${closed.length > 1 ? "s" : ""} closed out of ${total} tracked.`);
    }
  }

  // Stage concentration (if > 50% in one non-closed stage)
  const stageCounts: Record<string, number> = {};
  for (const p of active) stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;
  const maxStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];
  if (maxStage && active.length > 0 && maxStage[1] / active.length >= 0.6 && active.length >= 4) {
    const label = stageInfo(maxStage[0]).label;
    insights.push(`${Math.round((maxStage[1] / active.length) * 100)}% of your active deals are in ${label} — consider advancing or evaluating them.`);
  }

  // No recent activity
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const anyRecent = pipeline.some((p) =>
    (p.activityLog ?? []).some((a) => new Date(a.ts).getTime() > thirtyDaysAgo),
  );
  if (!anyRecent && active.length > 0) {
    insights.push(`No pipeline activity in the last 30 days — review your ${active.length} active deal${active.length > 1 ? "s" : ""}.`);
  }

  return insights.slice(0, 5);
}

type Tab = "overview" | "kanban" | "analytics";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",    icon: BarChart3 },
  { id: "kanban",    label: "Kanban Board", icon: LayoutGrid },
  { id: "analytics", label: "Analytics",   icon: Activity },
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

        {tab === "overview" && (
          <OverviewTab pipeline={pipeline ?? []} isLoading={isLoading} navigate={navigate} />
        )}
        {tab === "kanban" && (
          <KanbanTab
            pipeline={pipeline ?? []}
            isLoading={isLoading}
            grouped={grouped}
            navigate={navigate}
            onSelect={(p) => { setSelected(p); setTargetStage(nextStage(p.stage) ?? p.stage); setStageNote(""); }}
          />
        )}
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
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
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

/* ═══════════════════════════════════════════════════════════════════
   OVERVIEW TAB — Operational Dashboard
   "What is happening in my pipeline today?"
═══════════════════════════════════════════════════════════════════ */
function OverviewTab({
  pipeline, isLoading, navigate,
}: { pipeline: PipelineDeal[]; isLoading: boolean; navigate: (to: string) => void }) {

  const active = pipeline.filter((p) => p.stage !== "closed");
  const total  = pipeline.length;

  const pipelineValue = active.reduce((s, p) => s + (p.listing.askingValuation ?? 0), 0);
  const avgDealSize   = active.length > 0 ? Math.round(pipelineValue / active.length) : 0;

  // Deals needing attention: active deals with no activity in > 30 days
  const needsAttention = active.filter((p) => {
    const daysSinceActivity = Math.floor((Date.now() - lastActivityTs(p)) / 86_400_000);
    return daysSinceActivity > 30;
  });

  // Deals closing soon = Negotiation stage
  const closingSoon = active.filter((p) => p.stage === "negotiation");

  // Recent activity (last 14 days)
  const fourteenDaysAgo = Date.now() - 14 * 86_400_000;
  const recentActivity = pipeline
    .flatMap((p) =>
      (p.activityLog ?? [])
        .filter((a) => new Date(a.ts).getTime() > fourteenDaysAgo)
        .map((a) => ({ dealName: p.listing.name ?? "—", stage: a.stage, ts: a.ts, note: a.note, id: p.id })),
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 8);

  // Recent notes (from activityLog)
  const recentNotes = pipeline
    .flatMap((p) =>
      (p.activityLog ?? [])
        .filter((a) => a.note)
        .map((a) => ({ dealName: p.listing.name ?? "—", note: a.note!, ts: a.ts })),
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 3);

  // AI insights
  const insights = useMemo(() => generateInsights(pipeline), [pipeline]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted" />)}
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
          Start tracking deals from the Marketplace or Private Deals. Add any listing to your pipeline to begin.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/investor/marketplace")}>Browse Marketplace</Button>
          <Button variant="outline" onClick={() => navigate("/investor/private-deals")}>Browse Private Deals</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Operational stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Deals" value={active.length} icon={GitBranch} />
        <StatCard label="Pipeline Value" value={pipelineValue > 0 ? formatINR(pipelineValue) : "—"} icon={IndianRupee} />
        <StatCard label="Avg Deal Size" value={avgDealSize > 0 ? formatINR(avgDealSize) : "—"} icon={Target} />
        <StatCard
          label="Needs Attention"
          value={needsAttention.length}
          icon={AlertTriangle}
          accent={needsAttention.length > 0 ? "red" as never : undefined}
        />
      </div>

      {/* AI Pipeline Insights */}
      {insights.length > 0 && (
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Pipeline Insights
            <Badge variant="outline" className="text-xs ml-1">From your data</Badge>
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border">
                <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">

        {/* Deals Requiring Attention */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Deals Requiring Attention
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Active deals with no activity in the last 30 days</p>
          {needsAttention.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-400">All active deals have recent activity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.slice(0, 5).map((p) => {
                const days = Math.floor((Date.now() - lastActivityTs(p)) / 86_400_000);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.listing.name ?? "—"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-xs ${stageInfo(p.stage).color}`}>
                          {stageInfo(p.stage).label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{p.listing.industry ?? "—"}</span>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 shrink-0 ml-2">{days}d idle</span>
                  </div>
                );
              })}
              {needsAttention.length > 5 && (
                <p className="text-xs text-muted-foreground">+{needsAttention.length - 5} more</p>
              )}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" /> Recent Activity
            <span className="text-xs text-muted-foreground font-normal">(last 14 days)</span>
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity in the last 14 days.</p>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{a.dealName}</p>
                    <p className="text-xs text-muted-foreground">→ {stageInfo(a.stage).label}</p>
                    {a.note && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{a.note}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(a.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Closing Soon + Recent Notes */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Deals Closing Soon */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-orange-400" /> Deals Closing Soon
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Deals currently in Negotiation stage</p>
          {closingSoon.length === 0 ? (
            <p className="text-xs text-muted-foreground">No deals in Negotiation yet.</p>
          ) : (
            <div className="space-y-2">
              {closingSoon.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.listing.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.listing.industry ?? "—"}</p>
                  </div>
                  {p.listing.askingValuation != null && (
                    <span className="text-sm num font-semibold text-primary shrink-0 ml-2">
                      {formatINR(p.listing.askingValuation)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Notes */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary" /> Recent Notes
          </h3>
          {recentNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes added yet. Add stage notes when advancing deals.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((n, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-medium mb-0.5">{n.dealName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.note}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Quick Actions */}
      <Card className="p-5 border-border">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/investor/marketplace")}>
            <Search className="h-3.5 w-3.5" /> Browse Marketplace
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/investor/private-deals")}>
            <Zap className="h-3.5 w-3.5" /> Browse Private Deals
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/messages")}>
            <MessageSquare className="h-3.5 w-3.5" /> Open Messages
          </Button>
        </div>
      </Card>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   KANBAN TAB — Deal Board with Search + Filters + Enriched Cards
═══════════════════════════════════════════════════════════════════ */
function KanbanTab({
  pipeline, isLoading, grouped, navigate, onSelect,
}: {
  pipeline: PipelineDeal[];
  isLoading: boolean;
  grouped: Record<string, PipelineDeal[]>;
  navigate: (to: string) => void;
  onSelect: (p: PipelineDeal) => void;
}) {
  const [search, setSearch]             = useState("");
  const [filterStage, setFilterStage]   = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");

  const industries = useMemo(() => {
    const set = new Set(pipeline.map((p) => p.listing.industry ?? "Unknown").filter(Boolean));
    return Array.from(set).sort();
  }, [pipeline]);

  const filteredGrouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = pipeline.filter((p) => {
      const matchSearch = !q ||
        (p.listing.name ?? "").toLowerCase().includes(q) ||
        (p.listing.industry ?? "").toLowerCase().includes(q);
      const matchStage    = filterStage === "all" || p.stage === filterStage;
      const matchIndustry = filterIndustry === "all" || (p.listing.industry ?? "Unknown") === filterIndustry;
      return matchSearch && matchStage && matchIndustry;
    });
    return STAGES.reduce((acc, s) => {
      acc[s.key] = filtered.filter((p) => p.stage === s.key);
      return acc;
    }, {} as Record<string, PipelineDeal[]>);
  }, [pipeline, search, filterStage, filterIndustry]);

  const hasFilters = search !== "" || filterStage !== "all" || filterIndustry !== "all";

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
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
          Start tracking deals from the Marketplace or Private Deals.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/investor/marketplace")}>Browse Marketplace</Button>
          <Button variant="outline" onClick={() => navigate("/investor/private-deals")}>View Private Deals</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by company or industry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStage("all"); setFilterIndustry("all"); }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {STAGES.map((s) => (
            <div key={s.key} className="w-72">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredGrouped[s.key].length}
                  {hasFilters && filteredGrouped[s.key].length !== grouped[s.key].length && (
                    <span className="text-muted-foreground/50"> / {grouped[s.key].length}</span>
                  )}
                </span>
              </div>
              <div className="space-y-3">
                {filteredGrouped[s.key].map((p) => {
                  const prob = stageInfo(p.stage).prob;
                  const daysInStage = daysInCurrentStage(p);
                  const isStale = daysInStage > 30 && p.stage !== "closed";
                  return (
                    <Card
                      key={p.id}
                      className={`p-4 border-card-border cursor-pointer hover:border-primary/50 transition-colors ${isStale ? "border-amber-500/20" : ""}`}
                      onClick={() => onSelect(p)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate flex-1">{p.listing.name ?? "—"}</p>
                        <Badge variant="outline" className="text-xs text-green-400 border-green-500/30 bg-green-500/10 shrink-0">
                          {Math.round(prob * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.listing.industry ?? "—"}</p>

                      {p.listing.askingValuation != null && (
                        <div className="flex items-center gap-1 mt-2 text-xs font-mono text-primary">
                          <IndianRupee className="h-3 w-3" />
                          {formatINR(p.listing.askingValuation)}
                        </div>
                      )}

                      {p.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-t border-border pt-2">{p.notes}</p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-3 w-3 ${isStale ? "text-amber-400" : "text-muted-foreground"}`} />
                          <span className={`text-xs ${isStale ? "text-amber-400" : "text-muted-foreground"}`}>
                            {daysInStage}d in stage
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </Card>
                  );
                })}
                {filteredGrouped[s.key].length === 0 && (
                  <div className="h-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/50">No deals</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS TAB — Performance Analysis
   "How is my acquisition pipeline performing over time?"
═══════════════════════════════════════════════════════════════════ */
function AnalyticsTab({
  pipeline, market, isLoading,
}: { pipeline: PipelineDeal[]; market?: MarketplaceStats; isLoading: boolean }) {

  const total   = pipeline.length;
  const active  = pipeline.filter((p) => p.stage !== "closed");
  const closed  = pipeline.filter((p) => p.stage === "closed");
  const winRate = total > 0 ? ((closed.length / total) * 100).toFixed(1) : "—";

  /* Average deal cycle (closed deals: createdAt → closed activityLog entry) */
  const cycles = closed.map((p) => {
    const closeEntry = [...(p.activityLog ?? [])].sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).find(a => a.stage === "closed");
    const endTs = closeEntry ? new Date(closeEntry.ts).getTime() : new Date(p.updatedAt).getTime();
    return Math.round((endTs - new Date(p.createdAt).getTime()) / 86_400_000);
  });
  const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null;

  /* Deal velocity — deals with any activity in last 30 days */
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const velocity = pipeline.filter((p) =>
    (p.activityLog ?? []).some((a) => new Date(a.ts).getTime() > thirtyDaysAgo),
  ).length;

  /* Conversion funnel — count deals that have ever been in each stage (from activityLog) */
  const funnel = STAGES.map((s) => ({
    ...s,
    count: pipeline.filter((p) =>
      (p.activityLog ?? []).some((a) => a.stage === s.key) || p.stage === s.key,
    ).length,
    current: pipeline.filter((p) => p.stage === s.key).length,
  }));

  /* Industry distribution (user's own pipeline) */
  const byIndustry: Record<string, { count: number; value: number }> = {};
  for (const p of pipeline) {
    const ind = p.listing.industry ?? "Unknown";
    if (!byIndustry[ind]) byIndustry[ind] = { count: 0, value: 0 };
    byIndustry[ind].count += 1;
    byIndustry[ind].value += p.listing.askingValuation ?? 0;
  }
  const industryRows = Object.entries(byIndustry)
    .map(([industry, d]) => ({ industry, ...d }))
    .sort((a, b) => b.count - a.count);
  const maxIndustryCount = Math.max(...industryRows.map((r) => r.count), 1);

  /* Stage drop-off analysis */
  const dropOffs = STAGES.slice(0, -1).map((s, i) => {
    const entered = funnel[i].count;
    const next    = funnel[i + 1].count;
    const dropPct = entered > 0 ? Math.round(((entered - next) / entered) * 100) : 0;
    return {
      from: s.label,
      to: STAGES[i + 1].label,
      entered,
      advanced: next,
      dropPct,
      fromColor: s.color,
    };
  }).filter((d) => d.entered > 0);
  const maxDrop = dropOffs.length > 0 ? Math.max(...dropOffs.map((d) => d.dropPct)) : 0;

  /* Expected capital deployment (probability-weighted) */
  const totalExpected = active.reduce((s, p) => s + (p.listing.askingValuation ?? 0) * stageInfo(p.stage).prob, 0);
  const deploymentByStage = STAGES.filter((s) => s.key !== "closed").map((s) => {
    const deals = active.filter((p) => p.stage === s.key);
    const rawValue = deals.reduce((sum, p) => sum + (p.listing.askingValuation ?? 0), 0);
    const expectedValue = Math.round(rawValue * s.prob);
    return { stage: s, count: deals.length, rawValue, expectedValue };
  }).filter((r) => r.count > 0);

  /* Average valuation metrics */
  const dealsWithVal = pipeline.filter((p) => p.listing.askingValuation != null);
  const dealsWithRev = pipeline.filter((p) => p.listing.revenue != null);
  const avgAskingPrice  = dealsWithVal.length > 0 ? Math.round(dealsWithVal.reduce((s, p) => s + (p.listing.askingValuation ?? 0), 0) / dealsWithVal.length) : null;
  const avgRevenue      = dealsWithRev.length > 0 ? Math.round(dealsWithRev.reduce((s, p) => s + (p.listing.revenue ?? 0), 0) / dealsWithRev.length) : null;
  const avgProb         = pipeline.length > 0 ? Math.round(pipeline.reduce((s, p) => s + stageInfo(p.stage).prob, 0) / pipeline.length * 100) : 0;

  /* Closed deals by month (last 6 months) */
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), month: d.getMonth(), year: d.getFullYear() };
  });
  const closedByMonth = months.map((m) => ({
    label: m.label,
    count: pipeline.filter((p) => {
      const closeEntry = (p.activityLog ?? []).find((a) => a.stage === "closed");
      if (!closeEntry) return false;
      const d = new Date(closeEntry.ts);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).length,
  }));
  const maxMonthlyCount = Math.max(...closedByMonth.map((m) => m.count), 1);

  if (isLoading) return <p className="text-sm text-muted-foreground animate-pulse">Loading analytics…</p>;

  if (total === 0) {
    return (
      <Card className="p-12 text-center border-border max-w-lg mx-auto">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Pipeline Data Yet</h3>
        <p className="text-sm text-muted-foreground">Add deals to your pipeline to see performance analytics.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top performance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Deals" value={total} icon={GitBranch} />
        <StatCard label="Win Rate" value={typeof winRate === "string" ? (closed.length > 0 ? `${winRate}%` : winRate) : `${winRate}%`} icon={TrendingUp} accent={closed.length > 0 ? "green" as never : undefined} />
        <StatCard label="Avg Deal Cycle" value={avgCycle != null ? `${avgCycle}d` : "—"} icon={Clock} />
        <StatCard label="Active Last 30d" value={`${velocity}`} icon={Zap} accent={velocity > 0 ? "green" as never : undefined} />
      </div>

      {/* Conversion Funnel */}
      <Card className="p-5 border-border">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-primary" /> Pipeline Conversion Funnel
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Counts deals that have passed through each stage (from activity history)
        </p>
        <div className="space-y-3">
          {funnel.map((s, i) => {
            const prev = i === 0 ? total : funnel[i - 1].count;
            const convPct = prev > 0 ? Math.round((s.count / prev) * 100) : 0;
            const widthPct = total > 0 ? Math.round((s.count / total) * 100) : 0;
            const dropFromPrev = i > 0 ? prev - s.count : 0;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                    {s.current > 0 && (
                      <span className="text-xs text-muted-foreground/60">({s.current} current)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs num text-muted-foreground">
                    <span>{s.count} deals</span>
                    {i > 0 && (
                      <span className={`font-medium ${convPct >= 60 ? "text-green-400" : convPct >= 30 ? "text-amber-400" : "text-red-400"}`}>
                        {convPct}% conv.
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${widthPct}%` }} />
                </div>
                {i > 0 && dropFromPrev > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1 ml-1">
                    ↑ {dropFromPrev} deal{dropFromPrev > 1 ? "s" : ""} did not advance past {funnel[i - 1].label}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Industry Distribution (user's own pipeline) */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4">Pipeline by Industry</h3>
          {industryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="space-y-3">
              {industryRows.map((row) => {
                const pct = Math.round((row.count / maxIndustryCount) * 100);
                return (
                  <div key={row.industry}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{row.industry}</span>
                      <div className="flex items-center gap-3 text-xs num text-muted-foreground">
                        <span>{row.count} deal{row.count !== 1 ? "s" : ""}</span>
                        {row.value > 0 && <span className="text-primary">{formatINR(row.value)}</span>}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Win / Loss Analysis */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Win / Loss Analysis
          </h3>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: "Deals Won (Closed)",   value: closed.length,   cls: "text-green-400" },
              { label: "Deals Active",          value: active.length,   cls: "text-foreground" },
              { label: "Win Rate",              value: closed.length > 0 ? `${winRate}%` : "—", cls: "text-green-400" },
              { label: "Avg Close Probability", value: `${avgProb}%`,   cls: "text-foreground" },
              {
                label: "Avg Deal Cycle (closed)",
                value: avgCycle != null ? `${avgCycle} days` : "—",
                cls: "text-foreground",
              },
              {
                label: "Pipeline vs Market",
                value: market?.totalListings
                  ? `${((total / market.totalListings) * 100).toFixed(1)}%`
                  : "—",
                cls: "text-muted-foreground",
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm num font-medium ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Stage Drop-Off Analysis */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" /> Stage Drop-Off Analysis
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Where deals are not advancing</p>
          {dropOffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <div className="space-y-3">
              {dropOffs.map((d) => {
                const isWorst = d.dropPct === maxDrop && maxDrop > 0;
                return (
                  <div key={`${d.from}-${d.to}`} className={`p-3 rounded-lg border ${isWorst ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {d.from} → {d.to}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs num text-muted-foreground">{d.entered} → {d.advanced}</span>
                        <span className={`text-xs font-semibold ${isWorst ? "text-red-400" : d.dropPct > 40 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {d.dropPct}% drop
                        </span>
                        {isWorst && <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/10">Bottleneck</Badge>}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.dropPct > 50 ? "bg-red-500" : d.dropPct > 25 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${d.dropPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Avg Valuation Metrics */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <IndianRupee className="h-3.5 w-3.5 text-primary" /> Avg Valuation Metrics
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Averages across all tracked deals</p>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: "Avg Asking Price",      value: avgAskingPrice != null ? formatINR(avgAskingPrice) : "—" },
              { label: "Avg Revenue",           value: avgRevenue != null ? formatINR(avgRevenue) : "—" },
              { label: "Avg Close Probability", value: `${avgProb}%` },
              { label: "Avg Deal Cycle",        value: avgCycle != null ? `${avgCycle} days` : "—" },
              { label: "Active Deals (total)",  value: `${active.length} of ${total}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm num font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Expected Capital Deployment */}
      <Card className="p-5 border-border">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-primary" /> Expected Capital Deployment
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Probability-weighted acquisition value by stage. Expected total:{" "}
          <span className="text-primary font-medium num">{totalExpected > 0 ? formatINR(Math.round(totalExpected)) : "—"}</span>
        </p>
        {deploymentByStage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active deals with valuation data.</p>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            <div className="grid grid-cols-4 pb-2">
              {["Stage", "Deals", "Total Asking", "Expected Value"].map((h) => (
                <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {deploymentByStage.map((row) => (
              <div key={row.stage.key} className="grid grid-cols-4 py-2.5 items-center">
                <div>
                  <Badge variant="outline" className={`text-xs ${row.stage.color}`}>{row.stage.label}</Badge>
                </div>
                <span className="text-sm num">{row.count}</span>
                <span className="text-sm num text-muted-foreground">{row.rawValue > 0 ? formatINR(row.rawValue) : "—"}</span>
                <span className="text-sm num font-medium text-green-400">{row.expectedValue > 0 ? formatINR(row.expectedValue) : "—"}</span>
              </div>
            ))}
            <div className="grid grid-cols-4 py-2.5 items-center border-t-2 border-border">
              <span className="text-xs font-semibold">Total</span>
              <span className="text-sm num font-semibold">{deploymentByStage.reduce((s, r) => s + r.count, 0)}</span>
              <span className="text-sm num font-semibold">{formatINR(deploymentByStage.reduce((s, r) => s + r.rawValue, 0))}</span>
              <span className="text-sm num font-semibold text-primary">{formatINR(Math.round(totalExpected))}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Closed Deals by Month */}
      {closed.length > 0 && (
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Closed Deals by Month
            <span className="text-xs text-muted-foreground font-normal">(last 6 months)</span>
          </h3>
          <div className="flex items-end gap-3 h-24">
            {closedByMonth.map((m) => {
              const heightPct = maxMonthlyCount > 0 ? (m.count / maxMonthlyCount) * 100 : 0;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs num text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                  <div className="w-full flex items-end" style={{ height: "56px" }}>
                    <div
                      className={`w-full rounded-t transition-all ${m.count > 0 ? "bg-green-500/60" : "bg-muted"}`}
                      style={{ height: `${Math.max(heightPct, m.count > 0 ? 10 : 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Market Context */}
      <Card className="p-5 border-border">
        <h3 className="text-sm font-semibold mb-3">Market Context</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Live market deals",     value: market?.totalListings ?? "—" },
            { label: "Market deal value",     value: market ? formatINR(market.totalDealValue) : "—" },
            { label: "Active sectors",        value: market?.byIndustry?.length ?? "—" },
            { label: "Your pipeline vs market",
              value: market?.totalListings
                ? `${((total / market.totalListings) * 100).toFixed(1)}%`
                : "—" },
            { label: "Avg market deal size",
              value: market?.totalListings
                ? formatINR(Math.round(market.totalDealValue / market.totalListings))
                : "—" },
            { label: "Your avg deal vs market",
              value: avgAskingPrice != null && market?.totalListings
                ? `${((avgAskingPrice / (market.totalDealValue / market.totalListings)) * 100).toFixed(0)}% of avg`
                : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm num font-semibold mt-0.5">{String(value)}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
