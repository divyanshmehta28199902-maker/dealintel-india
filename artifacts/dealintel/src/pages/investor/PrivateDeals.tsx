import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Plus, Trash2, Loader2, Sparkles, ChevronRight, FileText,
  CheckCircle2, AlertCircle, Clock, Upload, X, Lock, TrendingUp,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import PlanGate from "@/components/PlanGate";
import { PrivateDealWizard } from "@/components/PrivateDealWizard";
import type { WizardPayload } from "@/components/PrivateDealWizard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValuationDisplay } from "@/components/ValuationDisplay";
import { IntelligenceDisplay } from "@/components/IntelligenceDisplay";
import { api } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePlan } from "@/hooks/usePlan";
import type { PrivateDeal, DocumentVaultEntry } from "@/lib/types";

const DOC_TYPE_LABELS: Record<string, string> = {
  pl_statement: "P&L Statement",
  balance_sheet: "Balance Sheet",
  gst_filing: "GST / Tax Filing",
  other: "Other",
};

function trustBadge(level: string) {
  if (level === "verified") return { label: "Verified", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> };
  if (level === "partially_verified") return { label: "Partially Verified", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> };
  return { label: "Unverified", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: <AlertCircle className="h-3 w-3" /> };
}

function qualityColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

interface FileUploadProps {
  dealId: number;
  onUploaded: (doc: DocumentVaultEntry) => void;
}

function DocumentUploader({ dealId, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("pl_statement");
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json() as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const doc = await api.post<DocumentVaultEntry>(`/deals/private/${dealId}/documents`, {
        objectPath, fileName: file.name, fileSize: file.size, documentType: docType,
      });
      onUploaded(doc);
      toast({ title: "Document uploaded", description: `${file.name} added to vault.` });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [dealId, docType, onUploaded, toast]);

  return (
    <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={uploading} asChild>
            <span>{uploading ? <><Loader2 className="h-3 w-3 animate-spin" />Uploading…</> : <><Upload className="h-3 w-3" />Upload</>}</span>
          </Button>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">PDF, Excel, or Word · max 50MB</p>
    </div>
  );
}

