import {
  TrendingUp, Calculator, Target, Gauge, TrendingDown,
  BarChart3, AlertTriangle, Info, Star, ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR } from "@/lib/format";
import type { ValuationResult, ScenarioResult } from "@/lib/types";

// ── colour helpers ────────────────────────────────────────────────────────────

function tagColor(tag: string) {
  if (tag === "Undervalued") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (tag === "Overvalued")  return "bg-destructive/15 text-destructive border-destructive/30";
  if (tag.includes("Distressed") || tag.includes("Turnaround"))
    return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function riskLabelColor(label: string) {
  if (label === "High Risk" || label === "Turnaround Case")
    return "bg-red-500/15 text-red-400 border-red-500/30";
  if (label === "High Growth")
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (label === "High Quality")
    return "bg-green-500/15 text-green-400 border-green-500/30";
  return "bg-muted/50 text-muted-foreground border-border";
}

function riskBandColor(band: "Low" | "Medium" | "High") {
  if (band === "Low")    return "text-green-400";
  if (band === "Medium") return "text-yellow-400";
  return "text-red-400";
}

function tagBadgeColor(t: string) {
  if (t === "High Growth")                                      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (["Profitable","High Margin","Cash Generative","Verified"].includes(t))
                                                                return "bg-green-500/15 text-green-400 border-green-500/30";
  if (["Turnaround","Speculative"].includes(t))                 return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-muted/50 text-muted-foreground border-border";
}

function ratingColor(rating: string) {
  if (rating.startsWith("A+")) return "text-green-400";
  if (rating.startsWith("A ")) return "text-emerald-400";
  if (rating.startsWith("B"))  return "text-blue-400";
  if (rating.startsWith("C"))  return "text-yellow-400";
  return "text-red-400";
}

function scenarioBg(label: ScenarioResult["label"]) {
  if (label === "Bear") return "border-red-500/30 bg-red-500/5";
  if (label === "Bull") return "border-green-500/30 bg-green-500/5";
  return "border-blue-500/30 bg-blue-500/5";
}

function scenarioText(label: ScenarioResult["label"]) {
  if (label === "Bear") return "text-red-400";
  if (label === "Bull") return "text-green-400";
  return "text-blue-400";
}

const scenarioTooltips: Record<ScenarioResult["label"], string> = {
  Bear: "Downside case — lower growth and higher risk premium applied.",
  Base: "Base case — expected scenario using current inputs.",
  Bull: "Optimistic case — strong growth with lower discount rate.",
};

// ── main ─────────────────────────────────────────────────────────────────────

export function ValuationDisplay({ v }: { v: ValuationResult }) {
  // Defensive defaults — old records stored in the DB may be missing fields
  // added in recent engine updates. Never crash on undefined.
  const warnings        = v.warnings        ?? [];
  const tags            = v.tags            ?? [];
  const dealScore       = v.dealScore       ?? 0;
  const dealRating      = v.dealRating      ?? "N/A";
  const riskScore       = v.riskScore       ?? 5;
  const riskBand        = v.riskBand        ?? "Medium";
  const riskLabel       = v.riskLabel       ?? "Standard";
  const isLossMaking    = v.isLossMaking    ?? false;
  const dcfNotMeaningful = v.dcfNotMeaningful ?? false;
  const moicLabel       = v.moicLabel       ?? (v.moic != null ? "Standard" : "Not meaningful");
  const irrAssumptions  = v.irrAssumptions  ?? null;
  const moicAssumptions = v.moicAssumptions ?? null;
  const breakdown       = v.valuationBreakdown ?? null;

  const priceSafe = Math.max(0, v.suggestedPrice);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">

        {/* ── Warnings ──────────────────────────────────────────────────── */}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-yellow-400 shrink-0" />
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Important Notes</p>
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-300/90 leading-snug pl-6">• {w}</p>
            ))}
          </div>
        )}

        {/* ── Investment Grade Score ────────────────────────────────────── */}
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-400" />
            <h3 className="font-semibold text-sm">Investment Grade Score</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Scored across 5 dimensions: Profitability (30 pts), Growth (25 pts),
                Company Size (15 pts), Verification (20 pts), Cash Flow (10 pts).
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-end justify-between mb-2">
            <div>
              <span className={`text-4xl font-bold font-mono ${ratingColor(dealRating)}`}>{dealScore}</span>
              <span className="text-muted-foreground text-sm ml-1">/100</span>
            </div>
            <span className={`text-sm font-semibold ${ratingColor(dealRating)}`}>{dealRating}</span>
          </div>
          <Progress value={dealScore} className="h-2 mb-3" />

          {/* Risk band */}
          <div className="flex items-center justify-between text-xs border-t border-border pt-3 mb-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" />
              Risk Score
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Scale: 0 = Very Low Risk → 10 = Very High Risk
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="flex items-center gap-2">
              <span className={`font-mono font-bold ${riskBandColor(riskBand)}`}>{riskScore}/10</span>
              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                riskBand === "Low"    ? "bg-green-500/10 text-green-400 border-green-500/30" :
                riskBand === "Medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                                        "bg-red-500/10 text-red-400 border-red-500/30"
              }`}>{riskBand} Risk</Badge>
            </span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="outline" className={`${tagBadgeColor(t)} text-xs`}>{t}</Badge>
              ))}
            </div>
          )}
        </Card>

        {/* ── Suggested Price ───────────────────────────────────────────── */}
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
              {(v.rangeMin > 0 || v.rangeMax > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Range {formatINR(v.rangeMin)} – {formatINR(v.rangeMax)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={`${tagColor(v.tag)} text-xs`}>{v.tag}</Badge>
              <Badge variant="outline" className={`${riskLabelColor(riskLabel)} text-xs`}>{riskLabel}</Badge>
            </div>
          </div>

          {/* Valuation breakdown */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Valuation derived from:
            </p>
            {breakdown ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                {breakdown.comparableWeight > 0 && (
                  <span className="text-primary">
                    {breakdown.comparableWeight}% Comparable ({formatINR(breakdown.comparableValue)})
                  </span>
                )}
                {breakdown.dcfWeight > 0 && breakdown.comparableWeight > 0 && (
                  <span className="text-muted-foreground">+</span>
                )}
                {breakdown.dcfWeight > 0 && (
                  <span className="text-green-400">
                    {breakdown.dcfWeight}% DCF ({formatINR(breakdown.dcfValue)})
                  </span>
                )}
                {breakdown.dcfWeight === 0 && (
                  <span className="text-yellow-400">100% Comparable (DCF excluded)</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">Comparable + DCF blend</p>
            )}
          </div>

          {/* Confidence */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Confidence
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs max-w-xs">
                    Capped at 85%. Reduced for unverified deals, loss-making companies, or negative free cash flows.
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="font-mono">
                {Math.round(v.confidenceScore * 100)}%{" "}
                <span className={
                  v.confidenceScore * 100 >= 70 ? "text-green-400" :
                  v.confidenceScore * 100 >= 55 ? "text-yellow-400" :
                  "text-red-400"
                }>
                  ({v.confidenceScore * 100 >= 70 ? "High" : v.confidenceScore * 100 >= 55 ? "Moderate" : "Low"})
                </span>
              </span>
            </div>
            <Progress value={v.confidenceScore * 100} className="h-1.5" />
          </div>
        </Card>

        {/* ── Scenario Analysis ─────────────────────────────────────────── */}
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
                  Always in ascending order: Bear ≤ Base ≤ Bull. % shows deviation from the Base case.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {v.scenarios.map((s) => (
                <Tooltip key={s.label}>
                  <TooltipTrigger asChild>
                    <div className={`text-center p-3 rounded-lg border ${scenarioBg(s.label)} cursor-default`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${scenarioText(s.label)}`}>{s.label}</p>
                      <p className={`text-lg font-bold font-mono ${scenarioText(s.label)}`}>
                        {s.valuation > 0 ? formatINR(s.valuation) : "₹0"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(s.growthRate * 100).toFixed(0)}% gr · {(s.discountRate * 100).toFixed(0)}% WACC
                      </p>
                      {s.pctFromBase !== 0 && (
                        <p className={`text-xs font-mono font-semibold mt-1 ${s.pctFromBase < 0 ? "text-red-400" : "text-green-400"}`}>
                          {s.pctFromBase > 0 ? "+" : ""}{s.pctFromBase}% vs base
                        </p>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">{scenarioTooltips[s.label]}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </Card>
        )}

        {/* ── IRR / MOIC / Payback ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* IRR */}
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">IRR</p>
            {v.irr === null ? (
              <>
                <p className="text-base font-bold font-mono mt-1 text-muted-foreground">N/A</p>
                <p className="text-xs text-muted-foreground mt-0.5">Not meaningful</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono mt-1 text-primary">{v.irr}%</p>
                {irrAssumptions && (
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">
                    Entry {formatINR(irrAssumptions.entryPrice)} → Exit {formatINR(irrAssumptions.exitValue)} ({irrAssumptions.exitMultiple}× multiple) over {irrAssumptions.holdingPeriod}
                  </p>
                )}
              </>
            )}
          </Card>

          {/* MOIC */}
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MOIC</p>
            {v.moic === null ? (
              <>
                <p className="text-base font-bold font-mono mt-1 text-muted-foreground">N/A</p>
                <p className="text-xs text-muted-foreground mt-0.5">Not meaningful</p>
              </>
            ) : (
              <>
                <p className={`text-2xl font-bold font-mono mt-1 ${moicLabel === "Speculative (growth-based)" ? "text-orange-400" : "text-green-400"}`}>
                  {v.moic}x
                </p>
                {moicAssumptions && (
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">
                    {formatINR(moicAssumptions.entryPrice)} → {formatINR(moicAssumptions.exitValue)}
                  </p>
                )}
                {moicLabel === "Speculative (growth-based)" && (
                  <p className="text-xs text-orange-400/80 mt-0.5">Speculative</p>
                )}
              </>
            )}
          </Card>

          {/* Payback */}
          <Card className="p-4 border-card-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Payback</p>
            {v.paybackYears === null ? (
              <>
                <p className="text-sm font-bold font-mono mt-1 text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Not achieved within 5-year projection</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono mt-1">
                  {v.paybackYears}yr
                </p>
                <p className="text-xs text-muted-foreground">FCF recovery</p>
              </>
            )}
          </Card>
        </div>

        {/* ── Comparable EV + DCF ───────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5 border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Comparable EV</h3>
              {isLossMaking && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-orange-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs max-w-xs">
                    EBITDA is negative — revenue multiple used instead.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isLossMaking ? (
              <>
                <p className="text-xs text-orange-400 font-medium mb-1.5">⚠️ N/A (Negative EBITDA)</p>
                <p className="text-2xl font-bold font-mono text-orange-300">
                  {v.comparableEV > 0 ? formatINR(v.comparableEV) : "₹0"}
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Method" value="Revenue multiple" />
                  <Row label="Industry multiple" value={`${v.industryBenchmarkMultiple}× Revenue`} />
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold font-mono">{formatINR(v.comparableEV)}</p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Industry multiple" value={`${v.industryBenchmarkMultiple}× EBITDA`} />
                  <Row label="Implied multiple" value={v.ebitdaMultiple > 0 ? `${v.ebitdaMultiple}×` : "N/A"} />
                </div>
              </>
            )}
          </Card>

          <Card className="p-5 border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <h3 className="font-semibold text-sm">5-Year DCF</h3>
            </div>
            {dcfNotMeaningful ? (
              <>
                <p className="text-xs text-yellow-400 font-medium mb-1.5">Not meaningful</p>
                <p className="text-2xl font-bold font-mono text-muted-foreground">₹0</p>
                <p className="text-xs text-muted-foreground mt-2 leading-snug">
                  All projected FCFs are negative — excluded from the valuation blend.
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

        {/* ── Listing Completeness (FCF) ─────────────────────────────────── */}
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Projected Free Cash Flows</h3>
          </div>
          {v.projectedCashFlows.every((f) => f <= 0) ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              All projected FCFs are negative at current EBITDA margins.
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
                    <div className={`w-full rounded-t ${isNeg ? "bg-red-500/50" : "bg-primary/60"}`} style={{ height }} />
                    <span className="text-xs text-muted-foreground mt-1">Y{i + 1}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Methodology ───────────────────────────────────────────────── */}
        <Card className="p-5 border-card-border bg-muted/30">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" /> Methodology
          </h3>
          <p className="text-xs text-muted-foreground mb-2">This valuation combines:</p>
          <ul className="space-y-1 mb-3">
            <li className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><span className="text-foreground font-medium">Comparable company analysis</span> — industry EBITDA (or revenue) multiple applied to normalised earnings</span>
            </li>
            <li className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><span className="text-foreground font-medium">Discounted cash flow (DCF)</span> — 5-year free cash flow projection discounted at risk-adjusted WACC plus terminal value</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
            Weighting applied based on profitability and cash flow visibility.{" "}
            {v.explanation}
          </p>
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
