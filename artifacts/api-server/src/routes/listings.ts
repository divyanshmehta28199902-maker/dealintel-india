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
import { eq, and, gte, lte, ilike, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeValuation, computeIntelligence } from "../lib/valuation";

const router = Router();

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

// POST /api/listings — create listing
router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as {
      companyName: string;
      industry: string;
      description?: string;
      revenue: number;
      ebitda: number;
      ebitdaMargin?: number;
      revenueGrowthRate?: number;
      askingValuation: number;
      debtRatio?: number;
      customerConcentration?: number;
      employeeCount?: number;
      foundedYear?: number;
      city?: string;
      state?: string;
      stage: string;
    };

    const [listing] = await db.insert(listingsTable).values({
      userId: req.dbUserId!,
      ...body,
      status: "draft",
    }).returning();

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id
router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
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

    // Increment view count
    await db
      .update(listingsTable)
      .set({ viewCount: sql`${listingsTable.viewCount} + 1` })
      .where(eq(listingsTable.id, id));

    res.json({ ...row.listing, sellerName: row.sellerName });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/listings/:id
router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!existing || existing.userId !== req.dbUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [updated] = await db
      .update(listingsTable)
      .set(req.body as Partial<typeof listingsTable.$inferInsert>)
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

// POST /api/listings/:id/declaration
router.post("/:id/declaration", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const { accepted } = req.body as { accepted: boolean };

    if (!accepted) {
      res.status(400).json({ error: "Declaration must be accepted" });
      return;
    }

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
    const id = Number(req.params.id);
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!listing) {
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
    const id = Number(req.params.id);
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

    if (!listing) {
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

// POST /api/listings/:id/contact
router.post("/:id/contact", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listingId = Number(req.params.id);
    const { message } = req.body as { message: string };

    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);
    if (!listing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [cr] = await db.insert(contactRequestsTable).values({
      investorId: req.dbUserId!,
      listingId,
      message,
    }).returning();

    res.status(201).json(cr);
  } catch (err) {
    next(err);
  }
});

// GET /api/contact-requests
router.get("/contact-requests/all", requireAuth, async (req: AuthRequest, res, next) => {
  try {
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
        eq(listingsTable.userId, req.dbUserId!)
      )
      .orderBy(sql`${contactRequestsTable.createdAt} DESC`);

    res.json(rows.map(({ cr, investorName, listingName }) => ({ ...cr, investorName, listingName })));
  } catch (err) {
    next(err);
  }
});

export default router;
