import { Router } from "express";
import { db } from "@workspace/db";
import { watchlistTable, listingsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select({ watchlist: watchlistTable, listing: listingsTable, sellerName: usersTable.name })
      .from(watchlistTable)
      .leftJoin(listingsTable, eq(watchlistTable.listingId, listingsTable.id))
      .leftJoin(usersTable, eq(listingsTable.userId, usersTable.id))
      .where(eq(watchlistTable.userId, req.dbUserId!))
      .orderBy(sql`${watchlistTable.createdAt} DESC`);

    res.json(rows.map(({ watchlist, listing, sellerName }) => ({
      ...watchlist,
      listing: listing ? { ...listing, sellerName } : null,
    })));
  } catch (err) {
    next(err);
  }
});

router.post("/:listingId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listingId = Number(req.params.listingId);
    const [existing] = await db
      .select()
      .from(watchlistTable)
      .where(and(eq(watchlistTable.userId, req.dbUserId!), eq(watchlistTable.listingId, listingId)))
      .limit(1);

    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const [item] = await db.insert(watchlistTable).values({
      userId: req.dbUserId!,
      listingId,
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/:listingId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listingId = Number(req.params.listingId);
    await db
      .delete(watchlistTable)
      .where(and(eq(watchlistTable.userId, req.dbUserId!), eq(watchlistTable.listingId, listingId)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
