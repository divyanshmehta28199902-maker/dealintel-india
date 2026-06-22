import { TrendingUp, Calculator, Target, Gauge, TrendingDown, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatINR } from "@/lib/format";
import type { ValuationResult, ScenarioResult } from "@/lib/types";

function tagColor(tag: string) {
  if (tag === "Undervalued") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (tag === "Overvalued") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function scenarioColor(label: ScenarioResult["label"]) {
  if (label === "Bear") return "text-destructive";
  if (label === "Bull") return "text-green-400";
  return "text-primary";
}

export function ValuationDisplay({ v }: { v: ValuationResult }) {
  return (
    <div className="space-y-4">
      {/* Headline */}
      <Card className="p-5 border-card-border stat-glow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Suggested Deal Price</p>
            <p className="text-3xl font-bold font-mono mt-1">{formatINR(v.suggestedPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Range {formatINR(v.rangeMin)} – {formatINR(v.rangeMax)}
            </p>
          </div>
          <Badge variant="outline" className={`${tagColor(v.tag)} text-xs`}>{v.tag}</Badge>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Confidence</span>
            <span className="font-mono">{Math.round(v.confidenceScore * 100)}%</span>
          </div>
          <Progress value={v.confidenceScore * 100} className="h-1.5" />
        </div>
      </Card>

      {/* Scenario Analysis */}
      {v.scenarios && v.scenarios.length > 0 && (
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Scenario Analysis</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {v.scenarios.map((s) => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${scenarioColor(s.label)}`}>{s.label}</p>
                <p className={`text-lg font-bold font-mono ${scenarioColor(s.label)}`}>{formatINR(s.valuation)}</p>
                <p className="text-xs text-muted-foreground mt-1">{(s.growthRate * 100).toFixed(0)}% growth · {(s.discountRate * 100).toFixed(0)}% WACC</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* IRR / MOIC / Payback */}
      {(v.irr != null || v.moic != null || v.paybackYears != null) && (
        <div className="grid grid-cols-3 gap-3">
          {v.irr != null && (
            <Card className="p-4 border-card-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">IRR</p>
              <p className="text-2xl font-bold font-mono mt-1 text-primary">{v.irr}%</p>
              <p className="text-xs text-muted-foreground">5-yr hold</p>
            </Card>
          )}
          {v.moic != null && (
            <Card className="p-4 border-card-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">MOIC</p>
              <p className="text-2xl font-bold font-mono mt-1 text-green-400">{v.moic}x</p>
              <p className="text-xs text-muted-foreground">multiple on capital</p>
            </Card>
          )}
          {v.paybackYears != null && (
            <Card className="p-4 border-card-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Payback</p>
              <p className="text-2xl font-bold font-mono mt-1">{v.paybackYears}yr</p>
              <p className="text-xs text-muted-foreground">FCF recovery</p>
            </Card>
          )}
        </div>
      )}

      {/* Two methods */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Comparable EV</h3>
          </div>
          <p className="text-2xl font-bold font-mono">{formatINR(v.comparableEV)}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="Industry multiple" value={`${v.industryBenchmarkMultiple}x EBITDA`} />
            <Row label="Implied multiple" value={`${v.ebitdaMultiple}x`} />
          </div>
        </Card>

        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <h3 className="font-semibold text-sm">5-Year DCF</h3>
          </div>
          <p className="text-2xl font-bold font-mono">{formatINR(v.dcfValue)}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="Discount rate (WACC)" value={`${Math.round(v.discountRate * 100)}%`} />
            <Row label="Terminal growth" value={`${Math.round(v.terminalGrowthRate * 100)}%`} />
          </div>
        </Card>
      </div>

      {/* Cash flow projection */}
      <Card className="p-5 border-card-border">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Projected Free Cash Flows</h3>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {v.projectedCashFlows.map((fcf, i) => {
            const max = Math.max(...v.projectedCashFlows.map(Math.abs), 1);
            const height = Math.max(8, (Math.abs(fcf) / max) * 80);
            return (
              <div key={i} className="flex flex-col items-center justify-end">
                <span className="text-xs font-mono mb-1">{formatINR(fcf)}</span>
                <div className="w-full rounded-t bg-primary/60" style={{ height }} />
                <span className="text-xs text-muted-foreground mt-1">Y{i + 1}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Explanation */}
      <Card className="p-5 border-card-border bg-muted/30">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" /> Methodology
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{v.explanation}</p>
      </Card>
    </div>
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
