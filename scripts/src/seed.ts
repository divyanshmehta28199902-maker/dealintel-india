import { db } from "@workspace/db";
import { industryBenchmarksTable } from "@workspace/db";

const benchmarks = [
  { industry: 'Technology', ebitdaMultiple: 12.5, revenueMultiple: 4.0, growthRate: 0.22, description: 'SaaS and tech services growing rapidly on digital transformation wave' },
  { industry: 'Healthcare', ebitdaMultiple: 10.0, revenueMultiple: 2.5, growthRate: 0.18, description: 'Pharma and diagnostics benefiting from rising health awareness in India' },
  { industry: 'Manufacturing', ebitdaMultiple: 6.5, revenueMultiple: 1.2, growthRate: 0.12, description: 'PLI schemes driving capacity expansion in Indian manufacturing' },
  { industry: 'Retail', ebitdaMultiple: 7.0, revenueMultiple: 1.5, growthRate: 0.15, description: 'Organized retail growing with formalisation and e-commerce integration' },
  { industry: 'Financial Services', ebitdaMultiple: 11.0, revenueMultiple: 3.0, growthRate: 0.20, description: 'Fintech and NBFC space expanding with credit penetration growth' },
  { industry: 'Real Estate', ebitdaMultiple: 9.0, revenueMultiple: 2.0, growthRate: 0.14, description: 'Residential and commercial real estate recovering post-COVID' },
  { industry: 'Education', ebitdaMultiple: 8.5, revenueMultiple: 2.2, growthRate: 0.17, description: 'EdTech and private schools benefiting from growing middle class' },
  { industry: 'Food & Beverage', ebitdaMultiple: 8.0, revenueMultiple: 1.8, growthRate: 0.13, description: 'Branded F&B and QSR chains expanding in tier-2 cities' },
  { industry: 'Logistics', ebitdaMultiple: 7.5, revenueMultiple: 1.4, growthRate: 0.19, description: 'Supply chain modernisation and e-commerce driving logistics growth' },
  { industry: 'Renewable Energy', ebitdaMultiple: 13.0, revenueMultiple: 3.5, growthRate: 0.25, description: 'Solar and wind energy targets creating massive investment opportunity' },
  { industry: 'Agriculture', ebitdaMultiple: 5.5, revenueMultiple: 1.0, growthRate: 0.09, description: 'AgriTech and food processing adding value to traditional agriculture' },
  { industry: 'Media & Entertainment', ebitdaMultiple: 9.5, revenueMultiple: 2.3, growthRate: 0.16, description: 'OTT and regional content driving media sector growth' },
];

for (const b of benchmarks) {
  await db.insert(industryBenchmarksTable).values(b).onConflictDoUpdate({
    target: industryBenchmarksTable.industry,
    set: { ebitdaMultiple: b.ebitdaMultiple, revenueMultiple: b.revenueMultiple, growthRate: b.growthRate, description: b.description },
  });
}
console.log('Seeded', benchmarks.length, 'benchmarks');
process.exit(0);
