import { Router } from "express";
import { db } from "@workspace/db";
import { privateDealsTable, industryBenchmarksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";
import { validateBody, parseId } from "../lib/validate";
import { computeValuation, computeIntelligence } from "../lib/valuation";

const router = Router();

// growthRate is collected as a percentage here and converted to a fraction for analysis.
const createDealSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(100),
  revenue: z.number().positive().finite(),
  ebitda: z.number().finite(),
  growthRate: z.number().min(-100).max(1000),
  description: z.string().max(5000).optional(),
});

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

router.post("/", requireAuth, requireRole("investor"), validateBody(createDealSchema), async (req: AuthRequest, res, next) => {
  try {
    const { companyName, industry, revenue, ebitda, growthRate, description } = req.body as z.infer<typeof createDealSchema>;

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

        if (!benchmark) {
          await db.update(privateDealsTable).set({ status: "failed" }).where(eq(privateDealsTable.id, deal.id));
          return;
        }

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
      } catch (err) {
        // Surface failure deterministically instead of leaving the deal stuck in "analyzing".
        req.log.error({ err, dealId: deal.id }, "private deal analysis failed");
        await db
          .update(privateDealsTable)
          .set({ status: "failed" })
          .where(eq(privateDealsTable.id, deal.id))
          .catch(() => {});
      }
    });

    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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
