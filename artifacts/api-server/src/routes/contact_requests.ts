import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactRequestsTable,
  listingsTable,
  usersTable,
  messageThreadsTable,
} from "@workspace/db";
import { eq, or, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { parseId, validateBody } from "../lib/validate";

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
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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

    // Idempotent: a previously accepted request already has its thread — don't create a duplicate.
    if (cr.cr.status === "accepted" && cr.cr.threadId) {
      res.json({ ...cr.cr, investorName: null, listingName: null });
      return;
    }
    if (cr.cr.status === "declined") {
      res.status(400).json({ error: "Request was already declined" });
      return;
    }

    // Create the thread first, then atomically attach it ONLY if the request is still
    // pending. This prevents two concurrent accepts from creating duplicate threads.
    const [thread] = await db.insert(messageThreadsTable).values({
      listingId: cr.cr.listingId,
      sellerId: cr.sellerId!,
      investorId: cr.cr.investorId,
    }).returning();

    const [claimed] = await db
      .update(contactRequestsTable)
      .set({ status: "accepted", threadId: thread.id })
      .where(and(eq(contactRequestsTable.id, id), eq(contactRequestsTable.status, "pending")))
      .returning();

    if (!claimed) {
      // Lost the race (status changed concurrently): drop the orphan thread, return current state.
      await db.delete(messageThreadsTable).where(eq(messageThreadsTable.id, thread.id));
      const [current] = await db.select().from(contactRequestsTable).where(eq(contactRequestsTable.id, id)).limit(1);
      res.json({ ...current, investorName: null, listingName: null });
      return;
    }

    res.json({ ...claimed, investorName: null, listingName: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/contact-requests/:id/decline
router.post("/:id/decline", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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

    if (cr.cr.status === "accepted") {
      res.status(400).json({ error: "Request was already accepted" });
      return;
    }
    if (cr.cr.status === "declined") {
      res.json({ ...cr.cr, investorName: null, listingName: null });
      return;
    }

    const [updated] = await db
      .update(contactRequestsTable)
      .set({ status: "declined" })
      .where(and(eq(contactRequestsTable.id, id), eq(contactRequestsTable.status, "pending")))
      .returning();

    if (!updated) {
      // Lost the race (accepted/declined concurrently): return current state without clobbering it.
      const [current] = await db.select().from(contactRequestsTable).where(eq(contactRequestsTable.id, id)).limit(1);
      res.json({ ...current, investorName: null, listingName: null });
      return;
    }

    res.json({ ...updated, investorName: null, listingName: null });
  } catch (err) {
    next(err);
  }
});

export default router;
