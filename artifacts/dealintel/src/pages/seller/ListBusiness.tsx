import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, ArrowRight, Info } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { INDUSTRIES, STAGES, INDIAN_STATES } from "@/lib/format";
import type { Listing } from "@/lib/types";

interface FormState {
  companyName: string;
  industry: string;
  description: string;
  revenue: string;
  ebitda: string;
  revenueGrowthRate: string;
  askingValuation: string;
  debtRatio: string;
  customerConcentration: string;
  employeeCount: string;
  foundedYear: string;
  city: string;
  state: string;
  stage: string;
}

const initial: FormState = {
  companyName: "", industry: "", description: "", revenue: "", ebitda: "",
  revenueGrowthRate: "", askingValuation: "", debtRatio: "", customerConcentration: "",
  employeeCount: "", foundedYear: "", city: "", state: "", stage: "growth",
};

export default function ListBusiness() {
  const [form, setForm] = useState<FormState>(initial);
  const [declaration, setDeclaration] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createListing = useMutation({
    mutationFn: async () => {
      const revenue = Number(form.revenue);
      const ebitda = Number(form.ebitda);
      const listing = await api.post<Listing>("/listings", {
        companyName: form.companyName,
        industry: form.industry,
        description: form.description || undefined,
        revenue,
        ebitda,
        ebitdaMargin: revenue > 0 ? ebitda / revenue : undefined,
        revenueGrowthRate: form.revenueGrowthRate ? Number(form.revenueGrowthRate) / 100 : undefined,
        askingValuation: Number(form.askingValuation),
        debtRatio: form.debtRatio ? Number(form.debtRatio) / 100 : undefined,
        customerConcentration: form.customerConcentration ? Number(form.customerConcentration) / 100 : undefined,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        stage: form.stage,
      });
      // Accept declaration → activates the listing
      await api.post(`/listings/${listing.id}/declaration`, { accepted: true });
      return listing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings", "my"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "seller"] });
      toast({ title: "Listing published", description: "Your business is now live on the marketplace." });
      navigate("/seller/listings");
    },
    onError: (e) => toast({ title: "Failed to create listing", description: (e as Error).message, variant: "destructive" }),
  });

  const valid =
    form.companyName && form.industry && form.revenue && form.ebitda &&
    form.askingValuation && declaration;

  return (
    <PortalLayout title="List Your Business" subtitle="Provide accurate financials for an institutional-grade valuation">
      <div className="max-w-3xl">
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) createListing.mutate(); }}
          className="space-y-6"
        >
          {/* Company info */}
          <Card className="p-6 border-card-border">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Company Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Company Name *</Label>
                <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Acme Logistics Pvt Ltd" className="mt-1.5" data-testid="input-company-name" />
              </div>
              <div>
                <Label>Industry *</Label>
                <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                  <SelectTrigger className="mt-1.5" data-testid="select-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                  <SelectTrigger className="mt-1.5" data-testid="select-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1.5" data-testid="input-city" />
              </div>
              <div>
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger className="mt-1.5" data-testid="select-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employees</Label>
                <Input type="number" value={form.employeeCount} onChange={(e) => set("employeeCount", e.target.value)} placeholder="e.g. 45" className="mt-1.5" data-testid="input-employees" />
              </div>
              <div>
                <Label>Founded Year</Label>
                <Input type="number" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="e.g. 2015" className="mt-1.5" data-testid="input-founded" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief overview of the business, products, and market position…" className="mt-1.5" rows={3} data-testid="input-description" />
              </div>
            </div>
          </Card>

          {/* Financials */}
          <Card className="p-6 border-card-border">
            <h2 className="font-semibold mb-1">Financials</h2>
            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> All monetary values in <span className="font-mono">₹ Lakhs</span> (1 Cr = 100 L)
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Annual Revenue (₹L) *</Label>
                <Input type="number" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} placeholder="e.g. 1200" className="mt-1.5 font-mono" data-testid="input-revenue" />
              </div>
              <div>
                <Label>EBITDA (₹L) *</Label>
                <Input type="number" value={form.ebitda} onChange={(e) => set("ebitda", e.target.value)} placeholder="e.g. 240" className="mt-1.5 font-mono" data-testid="input-ebitda" />
              </div>
              <div>
                <Label>Revenue Growth (%/yr)</Label>
                <Input type="number" value={form.revenueGrowthRate} onChange={(e) => set("revenueGrowthRate", e.target.value)} placeholder="e.g. 18" className="mt-1.5 font-mono" data-testid="input-growth" />
              </div>
              <div>
                <Label>Asking Valuation (₹L) *</Label>
                <Input type="number" value={form.askingValuation} onChange={(e) => set("askingValuation", e.target.value)} placeholder="e.g. 2000" className="mt-1.5 font-mono" data-testid="input-asking" />
              </div>
              <div>
                <Label>Debt Ratio (%)</Label>
                <Input type="number" value={form.debtRatio} onChange={(e) => set("debtRatio", e.target.value)} placeholder="e.g. 30" className="mt-1.5 font-mono" data-testid="input-debt" />
              </div>
              <div>
                <Label>Top Customer Concentration (%)</Label>
                <Input type="number" value={form.customerConcentration} onChange={(e) => set("customerConcentration", e.target.value)} placeholder="e.g. 25" className="mt-1.5 font-mono" data-testid="input-concentration" />
              </div>
            </div>
          </Card>

          {/* Declaration */}
          <Card className="p-6 border-card-border">
            <div className="flex items-start gap-3">
              <Checkbox id="declaration" checked={declaration} onCheckedChange={(v) => setDeclaration(Boolean(v))} className="mt-0.5" data-testid="checkbox-declaration" />
              <Label htmlFor="declaration" className="text-sm font-normal leading-relaxed cursor-pointer">
                I confirm that all financial data provided is accurate and complete to the best of my
                knowledge. I understand that a timestamped declaration record will be stored.
              </Label>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!valid || createListing.isPending} className="gap-2" data-testid="button-publish">
              {createListing.isPending ? "Publishing…" : "Publish Listing"} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/seller/dashboard")}>Cancel</Button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