export default function PrivateDeals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useCurrentUser();
  const { isFree } = usePlan();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PrivateDeal | null>(null);
  const { data: deals, isLoading } = useQuery<PrivateDeal[]>({
    queryKey: ["deals", "private"],
    queryFn: () => api.get("/deals/private"),
    refetchInterval: (q) => {
      const data = q.state.data as PrivateDeal[] | undefined;
      return data?.some((d) => d.status === "analyzing") ? 2000 : false;
    },
  });

  const isInvestorPro = !isFree;
  const atFreeLimit = isFree && (deals?.length ?? 0) >= 1;

  const create = useMutation({
    mutationFn: (payload: WizardPayload) => api.post<PrivateDeal>("/deals/private", payload),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["deals", "private"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      setOpen(false);
      toast({
        title: payload.dealMode === "verified" ? "Deal Room created" : "Draft deal saved",
        description: "Valuation & intelligence are being computed.",
      });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { code?: string } }; message?: string };
      if (err?.response?.data?.code === "plan_required") {
        toast({
          title: "🔒 Investor Pro Required",
          description: "Free plan allows 1 private deal. Upgrade to Investor Pro for unlimited deals.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
      }
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/deals/private/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", "private"] });
      toast({ title: "Deal removed" });
    },
  });

  return (
    <PlanGate requiredPlan="investor_pro" fullPage featureName="Private Deals" fallbackPath="/investor/dashboard">
    <PortalLayout
      title="Private Deals"
      subtitle="Analyze off-market opportunities privately"
      action={
        <Button className="gap-2" data-testid="button-new-deal" onClick={() => setOpen(true)} disabled={atFreeLimit}>
          {atFreeLimit ? <><Lock className="h-4 w-4" /> Plan Limit Reached</> : <><Plus className="h-4 w-4" /> New Private Deal</>}
        </Button>
      }
    >
      {!isInvestorPro && (
        <Card className={`p-4 mb-6 flex items-center gap-3 ${atFreeLimit ? "border-amber-500/30 bg-amber-500/5" : "border-primary/30 bg-primary/5"}`}>
          <Sparkles className={`h-5 w-5 shrink-0 ${atFreeLimit ? "text-amber-400" : "text-primary"}`} />
          <div className="flex-1">
            {atFreeLimit ? (
              <>
                <p className="text-sm font-medium text-amber-400">🔒 Free plan limit reached (1 of 1 deals used)</p>
                <p className="text-xs text-muted-foreground">Upgrade to Investor Pro for unlimited deals, Bear/Base/Bull scenarios, IRR/MOIC metrics, and pipeline tracking.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Free plan: 1 private deal included</p>
                <p className="text-xs text-muted-foreground">Upgrade to Investor Pro for unlimited deals, document vault, and deal pipeline.</p>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => window.location.href = "/pricing"}>
            <Sparkles className="h-3 w-3" /> Upgrade
          </Button>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && (deals?.length ?? 0) === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Shield className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">Analyze your first private deal</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Enter any company's financials — get valuation, IRR, scenario analysis, and risk score in seconds.
          </p>
          <Button
            className="mt-5 gap-2"
            onClick={() => setOpen(true)}
            disabled={atFreeLimit}
            data-testid="button-empty-new-deal"
          >
            <Plus className="h-4 w-4" /> Analyze a Deal in 10 sec
          </Button>
          <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Get instant valuation · IRR · Scenario analysis
          </p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals?.map((d) => {
          const trust = trustBadge(d.trustLevel);
          const score = d.qualityScore ?? 0;
          return (
            <Card key={d.id} className="p-5 border-card-border flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{d.companyName}</h3>
                    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${trust.color}`}>
                      {trust.icon} {trust.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{d.industry}</Badge>
                    {d.dealMode === "verified" && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 border-primary/30 text-primary">
                        <Lock className="h-2.5 w-2.5" /> Deal Room
                      </Badge>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" data-testid={`button-delete-deal-${d.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {d.companyName}?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes the deal, its documents, and all analysis.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del.mutate(d.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Quality score bar */}
              {d.dealMode === "verified" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Deal Quality</span>
                    <span className={score >= 70 ? "text-green-400 font-semibold" : score >= 40 ? "text-yellow-400 font-semibold" : "text-red-400 font-semibold"}>{score} / 100</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-mono font-medium">{formatINR(d.revenue)}</p></div>
                <div><p className="text-xs text-muted-foreground">EBITDA</p><p className="font-mono font-medium">{formatINR(d.ebitda)}</p></div>
                <div><p className="text-xs text-muted-foreground">Growth</p><p className="font-mono font-medium text-green-400">{formatPct(d.growthRate)}</p></div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                {d.status === "analyzing" ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</span>
                ) : d.status === "failed" ? (
                  <span className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Analysis failed</span>
                ) : (
                  <div className="flex items-center justify-between">
                    {d.valuation && (
                      <div>
                        <p className="text-xs text-muted-foreground">Suggested price</p>
                        <p className="text-sm font-mono font-semibold text-primary">{formatINR(d.valuation.suggestedPrice)}</p>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="gap-1 ml-auto" onClick={() => setSelected(d)} data-testid={`button-view-deal-${d.id}`}>
                      View Analysis <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Analysis sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
          {/* Fixed header — never scrolls */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {selected?.companyName}
                {selected && (() => {
                  const t = trustBadge(selected.trustLevel);
                  return <Badge variant="outline" className={`text-xs flex items-center gap-1 ${t.color}`}>{t.icon} {t.label}</Badge>;
                })()}
              </SheetTitle>
            </SheetHeader>
          </div>
          {/* Scrollable analysis content */}
          {selected && (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="valuation">
                <TabsList className="w-full">
                  <TabsTrigger value="valuation" className="flex-1">Valuation</TabsTrigger>
                  <TabsTrigger value="intelligence" className="flex-1">Intelligence</TabsTrigger>
                  {selected.dealMode === "verified" && (
                    <>
                      <TabsTrigger value="narrative" className="flex-1">Narrative</TabsTrigger>
                      <TabsTrigger value="documents" className="flex-1 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> Docs
                        {(selected.documents?.length ?? 0) > 0 && (
                          <Badge className="h-4 w-4 p-0 text-xs flex items-center justify-center">{selected.documents?.length}</Badge>
                        )}
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <TabsContent value="valuation" className="mt-4">
                  {selected.valuation ? <ValuationDisplay v={selected.valuation} /> : <p className="text-sm text-muted-foreground">Analysis pending.</p>}
                </TabsContent>

                <TabsContent value="intelligence" className="mt-4">
                  {selected.intelligence ? <IntelligenceDisplay intel={selected.intelligence} /> : <p className="text-sm text-muted-foreground">Analysis pending.</p>}
                </TabsContent>

                {selected.dealMode === "verified" && (
                  <TabsContent value="narrative" className="mt-4 space-y-4">
                    {[
                      { label: "Business Overview", value: selected.businessOverview },
                      { label: "Why Selling", value: selected.whySelling },
                      { label: "Growth Drivers", value: selected.growthDrivers },
                      { label: "Key Risks", value: selected.keyRisks },
                    ].map(({ label, value }) => value && (
                      <Card key={label} className="p-4 border-card-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
                        <p className="text-sm leading-relaxed">{value}</p>
                      </Card>
                    ))}
                  </TabsContent>
                )}

                {selected.dealMode === "verified" && (
                  <TabsContent value="documents" className="mt-4 space-y-4">
                    <DocumentUploader
                      dealId={selected.id}
                      onUploaded={(doc) => {
                        setSelected((prev) => prev ? { ...prev, documents: [...(prev.documents ?? []), doc] } : prev);
                        qc.invalidateQueries({ queryKey: ["deals", "private"] });
                      }}
                    />
                    {(selected.documents ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.documents?.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.documentType]} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)}KB` : ""}</p>
                            </div>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PortalLayout>
    <PrivateDealWizard
      open={open}
      onOpenChange={setOpen}
      onSubmit={(payload) => create.mutate(payload)}
      isPending={create.isPending}
    />
    </PlanGate>
  );
}
