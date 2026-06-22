# DealIntel India

A production-ready M&A platform for the Indian SME market. It runs a dual portal — **Sellers** list their businesses; **Investors** browse, value, and contact deals — backed by a real valuation engine (comparable EV multiples + 5-year DCF + terminal value) and a deal-intelligence scoring model.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (binds to `PORT`, served at `/api`)
- `pnpm --filter @workspace/dealintel run dev` — run the React web client
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed industry benchmarks (valuation depends on this table being populated)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET`; Clerk keys for auth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite, Clerk auth, theme switcher (Dark / Light / Finance Blue)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API routes: `artifacts/api-server/src/routes/` (`listings`, `contact_requests`, `private_deals`, `watchlist`, `messages`, `dashboard`, `auth`)
- API libs: `artifacts/api-server/src/lib/` — `auth.ts` (Clerk + role/ownership middleware), `validate.ts` (`validateBody`, `parseId`), `valuation.ts` (valuation + intelligence engines)
- DB schema (source of truth): `lib/db/src/schema/` (`listings`, `private_deals`, `users`, etc.)
- Web client: `artifacts/dealintel/`
- Benchmark seed: `scripts/src/`

## Architecture decisions

- **Money is stored in INR lakhs.** Listing rates (`ebitdaMargin`, `revenueGrowthRate`, `debtRatio`, `customerConcentration`) are fractions (0–1). Private-deal `growthRate` is collected as a **percent** and divided by 100 before analysis — the only percent-based input.
- **Backend is the authorization boundary.** Reads of a listing's valuation/intelligence require the listing to be `active` OR the requester to be the owner; contact/watchlist/private-deal writes require the `investor` role; listing creation requires the `seller` role. Never trust the client for role or ownership.
- **All write bodies are validated with Zod** via `validateBody`, which strips unknown keys — so PATCH/declaration cannot smuggle `status`/`userId`/`id`.
- **Private-deal analysis runs async** (`setImmediate`) and sets status `analyzing → complete`, or `failed` on error/missing benchmark (never left stuck in `analyzing`).
- **Idempotent state transitions:** accepting an already-accepted contact request returns the existing thread (no duplicate); a duplicate pending contact request returns the existing one.

## Roles

- One role per account: `"seller"` or `"investor"`, set during onboarding.

## Gotchas

- Run `pnpm --filter @workspace/scripts run seed` on a fresh DB or valuation/intelligence endpoints return 503 (no benchmark data).
- After editing a `lib/*` package, run `pnpm run typecheck:libs` before leaf typechecks — missing `@workspace/db` exports usually mean stale composite declarations, not bad imports.
- Express 5 route params are typed `string | string[]`; use `parseId(req.params.x)` which guards for that and rejects non-positive/non-integer ids.
- Tailwind v4: `dark` is a variant, not a class to `@apply`. The default theme is set via `class="dark"` on `<html>`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
