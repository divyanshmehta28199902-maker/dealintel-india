import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  dbUserId?: number;
  dbUser?: typeof usersTable.$inferSelect;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "User not provisioned" });
      return;
    }
    req.dbUserId = user[0].id;
    req.dbUser = user[0];
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireRole(role: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.dbUser.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
