import { type IndustryBenchmark } from "@workspace/db";

export interface ValuationInput {
  revenue: number;
  ebitda: number;
  ebitdaMargin?: number;
  revenueGrowthRate?: number;
  askingValuation?: number;
  benchmark: IndustryBenchmark;
}

export interface ScenarioResult {
  label: "Bear" | "Base" | "Bull";
  valuation: number;
  growthRate: number;
  discountRate: number;
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
  scenarios: ScenarioResult[];
  irr: number;
  moic: number;
  paybackYears: number;
}

function computeDCF(
  revenue: number,
  ebitdaMargin: number,
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
): { dcfValue: number; projectedCashFlows: number[] } {
  const capexRatio = 0.04;
  const wcChangeRatio = 0.02;
  const cashFlows: number[] = [];
  let currentRevenue = revenue;
  let presentValue = 0;

  for (let year = 1; year <= 5; year++) {
    currentRevenue *= 1 + growthRate;
    const projectedEbitda = currentRevenue * ebitdaMargin;
    const fcf = projectedEbitda - currentRevenue * capexRatio - currentRevenue * wcChangeRatio;
    const discounted = fcf / Math.pow(1 + discountRate, year);
    cashFlows.push(Math.round(fcf));
    presentValue += discounted;
  }

  const lastFCF = cashFlows[4] ?? 0;
  const terminalValue = (lastFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const discountedTV = terminalValue / Math.pow(1 + discountRate, 5);

  return { dcfValue: presentValue + discountedTV, projectedCashFlows: cashFlows };
}

function computeIRR(investment: number, cashFlows: number[], exitValue: number): number {
  if (investment <= 0) return 0;
  // Bisection method for IRR (5-year hold + exit)
  let lo = -0.5, hi = 5.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    let npv = -investment;
    for (let y = 0; y < cashFlows.length; y++) {
      npv += cashFlows[y] / Math.pow(1 + mid, y + 1);
    }
    npv += exitValue / Math.pow(1 + mid, cashFlows.length);
    if (Math.abs(npv) < 0.01) break;
    if (npv > 0) lo = mid; else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 1000) / 10; // as %
}

