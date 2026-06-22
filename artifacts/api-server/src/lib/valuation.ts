import { type IndustryBenchmark } from "@workspace/db";

export interface ValuationInput {
  revenue: number;
  ebitda: number;
  ebitdaMargin?: number;
  revenueGrowthRate?: number;
  askingValuation?: number;
  benchmark: IndustryBenchmark;
  trustLevel?: "unverified" | "partially_verified" | "verified";
  hasDocuments?: boolean;
}

export interface ScenarioResult {
  label: "Bear" | "Base" | "Bull";
  valuation: number;
  growthRate: number;
  discountRate: number;
  pctFromBase: number;
}

export interface IRRAssumptions {
  entryPrice: number;
  exitValue: number;
  exitMultiple: number;
  holdingPeriod: string;
}

export interface MOICAssumptions {
  entryPrice: number;
  exitValue: number;
  method: "EBITDA expansion" | "Revenue growth";
}

export interface ValuationBreakdown {
  dcfValue: number;
  comparableValue: number;
  finalValue: number;
  dcfWeight: number;
  comparableWeight: number;
}

export interface ValuationResult {
  listingId: number;
  comparableEV: number;
  dcfValue: number;
  rangeMin: number;
  rangeMax: number;
  suggestedPrice: number;
  confidenceScore: number;
  explanation: string;
  ebitdaMultiple: number;
  industryBenchmarkMultiple: number;
  discountRate: number;
  terminalGrowthRate: number;
  projectedCashFlows: number[];
  tag: string;
  riskLabel: string;
  riskScore: number;
  riskBand: "Low" | "Medium" | "High";
  valuationMethod: "EBITDA" | "Revenue";
  isLossMaking: boolean;
  dcfNotMeaningful: boolean;
  scenarios: ScenarioResult[];
  irr: number | null;
  irrAssumptions: IRRAssumptions | null;
  moic: number | null;
  moicLabel: string;
  moicAssumptions: MOICAssumptions | null;
  paybackYears: number | null;
  dealScore: number;
  dealRating: string;
  tags: string[];
  valuationBreakdown: ValuationBreakdown;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// DCF engine
// ---------------------------------------------------------------------------
function computeDCF(
  revenue: number,
  ebitdaMargin: number,
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
): { dcfValue: number; projectedCashFlows: number[]; notMeaningful: boolean } {
  const capexRatio = 0.04;
  const wcChangeRatio = 0.02;
  const cashFlows: number[] = [];
  let currentRevenue = revenue;
  let presentValue = 0;

  for (let year = 1; year <= 5; year++) {
    currentRevenue *= 1 + Math.max(-0.5, growthRate);
    const projectedEbitda = currentRevenue * ebitdaMargin;
    const fcf = projectedEbitda - currentRevenue * capexRatio - currentRevenue * wcChangeRatio;
    cashFlows.push(Math.round(fcf));
    if (fcf > 0) {
      presentValue += fcf / Math.pow(1 + discountRate, year);
    }
  }

  const notMeaningful = cashFlows.every((f) => f <= 0);
  if (notMeaningful) {
    return { dcfValue: 0, projectedCashFlows: cashFlows, notMeaningful: true };
  }

  const lastPositiveFCF = cashFlows.filter((f) => f > 0).at(-1) ?? 0;
  const safeWacc = Math.max(discountRate, terminalGrowthRate + 0.03);
  const tv = (lastPositiveFCF * (1 + terminalGrowthRate)) / (safeWacc - terminalGrowthRate);

  return {
    dcfValue: Math.max(0, presentValue + tv / Math.pow(1 + discountRate, 5)),
    projectedCashFlows: cashFlows,
    notMeaningful: false,
  };
}

// ---------------------------------------------------------------------------
// IRR — simple annualised CAGR: (exitValue / entry)^(1/years) - 1
// This is intentionally a CAGR approximation, not a full NPV-based IRR.
// It keeps the number grounded in the stated entry/exit rather than being
// distorted by lumpy interim cash flows.
// ---------------------------------------------------------------------------
function computeIRR(investment: number, exitValue: number, years = 5): number | null {
  if (investment <= 0 || exitValue <= 0) return null;
  const raw = Math.pow(exitValue / investment, 1 / years) - 1;
  if (!isFinite(raw) || raw < -0.99) return null;
  return Math.round(raw * 1000) / 10; // 1 decimal — e.g. 25.4%
}

// ---------------------------------------------------------------------------
// Scenario blend helper
// ---------------------------------------------------------------------------
function scenarioValuation(
  revenue: number, ebitda: number, ebitdaMargin: number,
  growthRate: number, discountRate: number, terminalGrowthRate: number,
  benchmark: IndustryBenchmark, evScale: number,
): number {
  const { dcfValue } = computeDCF(revenue, ebitdaMargin, growthRate, discountRate, terminalGrowthRate);
  const compEV = ebitda > 0
    ? Math.max(0, ebitda * benchmark.ebitdaMultiple) * evScale
    : Math.max(0, revenue * benchmark.revenueMultiple) * evScale;
  return Math.max(0, Math.round((dcfValue + compEV) / 2));
}

// ---------------------------------------------------------------------------
// Deal score (0–100) + rating
// ---------------------------------------------------------------------------
function computeDealScore(
  ebitdaMargin: number, revenueGrowthRate: number, revenue: number,
  trustLevel: "unverified" | "partially_verified" | "verified",
  hasSomePositiveFCF: boolean,
): { score: number; rating: string } {
  let score = 0;
  // Profitability — 30 pts
  if (ebitdaMargin > 0.2) score += 30;
  else if (ebitdaMargin > 0.1) score += 20;
  else if (ebitdaMargin > 0) score += 10;
  // Growth — 25 pts
  if (revenueGrowthRate > 0.5) score += 25;
  else if (revenueGrowthRate > 0.2) score += 15;
  else score += 5;
  // Size — 15 pts (revenue in lakhs; ₹10Cr = 1000 lakhs)
  if (revenue > 1000) score += 15;
  else if (revenue > 100) score += 10;
  else score += 5;
  // Verification — 20 pts
  if (trustLevel === "verified") score += 20;
  else if (trustLevel === "partially_verified") score += 10;
  else score += 5;
  // Cash flow — 10 pts
  if (hasSomePositiveFCF) score += 10;

  const rating =
    score >= 90 ? "A+ (Institutional Grade)" :
    score >= 75 ? "A (High Quality)" :
    score >= 60 ? "B (Good Deal)" :
    score >= 40 ? "C (Risky)" :
    "D (Speculative)";
  return { score, rating };
}

// ---------------------------------------------------------------------------
// Main valuation
// ---------------------------------------------------------------------------
export function computeValuation(listingId: number, input: ValuationInput): ValuationResult {
  const {
    revenue, ebitda, revenueGrowthRate = 0.12, benchmark,
    askingValuation, trustLevel = "unverified", hasDocuments = false,
  } = input;

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;
  const terminalGrowthRate = 0.05;
  const baseDiscountRate = 0.15;
  const isLossMaking = ebitda <= 0;

  // ── Comparable EV ─────────────────────────────────────────────────────
  let comparableEV: number;
  let valuationMethod: "EBITDA" | "Revenue";
  if (!isLossMaking) {
    comparableEV = Math.max(0, ebitda * benchmark.ebitdaMultiple);
    valuationMethod = "EBITDA";
  } else {
    comparableEV = Math.max(0, revenue * benchmark.revenueMultiple);
    valuationMethod = "Revenue";
  }

  // ── DCF ───────────────────────────────────────────────────────────────
  const { dcfValue, projectedCashFlows, notMeaningful } = computeDCF(
    revenue, ebitdaMargin, revenueGrowthRate, baseDiscountRate, terminalGrowthRate,
  );
  const hasSomePositiveFCF = projectedCashFlows.some((f) => f > 0);

  // ── Suggested price ───────────────────────────────────────────────────
  const dcfWeight = notMeaningful ? 0 : 50;
  const comparableWeight = notMeaningful ? 100 : 50;
  const suggestedPrice = Math.max(0, Math.round(
    (dcfValue * dcfWeight + comparableEV * comparableWeight) / 100,
  ));

  // ── Valuation breakdown ───────────────────────────────────────────────
  const valuationBreakdown: ValuationBreakdown = {
    dcfValue: Math.round(dcfValue),
    comparableValue: Math.round(comparableEV),
    finalValue: suggestedPrice,
    dcfWeight,
    comparableWeight,
  };

  // ── Scenarios ─────────────────────────────────────────────────────────
  const bearGrowth = Math.max(0, revenueGrowthRate * 0.5);
  const bullGrowth = Math.min(revenueGrowthRate * 1.6, revenueGrowthRate + 0.25);
  const bearWacc = Math.min(0.25, baseDiscountRate + 0.04);
  const bullWacc = Math.max(0.08, baseDiscountRate - 0.03);

  const rawBear = scenarioValuation(revenue, ebitda, ebitdaMargin, bearGrowth, bearWacc, terminalGrowthRate, benchmark, 0.8);
  const rawBase = Math.max(0, suggestedPrice);
  const rawBull = scenarioValuation(revenue, ebitda, ebitdaMargin, bullGrowth, bullWacc, terminalGrowthRate, benchmark, 1.2);
  const [bearVal, baseVal, bullVal] = [rawBear, rawBase, rawBull].sort((a, b) => a - b);

  const scenarios: ScenarioResult[] = [
    {
      label: "Bear", valuation: bearVal, growthRate: bearGrowth, discountRate: bearWacc,
      pctFromBase: baseVal > 0 ? Math.round(((bearVal - baseVal) / baseVal) * 100) : 0,
    },
    {
      label: "Base", valuation: baseVal, growthRate: revenueGrowthRate, discountRate: baseDiscountRate,
      pctFromBase: 0,
    },
    {
      label: "Bull", valuation: bullVal, growthRate: bullGrowth, discountRate: bullWacc,
      pctFromBase: baseVal > 0 ? Math.round(((bullVal - baseVal) / baseVal) * 100) : 0,
    },
  ];

  // ── Exit value ─────────────────────────────────────────────────────────
  const lastYearRevenue = revenue * Math.pow(1 + revenueGrowthRate, 5);
  const exitMultiple = isLossMaking ? benchmark.revenueMultiple : benchmark.ebitdaMultiple;
  const exitValue = isLossMaking
    ? lastYearRevenue * benchmark.revenueMultiple * 0.8
    : lastYearRevenue * ebitdaMargin * benchmark.ebitdaMultiple;

  // ── IRR ────────────────────────────────────────────────────────────────
  const investmentAmount = askingValuation ?? suggestedPrice;
  const irrValid = hasSomePositiveFCF || exitValue > 0;
  const irr = irrValid ? computeIRR(investmentAmount, exitValue) : null;

  const irrAssumptions: IRRAssumptions | null = irr !== null ? {
    entryPrice: Math.round(investmentAmount),
    exitValue: Math.round(exitValue),
    exitMultiple: Math.round(exitMultiple * 10) / 10,
    holdingPeriod: "5 years",
  } : null;

  // ── MOIC ───────────────────────────────────────────────────────────────
  let moic: number | null;
  let moicLabel: string;
  let moicAssumptions: MOICAssumptions | null = null;

  if (isLossMaking) {
    if (revenueGrowthRate > 0.3 && investmentAmount > 0) {
      const speculativeExit = lastYearRevenue * benchmark.revenueMultiple * 1.2;
      moic = speculativeExit > 0 ? Math.round((speculativeExit / investmentAmount) * 10) / 10 : null;
      moicLabel = moic !== null ? "Speculative (growth-based)" : "Not meaningful";
      if (moic !== null) {
        moicAssumptions = {
          entryPrice: Math.round(investmentAmount),
          exitValue: Math.round(speculativeExit),
          method: "Revenue growth",
        };
      }
    } else {
      moic = null;
      moicLabel = "Not meaningful";
    }
  } else {
    moic = investmentAmount > 0 && exitValue > 0
      ? Math.round((exitValue / investmentAmount) * 10) / 10
      : null;
    moicLabel = moic !== null ? "Standard" : "Not meaningful";
    if (moic !== null) {
      moicAssumptions = {
        entryPrice: Math.round(investmentAmount),
        exitValue: Math.round(exitValue),
        method: "EBITDA expansion",
      };
    }
  }

  // ── Payback ────────────────────────────────────────────────────────────
  // null = not achieved within 5-year projection (or no positive FCFs at all)
  let paybackYears: number | null = null;
  if (hasSomePositiveFCF) {
    let cumulative = 0;
    for (let i = 0; i < projectedCashFlows.length; i++) {
      cumulative += projectedCashFlows[i];
      if (cumulative >= investmentAmount) { paybackYears = i + 1; break; }
    }
    // paybackYears stays null when cumulative FCFs don't recover the investment
  }

  // ── Range ──────────────────────────────────────────────────────────────
  const rangeMin = Math.max(0, Math.min(comparableEV, dcfValue) * 0.9);
  const rangeMax = Math.max(0, Math.max(comparableEV, dcfValue) * 1.1);

  // ── Confidence score — clamped 40–85 ─────────────────────────────────
  let confidence = 50;
  if (trustLevel === "verified") confidence += 15;
  if (hasDocuments) confidence += 10;
  if (!isLossMaking) confidence += 10;
  if (hasSomePositiveFCF) confidence += 10;
  if (revenue > 1000) confidence += 5;           // > ₹10Cr
  if (revenueGrowthRate > 0.1) confidence += 5;  // consistent growth bonus
  // Penalties
  if (isLossMaking) confidence -= 15;
  if (!hasSomePositiveFCF) confidence -= 10;
  if (trustLevel === "unverified") confidence -= 10;
  if (!hasDocuments) confidence -= 10;           // no audited financials uploaded
  confidence = Math.max(40, Math.min(85, confidence)); // floor 40, cap 85

  // ── Risk score (0–10) ─────────────────────────────────────────────────
  let riskScore = 5;
  if (isLossMaking) riskScore += 3;
  if (!hasSomePositiveFCF) riskScore += 2;
  if (trustLevel === "unverified") riskScore += 1;
  if (revenueGrowthRate > 0.3) riskScore -= 1;
  if (!isLossMaking && ebitdaMargin > 0.2) riskScore -= 2;
  if (trustLevel === "verified") riskScore -= 1;
  riskScore = Math.max(0, Math.min(10, Math.round(riskScore)));
  const riskBand: "Low" | "Medium" | "High" =
    riskScore <= 3 ? "Low" : riskScore <= 6 ? "Medium" : "High";

  // ── Deal score + rating ───────────────────────────────────────────────
  const { score: dealScore, rating: dealRating } = computeDealScore(
    ebitdaMargin, revenueGrowthRate, revenue, trustLevel, hasSomePositiveFCF,
  );

  // ── Tags ──────────────────────────────────────────────────────────────
  const tags: string[] = [];
  if (revenueGrowthRate > 0.3) tags.push("High Growth");
  if (!isLossMaking && ebitdaMargin > 0.1) tags.push("Profitable");
  if (!isLossMaking && ebitdaMargin > 0.2) tags.push("High Margin");
  if (isLossMaking) tags.push("Turnaround");
  if (isLossMaking && revenueGrowthRate < 0.2) tags.push("Speculative");
  if (hasSomePositiveFCF && !isLossMaking) tags.push("Cash Generative");
  if (trustLevel === "verified") tags.push("Verified");

  // ── Risk label (business profile) ────────────────────────────────────
  const riskLabel =
    isLossMaking ? "Turnaround Case" :
    revenueGrowthRate > 0.5 ? "High Growth" :
    ebitdaMargin > 0.2 && revenueGrowthRate > 0.1 ? "High Quality" :
    ebitdaMargin < 0.08 ? "High Risk" :
    "Standard";

  // ── Warnings ──────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (trustLevel === "unverified") {
    warnings.push("Financials not independently verified");
  } else if (trustLevel === "partially_verified") {
    warnings.push("Partial verification — some financials may be unaudited");
  }
  if (isLossMaking) {
    warnings.push("Loss-making company — valuation based on revenue and growth potential, not profitability");
  }
  if (notMeaningful) {
    warnings.push("DCF excluded from valuation — all projected free cash flows are negative");
  }
  if (confidence < 55) {
    warnings.push("Limited data quality — treat as indicative only, not a definitive valuation");
  }
  if (irr !== null && irr > 40) {
    warnings.push("High projected return — verify exit assumptions before relying on this figure");
  }

