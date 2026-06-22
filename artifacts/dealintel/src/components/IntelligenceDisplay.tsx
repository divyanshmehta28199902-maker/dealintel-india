import { Shield, TrendingUp, Sparkles, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { IntelligenceResult, RiskFactor } from "@/lib/types";

function sentimentColor(s: string) {
  if (s === "positive") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (s === "negative") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

export function IntelligenceDisplay({ intel }: { intel: IntelligenceResult }) {
  return (
    <div className="space-y-4">
      {/* Scores */}
      <div className="grid md:grid-cols-2 gap-4">
        <ScoreCard
          icon={Shield}
          title="Risk Score"
          score={intel.riskScore}
          color="destructive"
          hint={intel.riskScore > 6 ? "Elevated risk" : intel.riskScore > 4 ? "Moderate risk" : "Low risk"}
        />
        <ScoreCard
          icon={TrendingUp}
          title="Growth Score"
          score={intel.growthScore}
          color="green"
          hint={intel.growthScore > 6 ? "Strong growth" : intel.growthScore > 4 ? "Steady growth" : "Limited growth"}
        />
      </div>

      {/* Market sentiment */}
      <Card className="p-4 border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Market Sentiment</span>
        </div>
        <Badge variant="outline" className={`${sentimentColor(intel.marketSentiment)} text-xs capitalize`}>
          {intel.marketSentiment}
        </Badge>
      </Card>

      {/* AI Insights */}
      {intel.aiInsights.length > 0 && (
        <Card className="p-5 border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">AI Insights</h3>
          </div>
          <ul className="space-y-2">
            {intel.aiInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Factor breakdowns */}
      <div className="grid md:grid-cols-2 gap-4">
        <FactorList title="Risk Factors" factors={intel.riskFactors} invert />
        <FactorList title="Growth Factors" factors={intel.growthFactors} />
      </div>

      <Card className="p-5 border-card-border bg-muted/30">
        <h3 className="font-semibold text-sm mb-1">Industry Trend</h3>
        <p className="text-sm text-muted-foreground">
          Sector growing at <span className="font-mono text-foreground">{(intel.industryGrowthRate * 100).toFixed(1)}%</span> — {intel.trendSummary}
        </p>
      </Card>
    </div>
  );
}

function ScoreCard({
  icon: Icon, title, score, color, hint,
}: {
  icon: typeof Shield; title: string; score: number; color: "destructive" | "green"; hint: string;
}) {
  const pct = (score / 10) * 100;
  const barColor = color === "green" ? "text-green-400" : "text-destructive";
  return (
    <Card className="p-5 border-card-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${barColor}`} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <span className="text-2xl font-bold font-mono">{score.toFixed(1)}<span className="text-sm text-muted-foreground">/10</span></span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-2">{hint}</p>
    </Card>
  );
}

function FactorList({ title, factors, invert }: { title: string; factors: RiskFactor[]; invert?: boolean }) {
  return (
    <Card className="p-5 border-card-border">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-3">
        {factors.map((f) => {
          const pct = (f.score / 10) * 100;
          const good = invert ? f.score < 4 : f.score > 6;
          const bad = invert ? f.score > 6 : f.score < 4;
          const barClass = good ? "bg-green-500" : bad ? "bg-destructive" : "bg-amber-500";
          return (
            <div key={f.factor}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{f.factor}</span>
                <span className="font-mono text-muted-foreground">{f.score.toFixed(1)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
