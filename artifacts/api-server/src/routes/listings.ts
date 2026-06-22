import { Router } from "express";
import { db } from "@workspace/db";
import {
  listingsTable,
  usersTable,
  declarationsTable,
  watchlistTable,
  industryBenchmarksTable,
  contactRequestsTable,
} from "@workspace/db";
import { eq, and, gte, lte, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, requireRole, optionalAuth, type AuthRequest } from "../lib/auth";
import { validateBody, parseId } from "../lib/validate";
import { computeValuation, computeIntelligence } from "../lib/valuation";

const router = Router();

const createListingSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(100),
  description: z.string().max(5000).optional(),
  revenue: z.number().positive().finite(),
  ebitda: z.number().finite(),
  ebitdaMargin: z.number().min(0).max(1).optional(),
  revenueGrowthRate: z.number().min(-1).max(10).optional(),
  askingValuation: z.number().positive().finite(),
  debtRatio: z.number().min(0).max(1).optional(),
  customerConcentration: z.number().min(0).max(1).optional(),
  employeeCount: z.number().int().min(0).max(10_000_000).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  stage: z.enum(["seed", "early", "growth", "mature"]).optional(),
});

// Owners may edit business fields, but never status/declaration/ownership.
const updateListingSchema = createListingSchema.partial();

const declarationSchema = z.object({ accepted: z.literal(true) });
const contactSchema = z.object({ message: z.string().trim().min(1).max(2000) });

// GET /api/listings — marketplace browse
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { industry, minRevenue, maxRevenue, stage, search } = req.query as Record<string, string>;

    const conditions = [eq(listingsTable.status, "active")];

    if (industry) conditions.push(eq(listingsTable.industry, industry));
    if (stage) conditions.push(eq(listingsTable.stage, stage));
    if (minRevenue) conditions.push(gte(listingsTable.revenue, Number(minRevenue)));
    if (maxRevenue) conditions.push(lte(listingsTable.revenue, Number(maxRevenue)));
    if (search) conditions.push(ilike(listingsTable.companyName, `%${search}%`));

    const listings = await db
      .select({
        listing: listingsTable,
        sellerName: usersTable.name,
      })
      .from(listingsTable)
      .leftJoin(usersTable, eq(listingsTable.userId, usersTable.id))
      .where(and(...conditions))
      .orderBy(sql`${listingsTable.createdAt} DESC`);

    res.json(listings.map(({ listing, sellerName }) => ({ ...listing, sellerName })));
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/my — seller's own listings
router.get("/my", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listings = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.userId, req.dbUserId!))
      .orderBy(sql`${listingsTable.createdAt} DESC`);

    res.json(listings);
  } catch (err) {
    next(err);
  }
});