  // ── Deal tag (asking price vs intrinsic) ─────────────────────────────
  let tag = "Fairly Valued";
  if (askingValuation && suggestedPrice > 0) {
    if (askingValuation < suggestedPrice * 0.9) tag = "Undervalued";
    else if (askingValuation > suggestedPrice * 1.1) tag = "Overvalued";
  }
  if (isLossMaking && suggestedPrice === 0) tag = "Distressed / Turnaround";

  // ── Explanation ───────────────────────────────────────────────────────
  const methodNote = isLossMaking
    ? `Revenue multiple (${benchmark.revenueMultiple}x) used — EBITDA is negative.`
    : `EBITDA multiple of ${benchmark.ebitdaMultiple}x applied.`;
  const dcfNote = notMeaningful
    ? "DCF not applicable (all FCFs negative)."
    : `5-year DCF at ${baseDiscountRate * 100}% WACC yields ₹${(dcfValue / 10).toFixed(0)}Cr.`;
  const breakdownNote = `Valuation derived from ${comparableWeight}% comparable + ${dcfWeight}% DCF.`;

  const explanation =
    `${benchmark.industry} benchmark — ${methodNote} ` +
    `Comparable EV: ₹${(comparableEV / 10).toFixed(0)}Cr. ` +
    `${dcfNote} ` +
    `${breakdownNote} ` +
    `Investment Grade Score: ${dealScore}/100 (${dealRating}).`;

