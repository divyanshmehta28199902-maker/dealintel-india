import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactRequestsTable,
  listingsTable,
  usersTable,
  messageThreadsTable,
} from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

// GET /api/contact-requests
router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.dbUserId!;

    // Get all contact requests for this user (as investor or as seller of the listing)
    const rows = await db
      .select({
        cr: contactRequestsTable,
        investorName: usersTable.name,
        listingName: listingsTable.companyName,
      })
      .from(contactRequestsTable)
      .leftJoin(usersTable, eq(contactRequestsTable.investorId, usersTable.id))
      .leftJoin(listingsTable, eq(contactRequestsTable.listingId, listingsTable.id))
      .where(
        or(
          eq(contactRequestsTable.investorId, userId),
          eq(listingsTable.userId, userId)
        )
      )
      .orderBy(sql`${contactRequestsTable.createdAt} DESC`);

    res.json(rows.map(({ cr, investorName, listingName }) => ({ ...cr, investorName, listingName })));
  } catch (err) {
    next(err);
  }
});

// POST /api/contact-requests/:id/accept
router.post("/:id/accept", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [cr] = await db
      .select({ cr: contactRequestsTable, sellerId: listingsTable.userId })
      .from(contactRequestsTable)
      .leftJoin(listingsTable, eq(contactRequestsTable.listingId, listingsTable.id))
      .where(eq(contactRequestsTable.id, id))
      .limit(1);

    if (!cr || cr.sellerId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Create message thread
    const [thread] = await db.insert(messageThreadsTable).values({
      listingId: cr.cr.listingId,
      sellerId: cr.sellerId!,
      investorId: cr.cr.investorId,
    }).returning();

    const [updated] = await db
      .update(contactRequestsTable)
      .set({ status: "accepted", threadId: thread.id })
      .where(eq(contactRequestsTable.id, id))
      .returning();

    res.json({ ...updated, investorName: null, listingName: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/contact-requests/:id/decline
router.post("/:id/decline", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [cr] = await db
      .select({ cr: contactRequestsTable, sellerId: listingsTable.userId })
      .from(contactRequestsTable)
      .leftJoin(listingsTable, eq(contactRequestsTable.listingId, listingsTable.id))
      .where(eq(contactRequestsTable.id, id))
      .limit(1);

    if (!cr || cr.sellerId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [updated] = await db
      .update(contactRequestsTable)
      .set({ status: "declined" })
      .where(eq(contactRequestsTable.id, id))
      .returning();

    res.json({ ...updated, investorName: null, listingName: null });
  } catch (err) {
    next(err);
  }
});

export default router;
