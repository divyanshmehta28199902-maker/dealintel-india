import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable, PLANS, type Plan } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { validateBody } from "../lib/validate";

const router = Router();

const upgradeSchema = z.object({
  plan: z.enum(["free", "investor_pro", "seller_premium"]),
});

// GET /api/subscriptions/me — current subscription + plan
router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, req.dbUserId!),
          eq(subscriptionsTable.status, "active"),
        ),
      )
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(1);

    res.json({
      plan: req.dbUser!.tier,
      subscription: sub ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/upgrade — upgrade (or downgrade) plan
// In dev: free upgrade — no payment required.
// In production: this endpoint should only be called after a successful payment webhook.
router.post("/upgrade", requireAuth, validateBody(upgradeSchema), async (req: AuthRequest, res, next) => {
  try {
    const { plan } = req.body as z.infer<typeof upgradeSchema>;
    const userId = req.dbUserId!;

    // Cancel any existing active subscriptions
    await db
      .update(subscriptionsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));

    // Create new subscription record
    const [sub] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        plan,
        status: "active",
        startedAt: new Date(),
        endsAt: null,
      })
      .returning();

    // Update denormalised tier on users row (fast path for auth middleware)
    const [updated] = await db
      .update(usersTable)
      .set({ tier: plan })
      .where(eq(usersTable.id, userId))
      .returning();

    res.json({ user: updated, subscription: sub });
  } catch (err) {
    next(err);
  }
});

export default router;
