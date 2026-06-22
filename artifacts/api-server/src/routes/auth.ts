import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { validateBody } from "../lib/validate";

const router = Router();

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(["seller", "investor"]).optional(),
});

// JIT-provision user on first call, then return profile
router.get("/me", async (req: AuthRequest, res, next) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);

    if (!user) {
      // JIT provision
      const email = (auth.sessionClaims?.email as string) ?? "";
      const name = (auth.sessionClaims?.name as string) ?? null;
      [user] = await db.insert(usersTable).values({
        clerkId: auth.userId,
        email,
        name,
        tier: "free",
      }).returning();
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, validateBody(updateMeSchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, role } = req.body as z.infer<typeof updateMeSchema>;

    // Role is the authorization boundary, so it may only be set ONCE (during onboarding)
    // and never changed afterward — otherwise any user could escalate between seller/investor.
    if (role !== undefined && req.dbUser?.role && req.dbUser.role !== role) {
      res.status(403).json({ error: "Role cannot be changed after onboarding" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(role !== undefined && !req.dbUser?.role && { role }),
      })
      .where(eq(usersTable.id, req.dbUserId!))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
