import { type IndustryBenchmark } from "@workspace/db";

export interface ValuationInput {
  revenue: number;
  ebitda: number;
  ebitdaMargin?: number;
  revenueGrowthRate?: number;
  askingValuation?: number;
  benchmark: IndustryBenchmark;
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
}

export function computeValuation(listingId: number, input: ValuationInput): ValuationResult {
  const { revenue, ebitda, revenueGrowthRate = 0.12, benchmark, askingValuation } = input;

  // Comparable EV (EBITDA × industry multiple)
  const comparableEV = ebitda * benchmark.ebitdaMultiple;

  // 5-year DCF
  const discountRate = 0.15; // 15% WACC — typical for Indian SME
  const terminalGrowthRate = 0.05; // 5% perpetuity growth
  const capexRatio = 0.04; // 4% of revenue
  const wcChangeRatio = 0.02; // 2% of revenue

  const projectedCashFlows: number[] = [];
  let currentRevenue = revenue;
  let presentValue = 0;

  for (let year = 1; year <= 5; year++) {
    currentRevenue *= 1 + revenueGrowthRate;
    const projectedEbitda = currentRevenue * (ebitda / revenue);
    const fcf = projectedEbitda - currentRevenue * capexRatio - currentRevenue * wcChangeRatio;
    const discounted = fcf / Math.pow(1 + discountRate, year);
    projectedCashFlows.push(Math.round(fcf));
    presentValue += discounted;
  }

  // Terminal value
  const lastFCF = projectedCashFlows[4] ?? 0;
  const terminalValue = (lastFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const discountedTV = terminalValue / Math.pow(1 + discountRate, 5);
  const dcfValue = presentValue + discountedTV;

  // Confidence score based on data completeness and margin quality
  const ebitdaMarginPct = ebitda / revenue;
  let confidence = 0.7;
  if (ebitdaMarginPct > 0.2) confidence += 0.1;
  if (revenueGrowthRate > 0.1) confidence += 0.1;
  if (ebitda > 0) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  const rangeMin = Math.min(comparableEV, dcfValue) * 0.9;
  const rangeMax = Math.max(comparableEV, dcfValue) * 1.1;
  const suggestedPrice = (comparableEV * 0.5 + dcfValue * 0.5);

  let tag = "Fairly Valued";
  if (askingValuation) {
    if (askingValuation < suggestedPrice * 0.9) tag = "Undervalued";
    else if (askingValuation > suggestedPrice * 1.1) tag = "Overvalued";
  }

  const explanation = `Based on ${benchmark.industry} sector benchmarks (${benchmark.ebitdaMultiple}x EBITDA multiple), ` +
    `the comparable EV is ₹${Math.round(comparableEV / 100) / 10}Cr. ` +
    `A 5-year DCF at ${discountRate * 100}% discount rate with ${revenueGrowthRate * 100}% revenue growth ` +
    `yields ₹${Math.round(dcfValue / 100) / 10}Cr intrinsic value. ` +
    `Suggested deal price is ₹${Math.round(suggestedPrice / 100) / 10}Cr.`;

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
    discountRate,
    terminalGrowthRate,
    projectedCashFlows,
    tag,
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

  const ebitdaMargin = ebitda / revenue;

  // Risk factors
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

  // Growth factors
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
