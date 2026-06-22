import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

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

router.patch("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, role } = req.body as { name?: string; role?: string };

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
      })
      .where(eq(usersTable.id, req.dbUserId!))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
