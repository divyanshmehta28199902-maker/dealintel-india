import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PlanGate from "@/components/PlanGate";
import {
  TrendingUp, Clock, CheckCircle2, MessageSquare, ChevronRight,
  GitBranch, ArrowRight, IndianRupee, AlertTriangle,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
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
import type { Pipeline } from "@/lib/types";

const STAGES = [
  { key: "interested", label: "Interested", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { key: "due_diligence", label: "Due Diligence", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { key: "closed", label: "Closed", color: "bg-green-500/15 text-green-400 border-green-500/30" },
] as const;

function stageInfo(stage: string) {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

function nextStage(current: string): string | null {
  const idx = STAGES.findIndex((s) => s.key === current);
  return idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
}

export default function Pipeline() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<Pipeline | null>(null);
  const [stageNote, setStageNote] = useState("");
  const [targetStage, setTargetStage] = useState<string>("");
  const [feeDialog, setFeeDialog] = useState<Pipeline | null>(null);

  const { data: pipeline, isLoading } = useQuery<Pipeline[]>({
    queryKey: ["pipeline"],
    queryFn: () => api.get("/pipeline"),
  });

  const advance = useMutation({
    mutationFn: ({ id, stage, notes }: { id: number; stage: string; notes?: string }) =>
      api.patch<Pipeline>(`/pipeline/${id}/stage`, { stage, notes }),
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
      api.patch<Pipeline>(`/pipeline/${id}/stage`, { stage: "closed", successFeePrompted: answer }),
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
  }, {} as Record<string, Pipeline[]>);

  return (
    <PlanGate requiredPlan="investor_pro" fullPage featureName="Deal Pipeline">
    <PortalLayout
      title="Deal Pipeline"
      subtitle="Track every acquisition from interest to close"
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading pipeline…</p>}

      {!isLoading && (pipeline?.length ?? 0) === 0 && (
        <Card className="p-12 text-center border-card-border">
          <GitBranch className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">Pipeline is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add a listing to your pipeline from the marketplace to start tracking it.
          </p>
          <Button variant="outline" onClick={() => navigate("/investor/marketplace")}>Browse Marketplace</Button>
        </Card>
      )}

      {/* Pipeline board */}
      {(pipeline?.length ?? 0) > 0 && (
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
                      onClick={() => { setSelected(p); setTargetStage(nextStage(p.stage) ?? p.stage); setStageNote(""); }}
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
                {/* Deal info */}
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

                {/* Advance stage */}
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

                {/* Activity timeline */}
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

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/investor/marketplace/${selected.listingId}`)}
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> View Listing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate("/messages")}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Messages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
                A <strong className="text-foreground">1–2% success fee</strong> applies on deals completed through the platform. Reporting honestly helps us continue providing institutional-grade deal intelligence.
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
