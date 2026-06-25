import { useState } from "react";
import { Calculator, TrendingUp, IndianRupee, HelpCircle } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Result = {
  dcf: number;
  comparable: number;
  blended: number;
  evRevenue: number;
  evEbitda: number;
  bearCase: number;
  bullCase: number;
};

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

export default function ValuationPage() {
  const { data: user } = useCurrentUser();
  const isSeller = user?.role === "seller";

  const [revenue, setRevenue]     = useState("");
  const [ebitda, setEbitda]       = useState("");
  const [growth, setGrowth]       = useState("15");
  const [discount, setDiscount]   = useState("18");
  const [result, setResult]       = useState<Result | null>(null);

  const INDUSTRY_MULTIPLES: Record<string, { rev: number; ebitda: number; label: string }> = {
    "Technology":     { rev: 3.0, ebitda: 10.0, label: "Technology" },
    "Manufacturing":  { rev: 0.8, ebitda: 5.0,  label: "Manufacturing" },
    "Healthcare":     { rev: 1.5, ebitda: 7.0,  label: "Healthcare" },
    "Retail":         { rev: 0.5, ebitda: 4.5,  label: "Retail" },
    "Services":       { rev: 1.2, ebitda: 6.0,  label: "Services" },
    "E-commerce":     { rev: 2.0, ebitda: 8.0,  label: "E-commerce" },
    "Logistics":      { rev: 0.9, ebitda: 5.5,  label: "Logistics" },
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

    setResult({
      dcf:        dcfVal,
      comparable: comparableVal,
      blended:    blended,
      evRevenue:  rev > 0 ? blended / rev : 0,
      evEbitda:   ebt > 0 ? blended / ebt : 0,
      bearCase:   Math.round(blended * 0.75),
      bullCase:   Math.round(blended * 1.30),
    });
  }

  return (
    <PortalLayout
      title="Valuation Tool"
      subtitle={isSeller ? "Estimate what your business is worth" : "Quickly value any acquisition target"}
    >
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
              {/* Blended value */}
              <Card className="p-6 border-primary/30 bg-primary/5 stat-glow">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Enterprise Value</p>
                <p className="text-3xl num font-bold text-primary">{formatINR(result.blended)}</p>
                <p className="text-xs text-muted-foreground mt-1">Blended: 60% DCF + 40% Comparables</p>
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
                    { label: "DCF Value", value: formatINR(result.dcf) },
                    { label: "Comparable Value", value: formatINR(result.comparable) },
                    { label: "EV / Revenue", value: `${result.evRevenue.toFixed(1)}x` },
                    { label: "EV / EBITDA", value: `${result.evEbitda.toFixed(1)}x` },
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
                { label: "EV/EBITDA multiple", value: `${INDUSTRY_MULTIPLES[industry]?.ebitda.toFixed(1)}x` },
                { label: "Source", value: "Indian SME benchmarks" },
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
    </PortalLayout>
  );
}