  return {
    listingId,
    comparableEV: Math.round(comparableEV),
    dcfValue: Math.round(dcfValue),
    rangeMin: Math.round(rangeMin),
    rangeMax: Math.round(rangeMax),
    suggestedPrice,
    confidenceScore: Math.round(confidence) / 100,
    explanation,
    ebitdaMultiple: !isLossMaking && ebitda > 0 ? Math.round((comparableEV / ebitda) * 10) / 10 : 0,
    industryBenchmarkMultiple: isLossMaking ? benchmark.revenueMultiple : benchmark.ebitdaMultiple,
    discountRate: baseDiscountRate,
    terminalGrowthRate,
    projectedCashFlows,
    tag,
    riskLabel,
    riskScore,
    riskBand,
    valuationMethod,
    isLossMaking,
    dcfNotMeaningful: notMeaningful,
    scenarios,
    irr,
    irrAssumptions,
    moic,
    moicLabel,
    moicAssumptions,
    paybackYears,
    dealScore,
    dealRating,
    tags,
    valuationBreakdown,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Intelligence scoring
// ---------------------------------------------------------------------------
export interface IntelligenceInput {
  listingId: number;
  revenue: number;
  ebitda: number;
  revenueGrowthRate?: number;
  debtRatio?: number;
  customerConcentration?: number;
  industry: string;
  benchmark: IndustryBenchmark;
}

export function computeIntelligence(input: IntelligenceInput) {
  const {
    listingId, revenue, ebitda,
    revenueGrowthRate = 0.1, debtRatio = 0.3,
    customerConcentration = 0.3, benchmark,
  } = input;

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;

  const riskFactors = [
    {
      factor: "Debt Ratio",
      score: Math.min(10, debtRatio * 20),
      description:
        debtRatio > 0.5 ? "High leverage poses repayment risk"
        : debtRatio > 0.3 ? "Moderate debt levels"
        : "Conservative debt structure",
    },
    {
      factor: "Customer Concentration",
      score: Math.min(10, customerConcentration * 15),
      description:
        customerConcentration > 0.5 ? "High dependence on few customers"
        : customerConcentration > 0.3 ? "Moderate concentration risk"
        : "Well-diversified customer base",
    },
    {
      factor: "EBITDA Margin",
      score: ebitdaMargin < 0 ? 10 : ebitdaMargin < 0.1 ? 7 : ebitdaMargin < 0.2 ? 4 : 2,
      description:
        ebitdaMargin < 0 ? "Loss-making — EBITDA margin is negative"
        : ebitdaMargin < 0.1 ? "Thin margins indicate operational stress"
        : ebitdaMargin < 0.2 ? "Adequate margins"
        : "Strong operational efficiency",
    },
  ];

  const riskScore = riskFactors.reduce((acc, f) => acc + f.score, 0) / riskFactors.length;

  const growthFactors = [
    {
      factor: "Revenue Growth",
      score: Math.min(10, revenueGrowthRate * 50),
      description:
        revenueGrowthRate > 0.2 ? "Strong revenue momentum"
        : revenueGrowthRate > 0.1 ? "Steady growth trajectory"
        : "Growth below industry average",
    },
    {
      factor: "Industry Tailwinds",
      score: Math.min(10, benchmark.growthRate * 40),
      description: `${benchmark.industry} sector growing at ${(benchmark.growthRate * 100).toFixed(1)}% — ${benchmark.description}`,
    },
    {
      factor: "EBITDA Expansion",
      score: ebitdaMargin < 0 ? 2 : ebitdaMargin > 0.25 ? 8 : ebitdaMargin > 0.15 ? 6 : 4,
      description:
        ebitdaMargin < 0 ? "Loss-making — path to profitability is key"
        : ebitdaMargin > 0.25 ? "High margins with room for expansion"
        : "Standard margin profile for sector",
    },
  ];

  const growthScore = growthFactors.reduce((acc, f) => acc + f.score, 0) / growthFactors.length;

  const aiInsights: string[] = [];
  if (ebitdaMargin < 0) aiInsights.push("⚠️ Loss-making — valuation based on revenue and growth, not profitability");
  if (ebitdaMargin > 0 && ebitdaMargin < 0.1) aiInsights.push("Thin margins — monitor EBITDA trajectory closely");
  if (revenueGrowthRate > 0.2) aiInsights.push(`Strong growth — revenue growing at ${(revenueGrowthRate * 100).toFixed(0)}% YoY`);
  if (debtRatio < 0.2 && ebitdaMargin > 0.2) aiInsights.push("Potentially undervalued — strong fundamentals with conservative balance sheet");
  if (customerConcentration > 0.5) aiInsights.push("Customer concentration risk — top customer exit could impair 50%+ of revenue");
  if (benchmark.growthRate > 0.15) aiInsights.push(`${benchmark.industry} is a high-growth sector — strategic entry point`);

  const marketSentiment =
    growthScore > 6 && riskScore < 4 ? "positive" :
    riskScore > 6 || ebitdaMargin < 0 ? "negative" :
    "neutral";

  return {
    listingId,
    riskScore: Math.round(riskScore * 10) / 10,
    growthScore: Math.round(growthScore * 10) / 10,
    riskFactors, growthFactors, aiInsights,
    marketSentiment,
    industryGrowthRate: benchmark.growthRate,
    trendSummary: benchmark.description,
  };
}

// ---------------------------------------------------------------------------
// Deal quality score
// ---------------------------------------------------------------------------
export function computeDealQualityScore(deal: {
  businessOverview?: string | null;
  whySelling?: string | null;
  growthDrivers?: string | null;
  keyRisks?: string | null;
  revenueY1?: number | null;
  revenueY2?: number | null;
  revenueY3?: number | null;
  totalDebt?: number | null;
  customerConcentration?: number | null;
  legalConfirmedAt?: Date | null;
  documentCount?: number;
}): { score: number; trustLevel: "unverified" | "partially_verified" | "verified" } {
  let score = 20;
  if (deal.businessOverview && deal.businessOverview.length > 50) score += 10;
  if (deal.whySelling && deal.whySelling.length > 30) score += 10;
  if (deal.growthDrivers && deal.growthDrivers.length > 30) score += 8;
  if (deal.keyRisks && deal.keyRisks.length > 30) score += 7;
  if (deal.revenueY1 != null) score += 7;
  if (deal.revenueY2 != null) score += 5;
  if (deal.revenueY3 != null) score += 5;
  if (deal.totalDebt != null) score += 5;
  if (deal.customerConcentration != null) score += 5;
  if (deal.legalConfirmedAt) score += 8;
  score += Math.min((deal.documentCount ?? 0) * 5, 10);
  const capped = Math.min(100, score);
  const trustLevel: "unverified" | "partially_verified" | "verified" =
    capped >= 70 ? "verified" : capped >= 40 ? "partially_verified" : "unverified";
  return { score: capped, trustLevel };
}
