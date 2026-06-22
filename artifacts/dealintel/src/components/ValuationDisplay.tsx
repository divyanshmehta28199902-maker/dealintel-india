import { TrendingUp, Calculator, Target, Gauge, TrendingDown, BarChart3, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR } from "@/lib/format";
import type { ValuationResult, ScenarioResult } from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function tagColor(tag: string) {
  if (tag === "Undervalued") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (tag === "Overvalued") return "bg-destructive/15 text-destructive border-destructive/30";
  if (tag.includes("Distressed") || tag.includes("Turnaround")) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function riskLabelColor(label: string) {
  if (label === "High Risk" || label === "Turnaround Case") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (label === "High Growth") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (label === "High Quality") return "bg-green-500/15 text-green-400 border-green-500/30";
  return "bg-muted/50 text-muted-foreground border-border";
}

function scenarioBg(label: ScenarioResult["label"]) {
  if (label === "Bear") return "border-red-500/30 bg-red-500/5";
  if (label === "Bull") return "border-green-500/30 bg-green-500/5";
  return "border-blue-500/30 bg-blue-500/5";
}

function scenarioTextColor(label: ScenarioResult["label"]) {
  if (label === "Bear") return "text-red-400";
  if (label === "Bull") return "text-green-400";
  return "text-blue-400";
}

const scenarioTooltips: Record<ScenarioResult["label"], string> = {
  Bear: "Downside case — lower growth and higher risk premium applied.",
  Base: "Base case — expected scenario using current inputs.",
  Bull: "Optimistic case — strong growth with lower discount rate.",
};

function formatPct(pct: number) {
  if (pct === 0) return null;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ValuationDisplay({ v }: { v: ValuationResult }) {
  const priceSafe = Math.max(0, v.suggestedPrice);
  const irrDisplay = v.irr === null ? "N/A" : `${v.irr}%`;
  const moicDisplay = v.moic === null ? "N/A" : `${v.moic}x`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Loss-making warning */}
        {v.isLossMaking && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-300 leading-snug">
              This company is currently loss-making. Valuation is based on{" "}
              <strong>revenue and growth potential</strong>, not profitability.
              IRR may not be meaningful without positive free cash flows.
            </p>
          </div>
        )}

        {/* DCF not meaningful note */}
        {v.dcfNotMeaningful && !v.isLossMaking && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
            <Info className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-300 leading-snug">
              DCF not applicable — all projected free cash flows are negative. Valuation is based on{" "}
              comparable multiples only.
            </p>
          </div>
        )}

        {/* Headline */}
        <Card className="p-5 border-card-border stat-glow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Suggested Deal Price</p>
              {priceSafe > 0 ? (
                <p className="text-3xl font-bold font-mono mt-1">{formatINR(priceSafe)}</p>
              ) : (
                <div className="mt-1">
                  <p className="text-2xl font-bold font-mono text-orange-400">₹0</p>
                  <p className="text-xs text-orange-400/80 mt-0.5">Distressed / Turnaround Case</p>
                </div>
              )}
              {v.rangeMin > 0 || v.rangeMax > 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Range {formatINR(v.rangeMin)} – {formatINR(v.rangeMax)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={`${tagColor(v.tag)} text-xs`}>{v.tag}</Badge>
              <Badge variant="outline" className={`${riskLabelColor(v.riskLabel)} text-xs`}>{v.riskLabel}</Badge>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Confidence
              </span>
              <span className="font-mono">{Math.round(v.confidenceScore * 100)}%</span>
            </div>
            <Progress value={v.confidenceScore * 100} className="h-1.5" />
          </div>
        </Card>

        {/* Scenario Analysis */}
        {v.scenarios.length > 0 && (
          <Card className="p-5 border-card-border">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Scenario Analysis</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  Bear / Base / Bull always shown in ascending order. Percentages show deviation from the Base case.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {v.scenarios.map((s) => {
                const pctStr = formatPct(s.pctFromBase);
                return (
                  <Tooltip key={s.label}>
                    <TooltipTrigger asChild>
                      <div className={`text-center p-3 rounded-lg border ${scenarioBg(s.label)} cursor-default`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${scenarioTextColor(s.label)}`}>
                          {s.label}
                        </p>
                        <p className={`text-lg font-bold font-mono ${scenarioTextColor(s.label)}`}>
                          {s.valuation > 0 ? formatINR(s.valuation) : "₹0"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(s.growthRate * 100).toFixed(0)}% growth · {(s.discountRate * 100).toFixed(0)}% WACC
                        </p>
                        {pctStr && (
                          <p className={`text-xs font-mono font-semibold mt-1 ${s.pctFromBase < 0 ? "text-red-400" : "text-green-400"}`}>
                            {pctStr} vs base
                          </p>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {scenarioTooltips[s.label]}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </Card>
        )}

        {/* IRR / MOIC / Payback */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">IRR</p>
            {v.irr === null ? (
              <>
                <p className="text-lg font-bold font-mono mt-1 text-muted-foreground">N/A</p>
                <p className="text-xs text-muted-foreground">Not meaningful</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono mt-1 text-primary">{irrDisplay}</p>
                <p className="text-xs text-muted-foreground">5-yr hold</p>
              </>
            )}
          </Card>
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MOIC</p>
            {v.moic === null ? (
              <>
                <p className="text-lg font-bold font-mono mt-1 text-muted-foreground">N/A</p>
                <p className="text-xs text-muted-foreground">Not meaningful</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono mt-1 text-green-400">{moicDisplay}</p>
                <p className="text-xs text-muted-foreground">multiple on capital</p>
              </>
            )}
          </Card>
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Payback</p>
            <p className="text-2xl font-bold font-mono mt-1">
              {v.paybackYears >= 5 ? "5yr+" : `${v.paybackYears}yr`}
            </p>
            <p className="text-xs text-muted-foreground">FCF recovery</p>
          </Card>
        </div>

        {/* Two methods */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Comparable EV */}
          <Card className="p-5 border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Comparable EV</h3>
              {v.isLossMaking && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-orange-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    EBITDA is negative — revenue multiple used instead of EBITDA multiple.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {v.isLossMaking ? (
              <>
                <p className="text-xs text-orange-400 font-medium mb-2">⚠️ N/A (Negative EBITDA)</p>
                <p className="text-2xl font-bold font-mono text-orange-300">
                  {v.comparableEV > 0 ? formatINR(v.comparableEV) : "₹0"}
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Method" value="Revenue multiple" />
                  <Row label={`Industry multiple`} value={`${v.industryBenchmarkMultiple}x Revenue`} />
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono">{formatINR(v.comparableEV)}</p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Industry multiple" value={`${v.industryBenchmarkMultiple}x EBITDA`} />
                  <Row label="Implied multiple" value={v.ebitdaMultiple > 0 ? `${v.ebitdaMultiple}x` : "N/A"} />
                </div>
              </>
            )}
          </Card>

          {/* DCF */}
          <Card className="p-5 border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <h3 className="font-semibold text-sm">5-Year DCF</h3>
            </div>
            {v.dcfNotMeaningful ? (
              <>
                <p className="text-xs text-yellow-400 font-medium mb-2">Not meaningful</p>
                <p className="text-2xl font-bold font-mono text-muted-foreground">₹0</p>
                <p className="text-xs text-muted-foreground mt-2">
                  All projected free cash flows are negative — DCF excluded from valuation.
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono">{formatINR(v.dcfValue)}</p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Discount rate (WACC)" value={`${Math.round(v.discountRate * 100)}%`} />
                  <Row label="Terminal growth" value={`${Math.round(v.terminalGrowthRate * 100)}%`} />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Cash flow projection */}
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Projected Free Cash Flows</h3>
          </div>
          {v.projectedCashFlows.every((f) => f <= 0) ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              All projected FCFs are negative — the business is cash-burn positive.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {v.projectedCashFlows.map((fcf, i) => {
                const max = Math.max(...v.projectedCashFlows.map(Math.abs), 1);
                const height = Math.max(8, (Math.abs(fcf) / max) * 80);
                const isNeg = fcf < 0;
                return (
                  <div key={i} className="flex flex-col items-center justify-end">
                    <span className={`text-xs font-mono mb-1 ${isNeg ? "text-red-400" : ""}`}>
                      {formatINR(fcf)}
                    </span>
                    <div
                      className={`w-full rounded-t ${isNeg ? "bg-red-500/50" : "bg-primary/60"}`}
                      style={{ height }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">Y{i + 1}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Methodology */}
        <Card className="p-5 border-card-border bg-muted/30">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" /> Methodology
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{v.explanation}</p>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
