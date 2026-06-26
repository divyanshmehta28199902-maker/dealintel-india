import { useState } from "react";
import {
  Calculator, TrendingUp, IndianRupee, HelpCircle,
  Download, Brain, ThumbsUp, ThumbsDown, Users,
  BarChart2, CheckCircle2, AlertTriangle, ChevronRight,
  Lightbulb,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  computeInsights,
  type ValuationInsights,
  type BasicResult,
  type ValuationInputs,
} from "@/lib/valuationInsights";
import { downloadValuationReport } from "@/lib/valuationPDF";

type Result = BasicResult;

function computeDCF(ebitda: number, growth: number, years: number, discount: number): number {
  let fcf = ebitda;
  let pv = 0;
  for (let t = 1; t <= years; t++) {
    fcf = fcf * (1 + growth);
    pv += Math.max(fcf, 0) / Math.pow(1 + discount, t);
  }
  const terminalVal = (fcf * (1 + 0.03)) / (discount - 0.03);
  pv += Math.max(terminalVal, 0) / Math.pow(1 + discount, years);
  return Math.round(pv);
}

const CONFIDENCE_COLORS: Record<ValuationInsights["confidenceLabel"], string> = {
  Low:      "text-red-400 bg-red-500/10 border-red-500/20",
  Moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  High:     "text-green-400 bg-green-500/10 border-green-500/20",
};

const CONFIDENCE_BAR: Record<ValuationInsights["confidenceLabel"], string> = {
  Low:      "bg-red-500",
  Moderate: "bg-amber-500",
  High:     "bg-green-500",
};

