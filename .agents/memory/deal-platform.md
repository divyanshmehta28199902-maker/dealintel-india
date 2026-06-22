---
name: Deal platform architecture
description: Key decisions for private deals, quality scoring, and trust levels
---

**Rule:** `dealMode` on private_deals is either "quick" (core financials only) or "verified" (full narrative + docs + legal confirmation). The frontend collects `legalConfirmed: boolean`; the route converts it to `legalConfirmedAt: Date | null`.

**Quality score:** Computed server-side by `computeDealQualityScore()` in `valuation.ts`. Score 0–100. trustLevel: unverified (<40), partially_verified (40–69), verified (70+). Refreshed on deal create, and when documents are added/removed.

**Why:** Keeps scoring logic authoritative on the backend; frontend can show a live preview score but cannot influence the stored value.

**How to apply:** Any change to quality scoring criteria must update `computeDealQualityScore` in `lib/valuation.ts`, not the frontend.