// POST /api/listings — create listing (sellers only)
router.post("/", requireAuth, requireRole("seller"), validateBody(createListingSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createListingSchema>;

    const [listing] = await db.insert(listingsTable).values({
      ...body,
      userId: req.dbUserId!,
      status: "draft",
    }).returning();

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id — public for active listings; drafts visible to owner only
router.get("/:id", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [row] = await db
      .select({ listing: listingsTable, sellerName: usersTable.name })
      .from(listingsTable)
      .leftJoin(usersTable, eq(listingsTable.userId, usersTable.id))
      .where(eq(listingsTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const isOwner = row.listing.userId === req.dbUserId;
    // Non-active listings (draft/pending/closed) expose seller financials — owner only.
    if (row.listing.status !== "active" && !isOwner) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Only count genuine prospect views (active listings, not the owner's own visits).
    if (row.listing.status === "active" && !isOwner) {
      await db
        .update(listingsTable)
        .set({ viewCount: sql`${listingsTable.viewCount} + 1` })
        .where(eq(listingsTable.id, id));
    }

    res.json({ ...row.listing, sellerName: row.sellerName });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/listings/:id — owner edits business fields only (status changes go through declaration)
router.patch("/:id", requireAuth, validateBody(updateListingSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!existing || existing.userId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updates = req.body as z.infer<typeof updateListingSchema>;
    const [updated] = await db
      .update(listingsTable)
      .set(updates)
      .where(eq(listingsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/listings/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!existing || existing.userId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(listingsTable).where(eq(listingsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/listings/:id/declaration — owner accepts seller declaration, activating the listing
router.post("/:id/declaration", requireAuth, validateBody(declarationSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { accepted } = req.body as z.infer<typeof declarationSchema>;

    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);
    if (!listing || listing.userId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const ipAddress = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "";

    const [declaration] = await db.insert(declarationsTable).values({
      listingId: id,
      userId: req.dbUserId!,
      accepted,
      ipAddress,
    }).returning();

    // Mark listing as active
    await db
      .update(listingsTable)
      .set({ declarationAccepted: true, status: "active" })
      .where(eq(listingsTable.id, id));

    res.json(declaration);
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id/valuation
router.get("/:id/valuation", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!listing || (listing.status !== "active" && listing.userId !== req.dbUserId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Get industry benchmark
    let [benchmark] = await db
      .select()
      .from(industryBenchmarksTable)
      .where(eq(industryBenchmarksTable.industry, listing.industry))
      .limit(1);

    if (!benchmark) {
      [benchmark] = await db.select().from(industryBenchmarksTable).limit(1);
    }

    if (!benchmark) {
      res.status(503).json({ error: "No benchmark data available" });
      return;
    }

    const result = computeValuation(id, {
      revenue: listing.revenue,
      ebitda: listing.ebitda,
      ebitdaMargin: listing.ebitdaMargin ?? undefined,
      revenueGrowthRate: listing.revenueGrowthRate ?? undefined,
      askingValuation: listing.askingValuation,
      benchmark,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id/intelligence
router.get("/:id/intelligence", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!listing || (listing.status !== "active" && listing.userId !== req.dbUserId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let [benchmark] = await db
      .select()
      .from(industryBenchmarksTable)
      .where(eq(industryBenchmarksTable.industry, listing.industry))
      .limit(1);

    if (!benchmark) {
      [benchmark] = await db.select().from(industryBenchmarksTable).limit(1);
    }

    if (!benchmark) {
      res.status(503).json({ error: "No benchmark data available" });
      return;
    }

    const result = computeIntelligence({
      listingId: id,
      revenue: listing.revenue,
      ebitda: listing.ebitda,
      revenueGrowthRate: listing.revenueGrowthRate ?? undefined,
      debtRatio: listing.debtRatio ?? undefined,
      customerConcentration: listing.customerConcentration ?? undefined,
      industry: listing.industry,
      benchmark,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/listings/:id/contact — investors request contact with an active listing's seller
router.post("/:id/contact", requireAuth, requireRole("investor"), validateBody(contactSchema), async (req: AuthRequest, res, next) => {
  try {
    const listingId = parseId(req.params.id);
    if (!listingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { message } = req.body as z.infer<typeof contactSchema>;

    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
    if (!listing || listing.status !== "active") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (listing.userId === req.dbUserId) {
      res.status(400).json({ error: "You cannot contact your own listing" });
      return;
    }

    // Don't create duplicate requests: an existing pending OR accepted request for the same
    // listing already covers this investor (a declined one may be re-requested).
    const [dup] = await db
      .select()
      .from(contactRequestsTable)
      .where(and(
        eq(contactRequestsTable.investorId, req.dbUserId!),
        eq(contactRequestsTable.listingId, listingId),
        inArray(contactRequestsTable.status, ["pending", "accepted"]),
      ))
      .limit(1);
    if (dup) {
      res.status(200).json(dup);
      return;
    }

    try {
      const [cr] = await db.insert(contactRequestsTable).values({
        investorId: req.dbUserId!,
        listingId,
        message,
      }).returning();
      res.status(201).json(cr);
    } catch (err) {
      // A concurrent request beat our dedup check; the partial unique index rejected it (23505).
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23505") {
        const [existing] = await db
          .select()
          .from(contactRequestsTable)
          .where(and(
            eq(contactRequestsTable.investorId, req.dbUserId!),
            eq(contactRequestsTable.listingId, listingId),
            inArray(contactRequestsTable.status, ["pending", "accepted"]),
          ))
          .limit(1);
        res.status(200).json(existing);
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
