import { Router } from "express";
import { db } from "@workspace/db";
import { watchlistTable, listingsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";
import { parseId } from "../lib/validate";

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
      // Only expose listing financials while the listing is still active — a seller who
      // delists must not keep leaking data to investors who previously saved it.
      listing: listing && listing.status === "active" ? { ...listing, sellerName } : null,
    })));
  } catch (err) {
    next(err);
  }
});

router.post("/:listingId", requireAuth, requireRole("investor"), async (req: AuthRequest, res, next) => {
  try {
    const listingId = parseId(req.params.listingId);
    if (!listingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Only active listings can be watched.
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
    if (!listing || listing.status !== "active") {
      res.status(404).json({ error: "Not found" });
      return;
    }

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
    const listingId = parseId(req.params.listingId);
    if (!listingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db
      .delete(watchlistTable)
      .where(and(eq(watchlistTable.userId, req.dbUserId!), eq(watchlistTable.listingId, listingId)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
