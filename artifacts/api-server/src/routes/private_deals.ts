import { Router } from "express";
import { db } from "@workspace/db";
import { privateDealsTable, industryBenchmarksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeValuation, computeIntelligence } from "../lib/valuation";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const deals = await db
      .select()
      .from(privateDealsTable)
      .where(eq(privateDealsTable.userId, req.dbUserId!))
      .orderBy(sql`${privateDealsTable.createdAt} DESC`);

    res.json(deals);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { companyName, industry, revenue, ebitda, growthRate, description } = req.body as {
      companyName: string;
      industry: string;
      revenue: number;
      ebitda: number;
      growthRate: number;
      description?: string;
    };

    const [deal] = await db.insert(privateDealsTable).values({
      userId: req.dbUserId!,
      companyName,
      industry,
      revenue,
      ebitda,
      growthRate,
      description,
      status: "analyzing",
    }).returning();

    // Run valuation + intelligence asynchronously
    setImmediate(async () => {
      try {
        let [benchmark] = await db
          .select()
          .from(industryBenchmarksTable)
          .where(eq(industryBenchmarksTable.industry, industry))
          .limit(1);

        if (!benchmark) {
          [benchmark] = await db.select().from(industryBenchmarksTable).limit(1);
        }

        if (!benchmark) return;

        const valuation = computeValuation(deal.id, {
          revenue,
          ebitda,
          revenueGrowthRate: growthRate / 100,
          benchmark,
        });

        const intelligence = computeIntelligence({
          listingId: deal.id,
          revenue,
          ebitda,
          revenueGrowthRate: growthRate / 100,
          industry,
          benchmark,
        });

        await db
          .update(privateDealsTable)
          .set({ status: "complete", valuation, intelligence })
          .where(eq(privateDealsTable.id, deal.id));
      } catch (_err) {
        // silent - analysis failure doesn't crash the request
      }
    });

    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [deal] = await db
      .select()
      .from(privateDealsTable)
      .where(eq(privateDealsTable.id, id))
      .limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(deal);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const [deal] = await db
      .select()
      .from(privateDealsTable)
      .where(eq(privateDealsTable.id, id))
      .limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(privateDealsTable).where(eq(privateDealsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
