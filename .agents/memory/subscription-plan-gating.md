---
name: Subscription + plan gating
description: How plan tiers are stored, enforced on the backend, and surfaced in the frontend.
---

## Rule
The `users.tier` column is the denormalized source of truth for the active plan (`"free"` | `"investor_pro"` | `"seller_premium"`). The `subscriptions` table stores history and is updated on every upgrade, but `requirePlan` reads `req.dbUser.tier` for speed.

**Why:** Fetching the subscription row on every gated request would add a DB round-trip to every protected endpoint. Denormalizing into users.tier keeps it to the single row already fetched by `requireAuth`.

## How to apply
- Backend gate: add `requirePlan("investor_pro")` (from `lib/auth.ts`) to any route that needs a paid plan. It checks `req.dbUser.tier`.
- Free limits: instead of `requirePlan`, apply a count check inline (e.g. private deals: free users get 1 deal max).
- Frontend gate: use `<PlanGate requiredPlan="investor_pro" fullPage>` for full pages; use inline `<PlanGate>` for blurred sections.
- Frontend check: `usePlan()` hook returns `{ plan, isFree, isInvestorPro, hasAccess }`.
- Upgrade: `POST /api/subscriptions/upgrade { plan }` → updates both `subscriptions` table and `users.tier`; returns `{ user, subscription }`. No payment required currently — swap this endpoint for a Stripe webhook handler when payment is added.
- `useUpgradePlan()` mutation in `hooks/usePlan.ts` calls the endpoint and sets the "me" query cache directly.
