---
name: Money and rate conventions
description: How money, rates, and percentages flow between frontend and backend
---

**Money:** All monetary values stored and transmitted in **INR lakhs**.

**Rates (listings):** `ebitdaMargin`, `revenueGrowthRate`, `debtRatio`, `customerConcentration` are stored as **fractions (0–1)**. Frontend displays as % by multiplying ×100.

**Private deals — growthRate:** Frontend collects as **percent** (e.g. "20" for 20%). Backend route divides by 100 before analysis. Stored as percent in the DB column.

**Private deals — customerConcentration:** Frontend collects as **percent** (0–100). Backend route divides by 100 before storing/using (so stored as fraction 0–1).

**Why:** Consistent fraction-based storage for listing rates; percent-based UX input is more natural for private deal forms.

**How to apply:** When adding new rate inputs to private deals, decide on UX unit (percent is more natural) and divide by 100 in the route. Document clearly in the route comment. Never trust the client to do the conversion.
