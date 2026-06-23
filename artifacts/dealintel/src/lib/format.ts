// Values are stored in INR lakhs. Format to lakhs/crores.
export function formatINR(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: cr >= 100 ? 0 : 2 })} Cr`;
  }
  return `₹${lakhs.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
}

export function formatPct(value: number, fromFraction = false): string {
  const pct = fromFraction ? value * 100 : value;
  return `${pct >= 0 ? "" : ""}${pct.toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export const INDUSTRIES = [
  "Technology",
  "SaaS",
  "IT Services",
  "Healthcare",
  "Pharma",
  "Manufacturing",
  "Chemicals",
  "Automotive / EV",
  "Retail",
  "D2C / E-commerce",
  "Financial Services",
  "Real Estate",
  "Infrastructure / Construction",
  "Education",
  "Food & Beverage",
  "Logistics",
  "Renewable Energy",
  "Agriculture",
  "Media & Entertainment",
  "Other",
];

export const STAGES = [
  { value: "seed", label: "Seed" },
  { value: "early", label: "Early Stage" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
];

export const INDIAN_STATES = [
  "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat", "Telangana",
  "Uttar Pradesh", "West Bengal", "Rajasthan", "Haryana", "Kerala", "Punjab",
  "Madhya Pradesh", "Andhra Pradesh", "Bihar", "Odisha", "Other",
];
