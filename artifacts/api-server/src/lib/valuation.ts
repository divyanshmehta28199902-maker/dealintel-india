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
  valuationMethod: "EBITDA" | "Revenue";
  isLossMaking: boolean;
  dcfNotMeaningful: boolean;
  scenarios: ScenarioResult[];
  irr: number | null;
  moic: number | null;
  moicLabel: string;
  paybackYears: number | null;
  dealScore: number;
  dealRating: string;
  tags: string[];
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
  const terminalValue = (lastPositiveFCF * (1 + terminalGrowthRate)) / (safeWacc - terminalGrowthRate);
  const discountedTV = terminalValue / Math.pow(1 + discountRate, 5);

  return {
    dcfValue: Math.max(0, presentValue + discountedTV),
    projectedCashFlows: cashFlows,
    notMeaningful: false,
  };
}

// ---------------------------------------------------------------------------
// IRR via bisection — null when inputs are invalid or convergence fails
// ---------------------------------------------------------------------------
function computeIRR(investment: number, cashFlows: number[], exitValue: number): number | null {
  if (investment <= 0 || exitValue <= 0) return null;
  if (!cashFlows.some((f) => f > 0) && exitValue <= 0) return null;

  let lo = -0.5, hi = 5.0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    let npv = -investment;
    for (let y = 0; y < cashFlows.length; y++) {
      npv += cashFlows[y] / Math.pow(1 + mid, y + 1);
    }
    npv += exitValue / Math.pow(1 + mid, cashFlows.length);
    if (Math.abs(npv) < 0.001) { lo = mid; break; }
    if (npv > 0) lo = mid; else hi = mid;
  }
  const irrRaw = (lo + hi) / 2;
  if (irrRaw < -0.99 || irrRaw > 5) return null;
  return Math.round(irrRaw * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Scenario blend helper
// ---------------------------------------------------------------------------
function scenarioValuation(
  revenue: number,
  ebitda: number,
  ebitdaMargin: number,
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
  benchmark: IndustryBenchmark,
  evScale: number,
): number {
  const { dcfValue } = computeDCF(revenue, ebitdaMargin, growthRate, discountRate, terminalGrowthRate);
  const compEV =
    ebitda > 0
      ? Math.max(0, ebitda * benchmark.ebitdaMultiple) * evScale
      : Math.max(0, revenue * benchmark.revenueMultiple) * evScale;
  return Math.max(0, Math.round((dcfValue + compEV) / 2));
}

// ---------------------------------------------------------------------------
// Deal score (0–100) and rating
// ---------------------------------------------------------------------------
function computeDealScore(
  ebitdaMargin: number,
  revenueGrowthRate: number,
  revenue: number,
  trustLevel: "unverified" | "partially_verified" | "verified",
  hasSomePositiveFCF: boolean,
): { score: number; rating: string } {
  let score = 0;

  // Profitability — 30 pts
  if (ebitdaMargin > 0.2) score += 30;
  else if (ebitdaMargin > 0.1) score += 20;
  else if (ebitdaMargin > 0) score += 10;
  // < 0 → +0

  // Growth — 25 pts
  if (revenueGrowthRate > 0.5) score += 25;
  else if (revenueGrowthRate > 0.2) score += 15;
  else score += 5;

  // Size (revenue in lakhs; ₹1Cr = 100 lakhs) — 15 pts
  if (revenue > 1000) score += 15;       // > ₹10Cr
  else if (revenue > 100) score += 10;   // ₹1–10Cr
  else score += 5;                        // < ₹1Cr

  // Verification / risk — 20 pts
  if (trustLevel === "verified") score += 20;
  else if (trustLevel === "partially_verified") score += 10;
  else score += 5;

  // Cash flow health — 10 pts
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
    revenue,
    ebitda,
    revenueGrowthRate = 0.12,
    benchmark,
    askingValuation,
    trustLevel = "unverified",
    hasDocuments = false,
  } = input;

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;
  const terminalGrowthRate = 0.05;
  const baseDiscountRate = 0.15;
  const isLossMaking = ebitda <= 0;

  // ── Comparable EV ────────────────────────────────────────────────────────
  let comparableEV: number;
  let valuationMethod: "EBITDA" | "Revenue";
  if (!isLossMaking) {
    comparableEV = Math.max(0, ebitda * benchmark.ebitdaMultiple);
    valuationMethod = "EBITDA";
  } else {
    comparableEV = Math.max(0, revenue * benchmark.revenueMultiple);
    valuationMethod = "Revenue";
  }

  // ── DCF ──────────────────────────────────────────────────────────────────
  const { dcfValue, projectedCashFlows, notMeaningful } = computeDCF(
    revenue, ebitdaMargin, revenueGrowthRate, baseDiscountRate, terminalGrowthRate,
  );

  const hasSomePositiveFCF = projectedCashFlows.some((f) => f > 0);

  // ── Suggested price ───────────────────────────────────────────────────────
  const suggestedPrice = notMeaningful
    ? Math.max(0, Math.round(comparableEV))
    : Math.max(0, Math.round((comparableEV * 0.5 + dcfValue * 0.5)));

  // ── Scenarios ─────────────────────────────────────────────────────────────
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

  // ── Exit value ───────────────────────────────────────────────────────────
  const lastYearRevenue = revenue * Math.pow(1 + revenueGrowthRate, 5);
  const exitValue = isLossMaking
    ? lastYearRevenue * benchmark.revenueMultiple * 0.8
    : lastYearRevenue * ebitdaMargin * benchmark.ebitdaMultiple;

  // ── IRR ──────────────────────────────────────────────────────────────────
  const investmentAmount = askingValuation ?? suggestedPrice;
  // IRR only valid when at least 1 positive FCF or positive exit exists
  const irrValid = hasSomePositiveFCF || exitValue > 0;
  const irr = irrValid ? computeIRR(investmentAmount, projectedCashFlows, exitValue) : null;

  // ── MOIC ─────────────────────────────────────────────────────────────────
  let moic: number | null;
  let moicLabel: string;

  if (isLossMaking) {
    // Speculative: only meaningful if there is enough growth to justify a re-rating
    if (revenueGrowthRate > 0.3 && investmentAmount > 0) {
      const speculativeExit = lastYearRevenue * benchmark.revenueMultiple * 1.2;
      moic = speculativeExit > 0 ? Math.round((speculativeExit / investmentAmount) * 10) / 10 : null;
      moicLabel = moic !== null ? "Speculative (growth-based)" : "Not meaningful";
    } else {
      moic = null;
      moicLabel = "Not meaningful";
    }
  } else {
    moic = investmentAmount > 0 && exitValue > 0
      ? Math.round((exitValue / investmentAmount) * 10) / 10
      : null;
    moicLabel = moic !== null ? "Standard" : "Not meaningful";
  }

  // ── Payback ───────────────────────────────────────────────────────────────
  // Null when all FCFs negative (no recovery within projection window)
  let paybackYears: number | null = null;
  if (hasSomePositiveFCF) {
    let cumulative = 0;
    for (let i = 0; i < projectedCashFlows.length; i++) {
      cumulative += projectedCashFlows[i];
      if (cumulative >= investmentAmount) { paybackYears = i + 1; break; }
    }
    if (paybackYears === null) paybackYears = 5; // beyond window but FCFs exist
  }

  // ── Range ─────────────────────────────────────────────────────────────────
  const rangeMin = Math.max(0, Math.min(comparableEV, dcfValue) * 0.9);
  const rangeMax = Math.max(0, Math.max(comparableEV, dcfValue) * 1.1);

  // ── Confidence score (start at 50, additive/subtractive) ─────────────────
  let confidence = 50;
  if (trustLevel === "verified") confidence += 20;
  else if (trustLevel === "partially_verified") confidence += 8;
  if (!isLossMaking) confidence += 15;
  if (hasDocuments) confidence += 10;
  if (revenue > 500) confidence += 5;           // > ₹5Cr
  if (revenueGrowthRate > 0.3) confidence += 5;
  if (isLossMaking) confidence -= 10;
  if (!hasSomePositiveFCF) confidence -= 10;
  confidence = Math.max(0, Math.min(95, confidence));

  // ── Deal score + rating ───────────────────────────────────────────────────
  const { score: dealScore, rating: dealRating } = computeDealScore(
    ebitdaMargin, revenueGrowthRate, revenue, trustLevel, hasSomePositiveFCF,
  );

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tags: string[] = [];
  if (revenueGrowthRate > 0.3) tags.push("High Growth");
  if (!isLossMaking && ebitdaMargin > 0.1) tags.push("Profitable");
  if (!isLossMaking && ebitdaMargin > 0.2) tags.push("High Margin");
  if (isLossMaking) tags.push("Turnaround");
  if (isLossMaking && revenueGrowthRate < 0.2) tags.push("Speculative");
  if (hasSomePositiveFCF && !isLossMaking) tags.push("Cash Generative");
  if (trustLevel === "verified") tags.push("Verified");

  // ── Risk label ────────────────────────────────────────────────────────────
  const riskLabel =
    isLossMaking ? "Turnaround Case" :
    revenueGrowthRate > 0.5 ? "High Growth" :
    ebitdaMargin > 0.2 && revenueGrowthRate > 0.1 ? "High Quality" :
    ebitdaMargin < 0.08 ? "High Risk" :
    "Standard";

  // ── Deal tag (asking price) ───────────────────────────────────────────────
  let tag = "Fairly Valued";
  if (askingValuation && suggestedPrice > 0) {
    if (askingValuation < suggestedPrice * 0.9) tag = "Undervalued";
    else if (askingValuation > suggestedPrice * 1.1) tag = "Overvalued";
  }
  if (isLossMaking && suggestedPrice === 0) tag = "Distressed / Turnaround";

  // ── Explanation ───────────────────────────────────────────────────────────
  const methodNote = isLossMaking
    ? `Revenue multiple (${benchmark.revenueMultiple}x) used because EBITDA is negative.`
    : `EBITDA multiple of ${benchmark.ebitdaMultiple}x applied.`;
  const dcfNote = notMeaningful
    ? "DCF not applicable (all FCFs negative)."
    : `5-year DCF at ${baseDiscountRate * 100}% WACC yields ₹${(dcfValue / 10).toFixed(1)}Cr.`;

  const explanation =
    `${benchmark.industry} benchmark — ${methodNote} ` +
    `Comparable EV: ₹${(comparableEV / 10).toFixed(1)}Cr. ` +
    `${dcfNote} ` +
    `Deal score: ${dealScore}/100 (${dealRating}). ` +
    `Suggested price: ₹${(suggestedPrice / 10).toFixed(1)}Cr.`;

  return {
    listingId,
    comparableEV: Math.round(comparableEV),
    dcfValue: Math.round(dcfValue),
    rangeMin: Math.round(rangeMin),
    rangeMax: Math.round(rangeMax),
    suggestedPrice: Math.round(suggestedPrice),
    confidenceScore: Math.round(confidence) / 100,
    explanation,
    ebitdaMultiple: !isLossMaking && ebitda > 0 ? Math.round((comparableEV / ebitda) * 10) / 10 : 0,
    industryBenchmarkMultiple: isLossMaking ? benchmark.revenueMultiple : benchmark.ebitdaMultiple,
    discountRate: baseDiscountRate,
    terminalGrowthRate,
    projectedCashFlows,
    tag,
    riskLabel,
    valuationMethod,
    isLossMaking,
    dcfNotMeaningful: notMeaningful,
    scenarios,
    irr,
    moic,
    moicLabel,
    paybackYears,
    dealScore,
    dealRating,
    tags,
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
// Deal quality score (unchanged)
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
  const docs = deal.documentCount ?? 0;
  score += Math.min(docs * 5, 10);
  const capped = Math.min(100, score);
  const trustLevel: "unverified" | "partially_verified" | "verified" =
    capped >= 70 ? "verified" : capped >= 40 ? "partially_verified" : "unverified";
  return { score: capped, trustLevel };
}
