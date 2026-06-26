export type ValuationInputs = {
  revenue: number;
  ebitda: number;
  industry: string;
  growth: number;
  discount: number;
  industryRev: number;
  industryEbitda: number;
};

export type BasicResult = {
  dcf: number;
  comparable: number;
  blended: number;
  evRevenue: number;
  evEbitda: number;
  bearCase: number;
  bullCase: number;
};

export type SensitivityRow = {
  label: string;
  value: number;
  delta: string;
};

export type ScenarioDescription = {
  label: "Bear" | "Base" | "Bull";
  reason: string;
};

export type ValuationInsights = {
  confidence: number;
  confidenceLabel: "Low" | "Moderate" | "High";
  confidenceReason: string;
  summary: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  investorPositives: string[];
  investorConcerns: string[];
  sensitivity: SensitivityRow[];
  scenarioDescriptions: ScenarioDescription[];
  recommendations: string[];
  valuationMethod: string;
  rangeMin: number;
  rangeMax: number;
};

export function formatCr(lakhs: number): string {
  if (lakhs >= 10000) return `₹${(lakhs / 10000).toFixed(2)} Cr`;
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}L`;
  return `₹${Math.round(lakhs)}L`;
}

export function computeInsights(
  inputs: ValuationInputs,
  result: BasicResult
): ValuationInsights {
  const { revenue, ebitda, industry, growth, discount, industryRev, industryEbitda } = inputs;
  const { dcf, comparable, blended, bearCase, bullCase } = result;

  const ebitdaMarginPct = revenue > 0 ? (ebitda / revenue) * 100 : 0;
  const growthPct = growth * 100;
  const discountPct = discount * 100;
  const isLossMaking = ebitda <= 0;

  // ── Confidence ───────────────────────────────────────────────────
  let confidence = 40;
  if (!isLossMaking) confidence += 20;
  if (ebitdaMarginPct >= 5 && ebitdaMarginPct <= 50) confidence += 15;
  if (growthPct >= 3 && growthPct <= 50) confidence += 15;
  if (revenue >= 50) confidence += 10;
  confidence = Math.min(confidence, 100);

  const confidenceLabel: "Low" | "Moderate" | "High" =
    confidence < 50 ? "Low" : confidence < 75 ? "Moderate" : "High";

  const confReasons: string[] = [];
  if (isLossMaking) confReasons.push("negative EBITDA limits DCF reliability");
  else if (ebitdaMarginPct > 50) confReasons.push("unusually high margins may be optimistic");
  if (growthPct > 50) confReasons.push("aggressive growth rate assumption");
  if (revenue < 50) confReasons.push("revenue base below typical SME deal size");
  if (confReasons.length === 0) confReasons.push("complete and internally consistent financial inputs");
  const confidenceReason =
    confReasons.slice(0, 2).map((r) => r[0].toUpperCase() + r.slice(1)).join("; ") + ".";

  // ── Summary ──────────────────────────────────────────────────────
  const summary = buildSummary(inputs, result, ebitdaMarginPct, isLossMaking);

  // ── Key Drivers ──────────────────────────────────────────────────
  const positiveDrivers: string[] = [];
  const negativeDrivers: string[] = [];

  if (!isLossMaking) positiveDrivers.push("Profitable business with positive EBITDA and cash generation");
  if (ebitdaMarginPct >= 20) positiveDrivers.push(`High EBITDA margin of ${ebitdaMarginPct.toFixed(0)}% — significantly above SME average`);
  else if (ebitdaMarginPct >= 12) positiveDrivers.push(`Healthy EBITDA margin of ${ebitdaMarginPct.toFixed(0)}%`);
  if (growthPct >= 20) positiveDrivers.push(`Strong revenue growth of ${growthPct.toFixed(0)}% drives material terminal value`);
  else if (growthPct >= 12) positiveDrivers.push(`Solid revenue growth rate of ${growthPct.toFixed(0)}%`);
  if (industryEbitda >= 8) positiveDrivers.push(`${industry} sector attracts premium multiples (${industryEbitda.toFixed(1)}x EV/EBITDA)`);
  if (dcf > comparable) positiveDrivers.push("Growth story well-captured by DCF — future cash flows drive significant value");
  if (revenue >= 200) positiveDrivers.push(`Scale of ${formatCr(revenue)} revenue is attractive to institutional buyers`);

  if (isLossMaking) negativeDrivers.push("Loss-making — valuation depends entirely on revenue multiple and growth trajectory");
  if (!isLossMaking && ebitdaMarginPct < 8) negativeDrivers.push(`Thin EBITDA margin of ${ebitdaMarginPct.toFixed(0)}% leaves limited buffer post-acquisition`);
  if (growthPct < 8) negativeDrivers.push(`Low growth of ${growthPct.toFixed(0)}% may deter growth-oriented investors`);
  if (discountPct >= 22) negativeDrivers.push(`High discount rate of ${discountPct.toFixed(0)}% materially reduces DCF value`);
  if (industryEbitda < 5) negativeDrivers.push(`${industry} sector carries conservative market multiples (${industryEbitda.toFixed(1)}x)`);

  // ── Investor Perspective ─────────────────────────────────────────
  const investorPositives: string[] = [];
  const investorConcerns: string[] = [];

  if (!isLossMaking) investorPositives.push("Profitable operation with demonstrable cash generation");
  if (growthPct >= 12) investorPositives.push("Positive growth trajectory indicates expanding market demand");
  if (industryEbitda >= 7) investorPositives.push(`Operating in a high-multiple sector (${industry}) with strong deal comparables`);
  if (revenue >= 100) investorPositives.push(`Revenue of ${formatCr(revenue)} provides meaningful deal size`);
  if (ebitdaMarginPct >= 15) investorPositives.push("Strong margins indicate pricing power and operational efficiency");
  if (investorPositives.length === 0) investorPositives.push("Business is operational with a visible revenue base");

  investorConcerns.push("Unverified financials — audited statements and CA sign-off not yet submitted");
  investorConcerns.push("No due diligence materials or data room available at this stage");
  if (!isLossMaking && ebitdaMarginPct < 12) investorConcerns.push("Margins leave limited buffer for integration costs and management fees");
  investorConcerns.push("Customer concentration and revenue diversity not yet disclosed");
  if (discountPct >= 20) investorConcerns.push(`High required return (${discountPct.toFixed(0)}%) may compress IRR below PE hurdle rates`);

  // ── Sensitivity Analysis ─────────────────────────────────────────
  const calcComparable = (mult: number) =>
    Math.max(0, Math.round((ebitda * (isLossMaking ? 0 : mult) + revenue * (industryRev * mult / industryEbitda)) / (isLossMaking ? 1 : 2)));

  const sensitivity: SensitivityRow[] = [
    {
      label: "Conservative (−25%)",
      value: Math.round(comparable * 0.75),
      delta: "−25% on market multiples",
    },
    {
      label: "Base Case",
      value: comparable,
      delta: "Current benchmark multiples",
    },
    {
      label: "Optimistic (+25%)",
      value: Math.round(comparable * 1.25),
      delta: "+25% on market multiples",
    },
  ];

  // ── Scenario Descriptions ─────────────────────────────────────────
  const scenarioDescriptions: ScenarioDescription[] = [
    {
      label: "Bear",
      reason: `Growth slows to ${Math.max(growthPct - 8, 0).toFixed(0)}% and market multiples compress by 25%. Reflects a difficult macro environment with higher risk premiums.`,
    },
    {
      label: "Base",
      reason: `Current submitted financials: ${growthPct.toFixed(0)}% growth, ${ebitdaMarginPct.toFixed(0)}% EBITDA margin, standard ${industry} sector multiples.`,
    },
    {
      label: "Bull",
      reason: `Growth accelerates to ${(growthPct + 8).toFixed(0)}%, premium buyer sentiment, and competitive deal dynamics drive a 30% multiple expansion.`,
    },
  ];

  // ── Recommendations ───────────────────────────────────────────────
  const recommendations: string[] = [];
  recommendations.push("Upload audited financial statements (last 3 years) — the single biggest driver of investor confidence");
  recommendations.push("Verify company registration and legal documents to qualify for a Verified Deal badge");
  if (isLossMaking) recommendations.push("Prepare a clear roadmap to profitability with concrete milestones and timeline");
  if (!isLossMaking && ebitdaMarginPct < 12) recommendations.push("Document margin improvement initiatives — a 3–5% gain materially increases valuation");
  recommendations.push("Add customer concentration data: % revenue from top 5 customers, contract tenure, renewal rates");
  recommendations.push("Write a comprehensive business description covering competitive moat, team, and growth drivers");
  if (growthPct < 10) recommendations.push("Substantiate your growth story with pipeline data, market share trends, or signed contracts");
  recommendations.push("Prepare a Confidential Information Memorandum (CIM) for serious buyer conversations");

  return {
    confidence,
    confidenceLabel,
    confidenceReason,
    summary,
    positiveDrivers,
    negativeDrivers,
    investorPositives,
    investorConcerns,
    sensitivity,
    scenarioDescriptions,
    recommendations,
    valuationMethod: isLossMaking
      ? "Revenue Multiple (primary)"
      : "EBITDA Multiple + DCF (60/40 blend)",
    rangeMin: bearCase,
    rangeMax: bullCase,
  };
}

function buildSummary(
  inputs: ValuationInputs,
  result: BasicResult,
  ebitdaMarginPct: number,
  isLossMaking: boolean
): string {
  const { industry, growth, discount, industryEbitda } = inputs;
  const { dcf, comparable, blended } = result;
  const growthPct = growth * 100;
  const discountPct = discount * 100;
  const primaryMethod = dcf > comparable ? "DCF" : "Comparable";

  const parts: string[] = [];

  if (isLossMaking) {
    parts.push(
      `Because EBITDA is negative, the valuation primarily relies on the ${industry} sector revenue multiple, yielding an enterprise value of ${formatCr(blended)}.`
    );
    parts.push(
      "For loss-making businesses, buyers focus on the path to profitability, revenue trajectory, and strategic assets rather than EBITDA-derived multiples."
    );
  } else {
    parts.push(
      `The estimated enterprise value of ${formatCr(blended)} reflects a 60% DCF and 40% comparable multiple approach, with ${primaryMethod === "DCF" ? "DCF contributing the larger component" : "comparable multiples contributing the larger component"}.`
    );
    if (ebitdaMarginPct >= 18) {
      parts.push(
        `An EBITDA margin of ${ebitdaMarginPct.toFixed(0)}% is strong for an Indian SME and significantly enhances the DCF-derived value.`
      );
    } else if (ebitdaMarginPct >= 10) {
      parts.push(
        `The EBITDA margin of ${ebitdaMarginPct.toFixed(0)}% supports a stable 5-year cash flow projection, anchoring the DCF component.`
      );
    } else {
      parts.push(
        `The EBITDA margin of ${ebitdaMarginPct.toFixed(0)}% is below the 12–15% range considered healthy for most Indian SMEs, making the valuation sensitive to margin improvement.`
      );
    }
  }

  if (growthPct >= 20) {
    parts.push(
      `The ${growthPct.toFixed(0)}% growth rate materially lifts the terminal value, which is the largest DCF component in high-growth businesses.`
    );
  } else if (growthPct < 8) {
    parts.push(
      `The conservative ${growthPct.toFixed(0)}% growth assumption limits DCF upside; a stronger growth story could compress the effective entry multiple for buyers.`
    );
  }

  parts.push(
    `The ${industry} sector currently trades at ${industryEbitda.toFixed(1)}x EV/EBITDA in the Indian SME market, ${industryEbitda >= 7 ? "one of the more attractive multiples across sectors" : "reflecting a conservative risk profile for this sector"}.`
  );

  if (!isLossMaking && ebitdaMarginPct >= 12 && growthPct >= 12) {
    parts.push(
      "Based on the submitted financials, the business presents a combination of profitability and growth that institutional investors typically find compelling."
    );
  } else if (!isLossMaking) {
    parts.push(
      "The business has a sound foundation for a credible sale process; strengthening margins or the growth narrative would materially improve the valuation outcome."
    );
  }

  return parts.join(" ");
}
