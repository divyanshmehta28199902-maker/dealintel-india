import { useState, useEffect } from "react";
import {
  Building2, ChevronLeft, ChevronRight, Save, DollarSign, BookOpen,
  Upload, Eye, CheckCircle2, AlertCircle, Info, FileText, Shield,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { INDUSTRIES, formatINR } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type DealMode = "quick" | "verified";

export interface WizardPayload {
  companyName: string;
  industry: string;
  revenue: number;
  ebitda: number;
  growthRate: number;
  dealMode: DealMode;
  revenueY1?: number;
  revenueY2?: number;
  revenueY3?: number;
  totalDebt?: number;
  customerConcentration?: number;
  businessOverview?: string;
  whySelling?: string;
  growthDrivers?: string;
  keyRisks?: string;
  description?: string;
  legalConfirmed: boolean;
}

export interface WizardForm {
  companyName: string; industry: string; customIndustry: string;
  businessLocation: string; yearEstablished: string; employeeCount: string;
  ownershipAvailable: string; website: string; businessType: string; revenueModel: string;
  revenue: string; ebitda: string; growthRate: string; askingPrice: string;
  totalDebt: string; cashBalance: string; customerConcentration: string;
  recurringRevenue: string; revenueY1: string; revenueY2: string; revenueY3: string;
  businessOverview: string; productsServices: string; customerBase: string;
  competitiveAdvantages: string; growthDrivers: string; whySelling: string;
  keyRisks: string; expansionOpportunities: string; managementTeam: string;
  description: string;
  mode: DealMode; legalConfirmed: boolean;
}

const INITIAL_FORM: WizardForm = {
  companyName: "", industry: "", customIndustry: "", businessLocation: "",
  yearEstablished: "", employeeCount: "", ownershipAvailable: "", website: "",
  businessType: "", revenueModel: "",
  revenue: "", ebitda: "", growthRate: "", askingPrice: "", totalDebt: "",
  cashBalance: "", customerConcentration: "", recurringRevenue: "",
  revenueY1: "", revenueY2: "", revenueY3: "",
  businessOverview: "", productsServices: "", customerBase: "",
  competitiveAdvantages: "", growthDrivers: "", whySelling: "", keyRisks: "",
  expansionOpportunities: "", managementTeam: "", description: "",
  mode: "quick", legalConfirmed: false,
};

const STEP_TITLES = [
  "Basic Information", "Financial Information", "Business Narrative",
  "Documents & Verification", "Review & Submit",
];
const STEP_ICONS = [Building2, DollarSign, BookOpen, Upload, Eye];

const BUSINESS_TYPES = [
  "Private Limited", "LLP", "Proprietorship", "Partnership",
  "Public Limited", "Trust / NGO", "Other",
];
const REVENUE_MODELS = [
  "B2B Product", "B2C Product", "B2B Service", "B2C Service", "SaaS",
  "Marketplace", "Subscription", "Manufacturing", "Distribution / Trading",
  "Franchise", "Other",
];

const DRAFT_KEY = "dealintel_pd_wizard_v1";

function saveDraft(form: WizardForm, step: number) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step })); } catch { /* ignore */ }
}
function loadDraft(): { form: WizardForm; step: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { form: WizardForm; step: number }) : null;
  } catch { return null; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

function computeQualityScore(form: WizardForm): number {
  let s = 0;
  if (form.companyName) s += 8;
  if (form.industry) s += 5;
  if (form.businessLocation) s += 2;
  if (form.yearEstablished) s += 1;
  if (form.employeeCount) s += 1;
  if (form.revenue) s += 6;
  if (form.ebitda) s += 5;
  if (form.growthRate) s += 3;
  if (form.revenueY1) s += 3;
  if (form.revenueY2) s += 2;
  if (form.revenueY3) s += 2;
  if (form.totalDebt) s += 2;
  if (form.customerConcentration) s += 2;
  if (form.businessOverview.length > 50) s += 12;
  if (form.whySelling.length > 30) s += 10;
  if (form.growthDrivers.length > 30) s += 5;
  if (form.keyRisks.length > 30) s += 5;
  if (form.productsServices.length > 20) s += 3;
  if (form.legalConfirmed) s += 9;
  return Math.min(100, s);
}

function qualityInfo(score: number): { text: string; colorClass: string; barClass: string } {
  if (score >= 90) return { text: "Investor Ready", colorClass: "text-green-400", barClass: "[&>div]:bg-green-500" };
  if (score >= 70) return { text: "Good Quality", colorClass: "text-blue-400", barClass: "[&>div]:bg-blue-500" };
  if (score >= 45) return { text: "Basic Listing", colorClass: "text-yellow-400", barClass: "[&>div]:bg-yellow-500" };
  return { text: "Needs More Information", colorClass: "text-red-400", barClass: "[&>div]:bg-red-500" };
}

function QualityBar({ form }: { form: WizardForm }) {
  const score = computeQualityScore(form);
  const { text, colorClass, barClass } = qualityInfo(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Deal Quality</span>
        <span className={`font-bold ${colorClass}`}>{score} / 100 — {text}</span>
      </div>
      <Progress value={score} className={`h-2 ${barClass}`} />
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ─── Step 1: Basic Information ─── */
function Step1({ form, set }: { form: WizardForm; set: (k: keyof WizardForm, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      <FieldRow>
        <Field label="Company Name" required>
          <Input
            value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
            placeholder="Target Co. (or codename)" data-testid="input-deal-name"
          />
        </Field>
        <Field label="Industry" required>
          <Select value={form.industry} onValueChange={(v) => { set("industry", v); if (v !== "Other") set("customIndustry", ""); }}>
            <SelectTrigger data-testid="select-deal-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto z-[9999]">
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          {form.industry === "Other" && (
            <Input
              value={form.customIndustry} onChange={(e) => set("customIndustry", e.target.value)}
              placeholder="Describe industry…" className="mt-2" data-testid="input-deal-custom-industry"
            />
          )}
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Business Location" hint="City, State (e.g. Mumbai, Maharashtra)">
          <Input value={form.businessLocation} onChange={(e) => set("businessLocation", e.target.value)} placeholder="Mumbai, Maharashtra" />
        </Field>
        <Field label="Year Established">
          <Input type="number" value={form.yearEstablished} onChange={(e) => set("yearEstablished", e.target.value)} placeholder="2010" min="1900" max={new Date().getFullYear()} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Employee Count">
          <Input type="number" value={form.employeeCount} onChange={(e) => set("employeeCount", e.target.value)} placeholder="50" min="1" />
        </Field>
        <Field label="Ownership Available for Sale (%)" hint="0–100">
          <Input type="number" value={form.ownershipAvailable} onChange={(e) => set("ownershipAvailable", e.target.value)} placeholder="100" min="1" max="100" />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Business Type">
          <Select value={form.businessType} onValueChange={(v) => set("businessType", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent className="z-[9999]">
              {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Revenue Model">
          <Select value={form.revenueModel} onValueChange={(v) => set("revenueModel", v)}>
            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent className="z-[9999]">
              {REVENUE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </FieldRow>
      <Field label="Website (Optional)">
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" type="url" />
      </Field>
    </div>
  );
}

/* ─── Step 2: Financial Information ─── */
function Step2({ form, set }: { form: WizardForm; set: (k: keyof WizardForm, v: string | boolean) => void }) {
  const rev = Number(form.revenue) || 0;
  const ebitda = Number(form.ebitda) || 0;
  const ebitdaMargin = rev > 0 ? ((ebitda / rev) * 100).toFixed(1) : "—";
  const ebitdaErr = form.revenue && form.ebitda && ebitda > rev;
  const growthWarn = form.growthRate && Number(form.growthRate) > 100;

  const y1 = Number(form.revenueY1) || 0;
  const y3 = Number(form.revenueY3) || 0;
  let cagr = "—";
  if (y1 > 0 && y3 > 0 && y1 !== y3) {
    const c = (Math.pow(y1 / y3, 1 / 2) - 1) * 100;
    cagr = `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`;
  }

  const healthScore = (() => {
    let h = 0;
    const margin = rev > 0 ? (ebitda / rev) * 100 : 0;
    if (margin > 25) h += 35;
    else if (margin > 15) h += 25;
    else if (margin > 5) h += 15;
    const gr = Number(form.growthRate) || 0;
    if (gr > 30) h += 35;
    else if (gr > 15) h += 25;
    else if (gr > 5) h += 15;
    const debtRatio = rev > 0 ? (Number(form.totalDebt) || 0) / rev : 0;
    if (debtRatio < 0.3) h += 20;
    else if (debtRatio < 0.6) h += 10;
    const cc = Number(form.customerConcentration) || 0;
    if (cc > 0 && cc < 20) h += 10;
    else if (cc >= 20 && cc < 40) h += 5;
    return Math.min(100, h);
  })();

  const healthLabel = healthScore >= 70 ? "Strong" : healthScore >= 40 ? "Moderate" : "Weak";
  const healthColor = healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <FieldRow>
          <Field label="Annual Revenue (₹L)" required>
            <Input type="number" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} className="font-mono" data-testid="input-deal-revenue" placeholder="500" />
          </Field>
          <Field label="EBITDA (₹L)" required error={ebitdaErr ? "EBITDA cannot exceed revenue" : undefined}>
            <Input type="number" value={form.ebitda} onChange={(e) => set("ebitda", e.target.value)} className={`font-mono ${ebitdaErr ? "border-destructive" : ""}`} data-testid="input-deal-ebitda" placeholder="80" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Growth Rate (%)" required hint={growthWarn ? "Growth >100% — verify this figure" : undefined}>
            <Input type="number" value={form.growthRate} onChange={(e) => set("growthRate", e.target.value)} className={`font-mono ${growthWarn ? "border-yellow-500" : ""}`} data-testid="input-deal-growth" placeholder="25" />
          </Field>
          <Field label="Asking Price (₹L)" hint="Leave blank if flexible">
            <Input type="number" value={form.askingPrice} onChange={(e) => set("askingPrice", e.target.value)} className="font-mono" placeholder="2000" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Total Debt (₹L)">
            <Input type="number" value={form.totalDebt} onChange={(e) => set("totalDebt", e.target.value)} className="font-mono" placeholder="0" />
          </Field>
          <Field label="Cash Balance (₹L)">
            <Input type="number" value={form.cashBalance} onChange={(e) => set("cashBalance", e.target.value)} className="font-mono" placeholder="50" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Customer Concentration (%)" hint="Top customer as % of revenue">
            <Input type="number" value={form.customerConcentration} onChange={(e) => set("customerConcentration", e.target.value)} min="0" max="100" className="font-mono" placeholder="30" />
          </Field>
          <Field label="Recurring Revenue (%)">
            <Input type="number" value={form.recurringRevenue} onChange={(e) => set("recurringRevenue", e.target.value)} min="0" max="100" className="font-mono" placeholder="60" />
          </Field>
        </FieldRow>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Revenue — Last 3 Years (₹L)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Year -1">
              <Input type="number" value={form.revenueY1} onChange={(e) => set("revenueY1", e.target.value)} className="font-mono" placeholder="450" />
            </Field>
            <Field label="Year -2">
              <Input type="number" value={form.revenueY2} onChange={(e) => set("revenueY2", e.target.value)} className="font-mono" placeholder="380" />
            </Field>
            <Field label="Year -3">
              <Input type="number" value={form.revenueY3} onChange={(e) => set("revenueY3", e.target.value)} className="font-mono" placeholder="300" />
            </Field>
          </div>
        </div>
      </div>

      {/* Financial summary card */}
      <div className="space-y-3">
        <Card className="p-4 border-card-border bg-muted/30 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial Summary</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">EBITDA Margin</span>
              <span className="font-mono font-semibold">{ebitdaMargin}{typeof ebitdaMargin === "string" && ebitdaMargin !== "—" ? "%" : ""}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Revenue CAGR</span>
              <span className="font-mono font-semibold">{cagr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Asking Price</span>
              <span className="font-mono font-semibold text-xs">{form.askingPrice ? formatINR(Number(form.askingPrice)) : "—"}</span>
            </div>
            {form.revenue && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-mono font-semibold text-xs">{formatINR(rev)}</span>
              </div>
            )}
          </div>
          <Separator />
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Financial Health</span>
              <span className={`text-xs font-bold ${healthColor}`}>{healthLabel}</span>
            </div>
            <Progress value={healthScore} className={`h-1.5 ${healthScore >= 70 ? "[&>div]:bg-green-500" : healthScore >= 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`} />
          </div>
        </Card>
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-primary/5 border border-primary/15">
          <Info className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>Enter historical revenue to unlock Revenue CAGR calculation and improve valuation accuracy.</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Business Narrative ─── */
function Step3({ form, set, mode }: { form: WizardForm; set: (k: keyof WizardForm, v: string | boolean) => void; mode: DealMode }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Business Overview" required={mode === "verified"} hint="What does the company do? Key products, customers, markets.">
          <Textarea value={form.businessOverview} onChange={(e) => set("businessOverview", e.target.value)} rows={3} className="resize-none" placeholder="A leading manufacturer of…" />
        </Field>
        <Field label="Products & Services">
          <Textarea value={form.productsServices} onChange={(e) => set("productsServices", e.target.value)} rows={3} className="resize-none" placeholder="Core product lines, key SKUs, service offerings…" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Customer Base">
          <Textarea value={form.customerBase} onChange={(e) => set("customerBase", e.target.value)} rows={2} className="resize-none" placeholder="Primary customer segments, geographies…" />
        </Field>
        <Field label="Competitive Advantages">
          <Textarea value={form.competitiveAdvantages} onChange={(e) => set("competitiveAdvantages", e.target.value)} rows={2} className="resize-none" placeholder="Proprietary tech, brand moat, cost advantages…" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Growth Drivers">
          <Textarea value={form.growthDrivers} onChange={(e) => set("growthDrivers", e.target.value)} rows={2} className="resize-none" placeholder="Expansion opportunities, product pipeline, untapped markets…" />
        </Field>
        <Field label="Why Selling" required={mode === "verified"}>
          <Textarea value={form.whySelling} onChange={(e) => set("whySelling", e.target.value)} rows={2} className="resize-none" placeholder="Promoter transition, retirement, capital for expansion…" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Key Risks">
          <Textarea value={form.keyRisks} onChange={(e) => set("keyRisks", e.target.value)} rows={2} className="resize-none" placeholder="Customer concentration, regulatory exposure, competition…" />
        </Field>
        <Field label="Expansion Opportunities">
          <Textarea value={form.expansionOpportunities} onChange={(e) => set("expansionOpportunities", e.target.value)} rows={2} className="resize-none" placeholder="New geographies, product adjacencies…" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Management Team">
          <Textarea value={form.managementTeam} onChange={(e) => set("managementTeam", e.target.value)} rows={2} className="resize-none" placeholder="Founders, key hires, retention plan…" />
        </Field>
        <Field label="Internal Notes" hint="Sourcing context, deal thesis — visible only to you.">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="resize-none" placeholder="Sourcing context, deal thesis…" />
        </Field>
      </div>
    </div>
  );
}

/* ─── Step 4: Documents & Verification ─── */
const DOC_CARDS: { label: string; required: boolean; icon: string }[] = [
  { label: "Profit & Loss Statement", required: true, icon: "📊" },
  { label: "Balance Sheet", required: true, icon: "📋" },
  { label: "GST Returns", required: true, icon: "🧾" },
  { label: "Income Tax Returns", required: false, icon: "📄" },
  { label: "Pitch Deck", required: false, icon: "📑" },
  { label: "Company Registration", required: true, icon: "🏢" },
  { label: "PAN / GST Verification", required: true, icon: "🔒" },
  { label: "Customer List", required: false, icon: "👥" },
  { label: "Vendor List", required: false, icon: "🤝" },
  { label: "Certificates & Awards", required: false, icon: "🏆" },
];

function Step4({ form, set }: { form: WizardForm; set: (k: keyof WizardForm, v: string | boolean) => void }) {
  const mode = form.mode;
  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div>
        <p className="text-sm font-medium mb-3">Deal Type</p>
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => set("mode", "quick")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "quick" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            ⚡ Quick Deal
            <span className="block text-xs font-normal text-muted-foreground mt-0.5">Minimal documentation</span>
          </button>
          <button
            type="button"
            onClick={() => set("mode", "verified")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "verified" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            🔒 Verified Deal
            <span className="block text-xs font-normal text-muted-foreground mt-0.5">Full documentation + higher trust score</span>
          </button>
        </div>
      </div>

      {/* Document cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Document Checklist</p>
          <Badge variant="outline" className="text-xs">Uploaded after deal creation</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {DOC_CARDS.filter((d) => mode === "verified" || !d.required).concat(
            mode === "quick" ? DOC_CARDS.filter((d) => d.required) : []
          ).reduce<typeof DOC_CARDS>((acc, d) => acc.find((x) => x.label === d.label) ? acc : [...acc, d], []).map((doc) => (
            <div
              key={doc.label}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                mode === "verified" && doc.required
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/20"
              }`}
            >
              <span className="text-lg">{doc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.label}</p>
                {mode === "verified" && doc.required
                  ? <p className="text-xs text-primary">Required for verification</p>
                  : <p className="text-xs text-muted-foreground">Optional</p>
                }
              </div>
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Upload className="h-3 w-3" />
          Documents are uploaded in the Deal Room after creation
        </p>
      </div>

      {/* Legal confirmation (verified only) */}
      {mode === "verified" && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/20">
          <Checkbox
            id="wizard-legal"
            checked={form.legalConfirmed}
            onCheckedChange={(v) => set("legalConfirmed", !!v)}
            className="mt-0.5"
          />
          <label htmlFor="wizard-legal" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            <span className="font-medium text-foreground">I confirm this data is accurate</span> — I understand that submitting false financial information may constitute fraud and violate applicable laws. This confirmation is timestamped and associated with my account.
          </label>
        </div>
      )}
    </div>
  );
}

/* ─── Step 5: Review & Submit ─── */
function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="p-4 border-card-border">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </Card>
  );
}

function Step5({ form }: { form: WizardForm }) {
  const rev = Number(form.revenue) || 0;
  const ebitda = Number(form.ebitda) || 0;
  const gr = Number(form.growthRate) || 0;
  const ebitdaMargin = rev > 0 ? ((ebitda / rev) * 100).toFixed(1) + "%" : "—";

  const missing: string[] = [];
  if (!form.businessLocation) missing.push("Business location");
  if (!form.yearEstablished) missing.push("Year established");
  if (!form.employeeCount) missing.push("Employee count");
  if (!form.revenueY1 || !form.revenueY2 || !form.revenueY3) missing.push("Historical revenue (Y1–Y3)");
  if (!form.businessOverview) missing.push("Business overview");
  if (!form.whySelling) missing.push("Reason for sale");
  if (!form.growthDrivers) missing.push("Growth drivers");

  const score = computeQualityScore(form);
  const { text: qText, colorClass } = qualityInfo(score);

  const lowEV = rev > 0 && ebitda > 0 ? (ebitda * 5).toFixed(0) : null;
  const highEV = rev > 0 && ebitda > 0 ? (ebitda * 8 * (1 + gr / 100 * 0.3)).toFixed(0) : null;

  return (
    <div className="space-y-4">
      {/* Quality + valuation banner */}
      <Card className="p-4 border-card-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Deal Quality Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
              <span className="text-muted-foreground text-sm">/100</span>
              <Badge variant="outline" className={`text-xs border-current ${colorClass}`}>{qText}</Badge>
            </div>
            <Progress value={score} className={`h-1.5 mt-2 w-48 ${score >= 70 ? "[&>div]:bg-green-500" : score >= 45 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`} />
          </div>
          {lowEV && highEV && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Estimated EV Range</p>
              <p className="text-lg font-bold font-mono">{formatINR(Number(lowEV))} – {formatINR(Number(highEV))}</p>
              <p className="text-xs text-muted-foreground">Indicative only · 5–8× EBITDA</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <SectionCard title="Business" icon={Building2}>
          <SummaryRow label="Company" value={form.companyName} />
          <SummaryRow label="Industry" value={form.industry === "Other" ? form.customIndustry : form.industry} />
          <SummaryRow label="Location" value={form.businessLocation} />
          <SummaryRow label="Type" value={form.businessType} />
          <SummaryRow label="Model" value={form.revenueModel} />
          <SummaryRow label="Founded" value={form.yearEstablished} />
          <SummaryRow label="Employees" value={form.employeeCount} />
        </SectionCard>

        <SectionCard title="Financials" icon={DollarSign}>
          <SummaryRow label="Revenue" value={rev > 0 ? formatINR(rev) : ""} />
          <SummaryRow label="EBITDA" value={ebitda > 0 ? formatINR(ebitda) : ""} />
          <SummaryRow label="EBITDA Margin" value={ebitdaMargin} />
          <SummaryRow label="Growth Rate" value={form.growthRate ? `${form.growthRate}%` : ""} />
          <SummaryRow label="Asking Price" value={form.askingPrice ? formatINR(Number(form.askingPrice)) : ""} />
          <SummaryRow label="Total Debt" value={form.totalDebt ? formatINR(Number(form.totalDebt)) : ""} />
          <SummaryRow label="Deal Mode" value={form.mode === "verified" ? "🔒 Verified Deal" : "⚡ Quick Deal"} />
        </SectionCard>
      </div>

      <SectionCard title="Narrative" icon={BookOpen}>
        {form.businessOverview
          ? <p className="text-sm text-muted-foreground line-clamp-3">{form.businessOverview}</p>
          : <p className="text-sm text-muted-foreground italic">No overview provided</p>
        }
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {form.whySelling && <SummaryRow label="Why Selling" value={form.whySelling.substring(0, 60) + (form.whySelling.length > 60 ? "…" : "")} />}
          {form.growthDrivers && <SummaryRow label="Growth Drivers" value={form.growthDrivers.substring(0, 60) + (form.growthDrivers.length > 60 ? "…" : "")} />}
        </div>
      </SectionCard>

      {/* Missing information */}
      {missing.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Missing information</p>
              <p className="text-xs text-muted-foreground mt-1">Adding these will improve your deal quality score:</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missing.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs border-amber-500/40 text-amber-400">{m}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Verification status */}
      <div className="flex items-center gap-2 text-sm">
        {form.mode === "verified" && form.legalConfirmed
          ? <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-green-400 font-medium">Legal confirmation accepted — Verified Deal</span></>
          : form.mode === "verified"
            ? <><AlertCircle className="h-4 w-4 text-amber-400" /><span className="text-amber-400">Legal confirmation required for Verified Deal</span></>
            : <><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Quick Deal — analysis runs immediately</span></>
        }
      </div>
    </div>
  );
}

/* ─── Main Wizard ─── */
interface PrivateDealWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: WizardPayload) => void;
  isPending: boolean;
}

export function PrivateDealWizard({ open, onOpenChange, onSubmit, isPending }: PrivateDealWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [hasDraft, setHasDraft] = useState(false);

  const set = (k: keyof WizardForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft) {
        setForm(draft.form);
        setStep(draft.step);
        setHasDraft(true);
      } else {
        setHasDraft(false);
      }
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    clearDraft();
    setHasDraft(false);
    onOpenChange(false);
  };

  const handleSaveDraft = () => {
    saveDraft(form, step);
    setHasDraft(true);
    toast({ title: "Draft saved", description: "Your progress has been saved. It will reopen where you left off." });
  };

  const industryValue = form.industry === "Other" ? form.customIndustry : form.industry;

  const canGoNext = (): boolean => {
    if (step === 1) return !!(form.companyName && form.industry && (form.industry !== "Other" || form.customIndustry));
    if (step === 2) {
      const rev = Number(form.revenue);
      const ebitda = Number(form.ebitda);
      return !!(form.revenue && form.ebitda && form.growthRate && ebitda <= rev);
    }
    if (step === 3) return form.mode === "quick" || !!(form.businessOverview && form.whySelling);
    if (step === 4) return form.mode === "quick" || form.legalConfirmed;
    return true;
  };

  const handleSubmit = () => {
    const payload: WizardPayload = {
      companyName: form.companyName,
      industry: industryValue,
      revenue: Number(form.revenue),
      ebitda: Number(form.ebitda),
      growthRate: Number(form.growthRate),
      dealMode: form.mode,
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
    };
    onSubmit(payload);
    clearDraft();
    setForm(INITIAL_FORM);
    setStep(1);
    setHasDraft(false);
  };

  const StepIcon = STEP_ICONS[step - 1];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          {/* Draft banner */}
          {hasDraft && (
            <div className="flex items-center gap-2 mb-3 text-xs text-primary bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
              <Save className="h-3 w-3 shrink-0" />
              <span>Draft restored — continuing where you left off</span>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <StepIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Step {step} of 5</p>
                {step < 5 && <Badge variant="outline" className="text-xs h-5">New Private Deal</Badge>}
              </div>
              <p className="font-semibold text-sm">{STEP_TITLES[step - 1]}</p>
            </div>
          </div>

          {/* Progress bar + step pills */}
          <Progress value={(step / 5) * 100} className="h-1.5 mb-3 [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-300" />
          <div className="flex gap-1">
            {STEP_TITLES.map((title, i) => (
              <div
                key={title}
                className={`flex-1 h-1 rounded-full transition-colors ${i + 1 <= step ? "bg-primary/60" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {/* Quality bar (always visible) */}
        <div className="px-6 py-3 border-b border-border shrink-0">
          <QualityBar form={form} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && <Step1 form={form} set={set} />}
          {step === 2 && <Step2 form={form} set={set} />}
          {step === 3 && <Step3 form={form} set={set} mode={form.mode} />}
          {step === 4 && <Step4 form={form} set={set} />}
          {step === 5 && <Step5 form={form} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />Save Draft
            </Button>
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
            )}
            {step < 5 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canGoNext()} data-testid="wizard-next">
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canGoNext() || isPending}
                data-testid="button-create-deal"
                className="gap-2"
              >
                {isPending ? "Creating…" : form.mode === "verified" ? "🔒 Create Deal Room" : "⚡ Save Draft Deal"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
