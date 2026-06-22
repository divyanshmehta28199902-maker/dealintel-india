import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Plus, Trash2, Loader2, Sparkles, ChevronRight, FileText,
  CheckCircle2, AlertCircle, Clock, Upload, X, Lock, TrendingUp,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ValuationDisplay } from "@/components/ValuationDisplay";
import { IntelligenceDisplay } from "@/components/IntelligenceDisplay";
import { api } from "@/lib/api";
import { formatINR, formatPct, INDUSTRIES } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePlan } from "@/hooks/usePlan";
import type { PrivateDeal, DocumentVaultEntry } from "@/lib/types";

type DealMode = "quick" | "verified";

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

function computeLiveScore(form: {
  businessOverview: string; whySelling: string; growthDrivers: string; keyRisks: string;
  revenueY1: string; revenueY2: string; revenueY3: string;
  totalDebt: string; customerConcentration: string; legalConfirmed: boolean;
}, docCount: number): number {
  let score = 20;
  if (form.businessOverview.length > 50) score += 10;
  if (form.whySelling.length > 30) score += 10;
  if (form.growthDrivers.length > 30) score += 8;
  if (form.keyRisks.length > 30) score += 7;
  if (form.revenueY1) score += 7;
  if (form.revenueY2) score += 5;
  if (form.revenueY3) score += 5;
  if (form.totalDebt) score += 5;
  if (form.customerConcentration) score += 5;
  if (form.legalConfirmed) score += 8;
  score += Math.min(docCount * 5, 10);
  return Math.min(100, score);
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
  const [mode, setMode] = useState<DealMode>("quick");

  const initialForm = {
    companyName: "", industry: "", revenue: "", ebitda: "", growthRate: "",
    revenueY1: "", revenueY2: "", revenueY3: "",
    totalDebt: "", customerConcentration: "",
    businessOverview: "", whySelling: "", growthDrivers: "", keyRisks: "",
    description: "", legalConfirmed: false,
  };
  const [form, setForm] = useState(initialForm);
  const [pendingDocs, setPendingDocs] = useState<DocumentVaultEntry[]>([]);
  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const liveScore = computeLiveScore(form, pendingDocs.length);

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

  const validQuick = !!(form.companyName && form.industry && form.revenue && form.ebitda && form.growthRate);
  const validVerified = validQuick && !!(form.businessOverview && form.whySelling && form.legalConfirmed);
  const canSubmit = mode === "quick" ? validQuick : validVerified;

  const create = useMutation({
    mutationFn: () => api.post<PrivateDeal>("/deals/private", {
      companyName: form.companyName,
      industry: form.industry,
      revenue: Number(form.revenue),
      ebitda: Number(form.ebitda),
      growthRate: Number(form.growthRate),
      dealMode: mode,
      revenueY1: form.revenueY1 ? Number(form.revenueY1) : undefined,
      revenueY2: form.revenueY2 ? Number(form.revenueY2) : undefined,
      revenueY3: form.revenueY3 ? Number(form.revenueY3) : undefined,
      totalDebt: form.totalDebt ? Number(form.totalDebt) : undefined,
      customerConcentration: form.customerConcentration ? Number(form.customerConcentration) / 100 : undefined,
      businessOverview: form.businessOverview || undefined,
      whySelling: form.whySelling || undefined,
      growthDrivers: form.growthDrivers || undefined,
      keyRisks: form.keyRisks || undefined,
      description: form.description || undefined,
      legalConfirmed: form.legalConfirmed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", "private"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      setOpen(false);
      setForm(initialForm);
      setPendingDocs([]);
      setMode("quick");
      toast({ title: mode === "verified" ? "Deal Room created" : "Draft deal saved", description: "Valuation & intelligence are being computed." });
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

  const ebitdaErr = form.revenue && form.ebitda && Number(form.ebitda) > Number(form.revenue);
  const growthWarn = form.growthRate && Number(form.growthRate) > 100;

  return (
    <PortalLayout
      title="Private Deals"
      subtitle="Analyze off-market opportunities privately"
      action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(initialForm); setPendingDocs([]); setMode("quick"); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-deal" disabled={atFreeLimit}>
              {atFreeLimit ? <><Lock className="h-4 w-4" /> Plan Limit Reached</> : <><Plus className="h-4 w-4" /> New Private Deal</>}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Private Deal</DialogTitle>
              <DialogDescription>Analyze an off-market opportunity. Only visible to you.</DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "quick" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                ⚡ Quick Deal
              </button>
              <button
                type="button"
                onClick={() => setMode("verified")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "verified" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                🔒 Verified Deal
              </button>
            </div>

            {mode === "verified" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Deal Quality</span>
                  <span className={`font-bold ${liveScore >= 70 ? "text-green-400" : liveScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {liveScore} / 100
                  </span>
                </div>
                <Progress value={liveScore} className={`h-2 [&>div]:${qualityColor(liveScore)}`} />
                <p className="text-xs text-muted-foreground">
                  {liveScore >= 70 ? "✅ Verified — high quality deal" : liveScore >= 40 ? "⚠️ Partially verified — add more details" : "🔴 Unverified — add narrative and documents"}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">1 · Basic Info</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Company Name *</Label>
                    <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Target Co (or codename)" className="mt-1.5" data-testid="input-deal-name" />
                  </div>
                  <div>
                    <Label>Industry *</Label>
                    <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                      <SelectTrigger className="mt-1.5" data-testid="select-deal-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Financials */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">2 · Financials</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Revenue (₹L) *</Label>
                    <Input type="number" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} className="mt-1.5 font-mono" data-testid="input-deal-revenue" />
                  </div>
                  <div>
                    <Label>EBITDA (₹L) *</Label>
                    <Input type="number" value={form.ebitda} onChange={(e) => set("ebitda", e.target.value)} className={`mt-1.5 font-mono ${ebitdaErr ? "border-destructive" : ""}`} data-testid="input-deal-ebitda" />
                    {ebitdaErr && <p className="text-xs text-destructive mt-1">EBITDA cannot exceed revenue</p>}
                  </div>
                  <div>
                    <Label>Growth (%) *</Label>
                    <Input type="number" value={form.growthRate} onChange={(e) => set("growthRate", e.target.value)} className={`mt-1.5 font-mono ${growthWarn ? "border-yellow-500" : ""}`} data-testid="input-deal-growth" />
                    {growthWarn && <p className="text-xs text-yellow-500 mt-1">Growth &gt;100% — verify</p>}
                  </div>
                </div>
                {mode === "verified" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Revenue Y-1 (₹L)</Label>
                        <Input type="number" value={form.revenueY1} onChange={(e) => set("revenueY1", e.target.value)} className="mt-1.5 font-mono" />
                      </div>
                      <div>
                        <Label>Revenue Y-2 (₹L)</Label>
                        <Input type="number" value={form.revenueY2} onChange={(e) => set("revenueY2", e.target.value)} className="mt-1.5 font-mono" />
                      </div>
                      <div>
                        <Label>Revenue Y-3 (₹L)</Label>
                        <Input type="number" value={form.revenueY3} onChange={(e) => set("revenueY3", e.target.value)} className="mt-1.5 font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Total Debt (₹L)</Label>
                        <Input type="number" value={form.totalDebt} onChange={(e) => set("totalDebt", e.target.value)} className="mt-1.5 font-mono" />
                      </div>
                      <div>
                        <Label>Customer Concentration (%)</Label>
                        <Input type="number" value={form.customerConcentration} onChange={(e) => set("customerConcentration", e.target.value)} min="0" max="100" className="mt-1.5 font-mono" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Section 3: Narrative */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">3 · Narrative</h4>
                <div>
                  <Label>Business Overview {mode === "verified" && <span className="text-destructive">*</span>}</Label>
                  <Textarea value={form.businessOverview} onChange={(e) => set("businessOverview", e.target.value)} placeholder="What does the company do? Key products, customers, markets…" rows={2} className="mt-1.5" />
                </div>
                <div>
                  <Label>Why Selling {mode === "verified" && <span className="text-destructive">*</span>}</Label>
                  <Textarea value={form.whySelling} onChange={(e) => set("whySelling", e.target.value)} placeholder="Promoter transition, capital for expansion, retirement…" rows={2} className="mt-1.5" />
                </div>
                {mode === "verified" && (
                  <>
                    <div>
                      <Label>Growth Drivers</Label>
                      <Textarea value={form.growthDrivers} onChange={(e) => set("growthDrivers", e.target.value)} placeholder="Expansion opportunities, product pipeline, untapped markets…" rows={2} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Key Risks</Label>
                      <Textarea value={form.keyRisks} onChange={(e) => set("keyRisks", e.target.value)} placeholder="Customer concentration, regulatory exposure, competition…" rows={2} className="mt-1.5" />
                    </div>
                  </>
                )}
                <div>
                  <Label>Notes (Internal)</Label>
                  <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Sourcing context, deal thesis…" rows={1} className="mt-1.5" />
                </div>
              </div>

              {/* Section 4: Documents (Verified only) */}
              {mode === "verified" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">4 · Documents</h4>
                  <p className="text-xs text-muted-foreground">Upload P&L, Balance Sheet, GST filings to unlock Verified status.</p>
                  {pendingDocs.length > 0 && (
                    <div className="space-y-1.5">
                      {pendingDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/40">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="flex-1 truncate">{doc.fileName}</span>
                          <Badge variant="outline" className="text-xs">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">Documents can be uploaded after creating the deal room.</p>
                </div>
              )}

              {/* Legal confirmation */}
              {mode === "verified" && (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <Checkbox
                    id="legal-confirm"
                    checked={form.legalConfirmed}
                    onCheckedChange={(v) => set("legalConfirmed", !!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="legal-confirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    <span className="font-medium text-foreground">I confirm this data is accurate</span> — I understand that submitting false financial information may constitute fraud and violate applicable laws. This confirmation is timestamped and associated with my account.
                  </label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => create.mutate()}
                disabled={!canSubmit || !!ebitdaErr || create.isPending}
                data-testid="button-create-deal"
              >
                {create.isPending ? "Creating…" : mode === "verified" ? "Create Deal Room" : "Save Draft Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <h3 className="font-semibold">No private deals yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add an off-market opportunity to get instant valuation, scenario analysis, and risk scoring.</p>
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
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {selected?.companyName}
              {selected && (() => {
                const t = trustBadge(selected.trustLevel);
                return <Badge variant="outline" className={`text-xs flex items-center gap-1 ${t.color}`}>{t.icon} {t.label}</Badge>;
              })()}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
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
  );
}