export default function ValuationPage() {
  const { data: user } = useCurrentUser();
  const isSeller = user?.role === "seller";

  const [revenue, setRevenue]   = useState("");
  const [ebitda, setEbitda]     = useState("");
  const [growth, setGrowth]     = useState("15");
  const [discount, setDiscount] = useState("18");
  const [result, setResult]     = useState<Result | null>(null);
  const [insights, setInsights] = useState<ValuationInsights | null>(null);
  const [inputs, setInputs]     = useState<ValuationInputs | null>(null);

  const INDUSTRY_MULTIPLES: Record<string, { rev: number; ebitda: number; label: string }> = {
    "Technology":    { rev: 3.0, ebitda: 10.0, label: "Technology" },
    "Manufacturing": { rev: 0.8, ebitda: 5.0,  label: "Manufacturing" },
    "Healthcare":    { rev: 1.5, ebitda: 7.0,  label: "Healthcare" },
    "Retail":        { rev: 0.5, ebitda: 4.5,  label: "Retail" },
    "Services":      { rev: 1.2, ebitda: 6.0,  label: "Services" },
    "E-commerce":    { rev: 2.0, ebitda: 8.0,  label: "E-commerce" },
    "Logistics":     { rev: 0.9, ebitda: 5.5,  label: "Logistics" },
  };
  const [industry, setIndustry] = useState("Services");

  function compute() {
    const rev  = Number(revenue);
    const ebt  = Number(ebitda);
    const gr   = Number(growth) / 100;
    const disc = Number(discount) / 100;
    if (!rev || !ebt) return;

    const mult = INDUSTRY_MULTIPLES[industry] ?? INDUSTRY_MULTIPLES["Services"];
    const comparableVal = Math.round((ebt * mult.ebitda + rev * mult.rev) / 2);
    const dcfVal        = computeDCF(ebt, gr, 5, disc);
    const blended       = Math.round(dcfVal * 0.6 + comparableVal * 0.4);

    const r: Result = {
      dcf:        dcfVal,
      comparable: comparableVal,
      blended,
      evRevenue:  rev > 0 ? blended / rev : 0,
      evEbitda:   ebt > 0 ? blended / ebt : 0,
      bearCase:   Math.round(blended * 0.75),
      bullCase:   Math.round(blended * 1.30),
    };

    const inp: ValuationInputs = {
      revenue:       rev,
      ebitda:        ebt,
      industry,
      growth:        gr,
      discount:      disc,
      industryRev:   mult.rev,
      industryEbitda: mult.ebitda,
    };

    setResult(r);
    setInputs(inp);
    setInsights(computeInsights(inp, r));
  }

  function handleDownloadPDF() {
    if (!result || !insights || !inputs) return;
    downloadValuationReport(inputs, result, insights);
  }

  return (
    <PortalLayout
      title="Valuation Tool"
      subtitle={isSeller ? "Estimate what your business is worth" : "Quickly value any acquisition target"}
    >
      <div className="space-y-8">

        {/* ── Existing 2-col layout ─────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl">

          {/* Inputs */}
          <div className="space-y-5">
            <Card className="p-6 border-border">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Business Parameters
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Annual Revenue (₹ Lakhs)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      placeholder="e.g. 200"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">EBITDA (₹ Lakhs)</Label>
                    <Input
                      type="number"
                      value={ebitda}
                      onChange={(e) => setEbitda(e.target.value)}
                      placeholder="e.g. 40"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Industry</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.keys(INDUSTRY_MULTIPLES).map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setIndustry(ind)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          industry === ind
                            ? "bg-primary/15 border-primary/50 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Revenue Growth Rate (%/yr)</Label>
                    <Input
                      type="number"
                      value={growth}
                      onChange={(e) => setGrowth(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Discount Rate (%)</Label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Button
                  className="w-full gap-2 mt-2"
                  onClick={compute}
                  disabled={!revenue || !ebitda}
                >
                  <TrendingUp className="h-4 w-4" /> Compute Valuation
                </Button>
              </div>
            </Card>

            {/* Methodology note */}
            <Card className="p-4 border-border">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">DCF (60% weight):</span> 5-year discounted cash-flow with 3% terminal growth.</p>
                  <p><span className="font-medium text-foreground">Comparable (40% weight):</span> Industry EV/EBITDA and EV/Revenue multiples for Indian SMEs.</p>
                  <p>All figures in INR lakhs. This is a quick estimate — not investment advice.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {!result ? (
              <Card className="p-12 text-center border-border">
                <IndianRupee className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Enter business parameters and compute to see the valuation.</p>
              </Card>
            ) : (
              <>
                {/* Blended value — enhanced with method + confidence + range */}
                <Card className="p-6 border-primary/30 bg-primary/5 stat-glow">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Enterprise Value</p>
                  <p className="text-3xl num font-bold text-primary">{formatINR(result.blended)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Blended: 60% DCF + 40% Comparables</p>

                  {insights && (
                    <div className="mt-3 pt-3 border-t border-primary/20 grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Method Used</p>
                        <p className="text-xs font-medium mt-0.5">{insights.valuationMethod}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-xs font-medium mt-0.5">
                          {insights.confidence}% —{" "}
                          <span className={
                            insights.confidenceLabel === "High" ? "text-green-400" :
                            insights.confidenceLabel === "Moderate" ? "text-amber-400" : "text-red-400"
                          }>
                            {insights.confidenceLabel}
                          </span>
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Fair Value Range</p>
                        <p className="text-xs font-medium mt-0.5 num">
                          {formatINR(result.bearCase)} — {formatINR(result.bullCase)}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Scenarios */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Bear Case", value: result.bearCase, cls: "text-red-400" },
                    { label: "Base Case", value: result.blended, cls: "text-foreground" },
                    { label: "Bull Case", value: result.bullCase, cls: "text-green-400" },
                  ].map(({ label, value, cls }) => (
                    <Card key={label} className="p-3 border-border text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-sm num font-semibold mt-1 ${cls}`}>{formatINR(value)}</p>
                    </Card>
                  ))}
                </div>

                {/* Breakdown */}
                <Card className="p-5 border-border">
                  <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Breakdown</h3>
                  <div className="space-y-0 divide-y divide-border">
                    {[
                      { label: "DCF Value",         value: formatINR(result.dcf) },
                      { label: "Comparable Value",  value: formatINR(result.comparable) },
                      { label: "EV / Revenue",      value: `${result.evRevenue.toFixed(1)}x` },
                      { label: "EV / EBITDA",       value: `${result.evEbitda.toFixed(1)}x` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm num font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    For a binding valuation with full DCF scenarios, IRR, and MOIC analysis, open any deal in the Marketplace.
                  </p>
                </div>
              </>
            )}

            {/* Industry multiples reference */}
            <Card className="p-5 border-border">
              <h3 className="text-sm font-semibold mb-3">
                {INDUSTRY_MULTIPLES[industry]?.label ?? industry} Benchmarks
              </h3>
              <div className="space-y-0 divide-y divide-border">
                {[
                  { label: "EV/Revenue multiple", value: `${INDUSTRY_MULTIPLES[industry]?.rev.toFixed(1)}x` },
                  { label: "EV/EBITDA multiple",  value: `${INDUSTRY_MULTIPLES[industry]?.ebitda.toFixed(1)}x` },
                  { label: "Source",              value: "Indian SME benchmarks" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <Badge variant="outline" className="text-xs">{value}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Enhanced Analysis Panels (full-width, shown after compute) ── */}
        {result && insights && (
          <div className="max-w-4xl space-y-5">

            {/* Section header with PDF export */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">AI Valuation Analysis</h2>
                <Badge variant="outline" className="text-xs">Enterprise Grade</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs h-8"
                onClick={handleDownloadPDF}
              >
                <Download className="h-3.5 w-3.5" /> Download Valuation Report (PDF)
              </Button>
            </div>

            {/* AI Summary + Confidence (2-col) */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2 p-5 border-border">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" /> AI Valuation Summary
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p>
              </Card>

              <Card className="p-5 border-border">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Confidence Score</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl num font-bold">{insights.confidence}%</span>
                  <Badge className={`text-xs border ${CONFIDENCE_COLORS[insights.confidenceLabel]}`}>
                    {insights.confidenceLabel}
                  </Badge>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted mt-2 mb-3">
                  <div
                    className={`h-1.5 rounded-full transition-all ${CONFIDENCE_BAR[insights.confidenceLabel]}`}
                    style={{ width: `${insights.confidence}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insights.confidenceReason}</p>
              </Card>
            </div>

            {/* Key Drivers (2-col) */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 border-border">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5 text-green-400" /> Positive Drivers
                </h3>
                {insights.positiveDrivers.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.positiveDrivers.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No positive drivers identified from current inputs.</p>
                )}
              </Card>

              <Card className="p-5 border-border">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-400" /> Negative Drivers
                </h3>
                {insights.negativeDrivers.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.negativeDrivers.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No significant negative drivers from current inputs.</p>
                )}
              </Card>
            </div>

            {/* Scenario Analysis — enhanced with descriptions */}
            <Card className="p-5 border-border">
              <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" /> Scenario Analysis
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {insights.scenarioDescriptions.map((s) => {
                  const vals: Record<string, number> = {
                    Bear: result.bearCase,
                    Base: result.blended,
                    Bull: result.bullCase,
                  };
                  const cls: Record<string, string> = {
                    Bear: "text-red-400 border-red-500/20",
                    Base: "text-foreground border-border",
                    Bull: "text-green-400 border-green-500/20",
                  };
                  return (
                    <div key={s.label} className={`rounded-lg border p-4 ${cls[s.label]}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1">{s.label} Case</p>
                      <p className="text-xl num font-bold mb-2">{formatINR(vals[s.label])}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Sensitivity Analysis */}
            <Card className="p-5 border-border">
              <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Valuation Sensitivity Analysis
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Illustrative sensitivity on comparable market multiples — not a prediction of actual transaction values.
              </p>
              <div className="space-y-0 divide-y divide-border">
                <div className="grid grid-cols-3 pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Comparable EV</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Assumption</span>
                </div>
                {insights.sensitivity.map((row, i) => (
                  <div key={row.label} className="grid grid-cols-3 py-3 items-center">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className={`text-sm num font-semibold text-center ${
                      i === 0 ? "text-red-400" : i === 2 ? "text-green-400" : "text-foreground"
                    }`}>
                      {formatINR(row.value)}
                    </span>
                    <span className="text-xs text-muted-foreground text-right">{row.delta}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Investor Perspective (2-col) */}
            <Card className="p-5 border-border">
              <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> How Buyers May View This Business
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Positive Considerations
                  </p>
                  <ul className="space-y-2">
                    {insights.investorPositives.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Potential Concerns
                  </p>
                  <ul className="space-y-2">
                    {insights.investorConcerns.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-5 border-border">
              <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Recommended Actions
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <span className="text-xs font-bold text-primary shrink-0 mt-0.5 w-4">{i + 1}</span>
                    <span className="text-sm text-muted-foreground leading-snug">{rec}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                This analysis is generated from the parameters entered above and Indian SME benchmark data. It does not constitute investment advice or a formal valuation opinion. Actual transaction values depend on due diligence, market conditions, and negotiation outcomes.
              </p>
            </div>

          </div>
        )}

      </div>
    </PortalLayout>
  );
}