export function computeValuation(listingId: number, input: ValuationInput): ValuationResult {
  const { revenue, ebitda, revenueGrowthRate = 0.12, benchmark, askingValuation } = input;

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;
  const terminalGrowthRate = 0.05;
  const baseDiscountRate = 0.15;

  // Base DCF
  const { dcfValue, projectedCashFlows } = computeDCF(
    revenue, ebitdaMargin, revenueGrowthRate, baseDiscountRate, terminalGrowthRate,
  );

  // Comparable EV
  const comparableEV = ebitda * benchmark.ebitdaMultiple;
  const suggestedPrice = (comparableEV * 0.5 + dcfValue * 0.5);

  // Bear / Base / Bull scenarios
  const scenarios: ScenarioResult[] = [
    {
      label: "Bear",
      growthRate: revenueGrowthRate * 0.6,
      discountRate: 0.18,
      valuation: Math.round((computeDCF(revenue, ebitdaMargin, revenueGrowthRate * 0.6, 0.18, terminalGrowthRate).dcfValue + comparableEV * 0.8) / 2),
    },
    {
      label: "Base",
      growthRate: revenueGrowthRate,
      discountRate: baseDiscountRate,
      valuation: Math.round(suggestedPrice),
    },
    {
      label: "Bull",
      growthRate: revenueGrowthRate * 1.4,
      discountRate: 0.12,
      valuation: Math.round((computeDCF(revenue, ebitdaMargin, revenueGrowthRate * 1.4, 0.12, terminalGrowthRate).dcfValue + comparableEV * 1.2) / 2),
    },
  ];

  // IRR + MOIC (assume investment at suggestedPrice, 5-year hold, exit at 6× last-year EBITDA)
  const lastYearRevenue = revenue * Math.pow(1 + revenueGrowthRate, 5);
  const exitEBITDA = lastYearRevenue * ebitdaMargin;
  const exitValue = exitEBITDA * benchmark.ebitdaMultiple;
  const investmentAmount = askingValuation ?? suggestedPrice;
  const moic = investmentAmount > 0 ? Math.round((exitValue / investmentAmount) * 10) / 10 : 0;
  const irr = computeIRR(investmentAmount, projectedCashFlows, exitValue);

  // Payback period (cumulative FCF >= investment)
  let cumulative = 0;
  let paybackYears = 5;
  for (let i = 0; i < projectedCashFlows.length; i++) {
    cumulative += projectedCashFlows[i];
    if (cumulative >= investmentAmount) { paybackYears = i + 1; break; }
  }

  const rangeMin = Math.min(comparableEV, dcfValue) * 0.9;
  const rangeMax = Math.max(comparableEV, dcfValue) * 1.1;

  // Confidence score
  let confidence = 0.65;
  if (ebitdaMargin > 0.2) confidence += 0.1;
  if (revenueGrowthRate > 0.1) confidence += 0.1;
  if (ebitda > 0) confidence += 0.1;
  if (askingValuation) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  let tag = "Fairly Valued";
  if (askingValuation) {
    if (askingValuation < suggestedPrice * 0.9) tag = "Undervalued";
    else if (askingValuation > suggestedPrice * 1.1) tag = "Overvalued";
  }

  const explanation =
    `Based on ${benchmark.industry} sector benchmarks (${benchmark.ebitdaMultiple}x EBITDA multiple), ` +
    `the comparable EV is ₹${Math.round(comparableEV / 10) / 10}Cr. ` +
    `A 5-year DCF at ${baseDiscountRate * 100}% discount rate with ${revenueGrowthRate * 100}% revenue growth ` +
    `yields ₹${Math.round(dcfValue / 10) / 10}Cr intrinsic value. ` +
    `Suggested deal price is ₹${Math.round(suggestedPrice / 10) / 10}Cr.`;

  return {
    listingId,
    comparableEV: Math.round(comparableEV),
    dcfValue: Math.round(dcfValue),
    rangeMin: Math.round(rangeMin),
    rangeMax: Math.round(rangeMax),
    suggestedPrice: Math.round(suggestedPrice),
    confidenceScore: Math.round(confidence * 100) / 100,
    explanation,
    ebitdaMultiple: ebitda > 0 ? Math.round((comparableEV / ebitda) * 10) / 10 : 0,
    industryBenchmarkMultiple: benchmark.ebitdaMultiple,
    discountRate: baseDiscountRate,
    terminalGrowthRate,
    projectedCashFlows,
    tag,
    scenarios,
    irr,
    moic,
    paybackYears,
  };
}

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
    listingId,
    revenue,
    ebitda,
    revenueGrowthRate = 0.1,
    debtRatio = 0.3,
    customerConcentration = 0.3,
    benchmark,
  } = input;

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;

  const riskFactors = [
    {
      factor: "Debt Ratio",
      score: Math.min(10, debtRatio * 20),
      description: debtRatio > 0.5
        ? "High leverage poses repayment risk"
        : debtRatio > 0.3 ? "Moderate debt levels" : "Conservative debt structure",
    },
    {
      factor: "Customer Concentration",
      score: Math.min(10, customerConcentration * 15),
      description: customerConcentration > 0.5
        ? "High dependence on few customers"
        : customerConcentration > 0.3 ? "Moderate concentration risk" : "Well-diversified customer base",
    },
    {
      factor: "EBITDA Margin",
      score: ebitdaMargin < 0.1 ? 7 : ebitdaMargin < 0.2 ? 4 : 2,
      description: ebitdaMargin < 0.1
        ? "Thin margins indicate operational stress"
        : ebitdaMargin < 0.2 ? "Adequate margins" : "Strong operational efficiency",
    },
  ];

  const riskScore = riskFactors.reduce((acc, f) => acc + f.score, 0) / riskFactors.length;

  const growthFactors = [
    {
      factor: "Revenue Growth",
      score: Math.min(10, revenueGrowthRate * 50),
      description: revenueGrowthRate > 0.2
        ? "Strong revenue momentum"
        : revenueGrowthRate > 0.1 ? "Steady growth trajectory" : "Growth below industry average",
    },
    {
      factor: "Industry Tailwinds",
      score: Math.min(10, benchmark.growthRate * 40),
      description: `${benchmark.industry} sector growing at ${(benchmark.growthRate * 100).toFixed(1)}% — ${benchmark.description}`,
    },
    {
      factor: "EBITDA Expansion",
      score: ebitdaMargin > 0.25 ? 8 : ebitdaMargin > 0.15 ? 6 : 4,
      description: ebitdaMargin > 0.25
        ? "High margins with room for expansion"
        : "Standard margin profile for sector",
    },
  ];

  const growthScore = growthFactors.reduce((acc, f) => acc + f.score, 0) / growthFactors.length;

  const aiInsights: string[] = [];
  if (ebitdaMargin < 0.1) aiInsights.push("High risk due to declining margins — monitor EBITDA closely");
  if (revenueGrowthRate > 0.2) aiInsights.push(`Strong growth opportunity — revenue growing at ${(revenueGrowthRate * 100).toFixed(0)}% YoY`);
  if (debtRatio < 0.2 && ebitdaMargin > 0.2) aiInsights.push("Potentially undervalued — strong fundamentals with conservative balance sheet");
  if (customerConcentration > 0.5) aiInsights.push("Customer concentration risk — top customer exit could impair 50%+ of revenue");
  if (benchmark.growthRate > 0.15) aiInsights.push(`${benchmark.industry} sector is high-growth — strategic entry point`);

  let marketSentiment = "neutral";
  if (growthScore > 6 && riskScore < 4) marketSentiment = "positive";
  else if (riskScore > 6) marketSentiment = "negative";

  return {
    listingId,
    riskScore: Math.round(riskScore * 10) / 10,
    growthScore: Math.round(growthScore * 10) / 10,
    riskFactors,
    growthFactors,
    aiInsights,
    marketSentiment,
    industryGrowthRate: benchmark.growthRate,
    trendSummary: benchmark.description,
  };
}

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
  let score = 20; // base for having core financials (revenue, ebitda, growth)

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
  score += Math.min(docs * 5, 10); // up to +10 for 2 docs

  const capped = Math.min(100, score);

  let trustLevel: "unverified" | "partially_verified" | "verified";
  if (capped >= 70) trustLevel = "verified";
  else if (capped >= 40) trustLevel = "partially_verified";
  else trustLevel = "unverified";

  return { score: capped, trustLevel };
}
