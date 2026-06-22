---
name: Valuation shape
description: ValuationResult extended fields for scenario analysis and return metrics
---

**Rule:** `ValuationResult` now optionally includes `scenarios?: ScenarioResult[]`, `irr?: number`, `moic?: number`, `paybackYears?: number`. `ValuationDisplay` renders these only when present (gracefully degraded for older data or listings where scenarios aren't computed).

**ScenarioResult shape:** `{ label: "Bear"|"Base"|"Bull", valuation: number, growthRate: number, discountRate: number }`

**Why:** Optional fields allow backwards compatibility with existing stored valuations that don't have scenario data.

**How to apply:** Any new return metrics added to `computeValuation()` in `valuation.ts` must also be added as optional fields to the `ValuationResult` interface in `lib/types.ts` and rendered in `ValuationDisplay.tsx`.
