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

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.dbUser.role || !roles.includes(req.dbUser.role)) {
      res.status(403).json({ error: `Forbidden: requires ${roles.join(" or ")} role` });
      return;
    }
    next();
  };
}

// Resolves the DB user if a valid session exists, but never rejects the request.
// Used for endpoints that are public for some resources and private for others.
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
      if (user) {
        req.dbUserId = user.id;
        req.dbUser = user;
      }
    }
  } catch {
    // ignore — treat as anonymous
  }
  next();
}
