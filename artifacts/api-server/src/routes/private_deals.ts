import { Router } from "express";
import { db } from "@workspace/db";
import {
  privateDealsTable, industryBenchmarksTable, documentVaultTable,
} from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, requireRole, requirePlan, type AuthRequest } from "../lib/auth";
import { validateBody, parseId } from "../lib/validate";
import { computeValuation, computeIntelligence, computeDealQualityScore } from "../lib/valuation";

const router = Router();

const createDealSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(100),
  revenue: z.number().positive().finite(),
  ebitda: z.number().finite(),
  growthRate: z.number().min(-100).max(1000),
  // Extended fields
  dealMode: z.enum(["quick", "verified"]).optional().default("quick"),
  revenueY1: z.number().positive().finite().optional(),
  revenueY2: z.number().positive().finite().optional(),
  revenueY3: z.number().positive().finite().optional(),
  totalDebt: z.number().min(0).finite().optional(),
  customerConcentration: z.number().min(0).max(1).finite().optional(),
  businessOverview: z.string().max(5000).optional(),
  whySelling: z.string().max(3000).optional(),
  growthDrivers: z.string().max(3000).optional(),
  keyRisks: z.string().max(3000).optional(),
  description: z.string().max(5000).optional(),
  legalConfirmed: z.boolean().optional(),
});

async function refreshQualityScore(dealId: number, deal: typeof privateDealsTable.$inferSelect) {
  const [{ docCount }] = await db
    .select({ docCount: count() })
    .from(documentVaultTable)
    .where(eq(documentVaultTable.privateDealId, dealId));

  const { score, trustLevel } = computeDealQualityScore({
    businessOverview: deal.businessOverview,
    whySelling: deal.whySelling,
    growthDrivers: deal.growthDrivers,
    keyRisks: deal.keyRisks,
    revenueY1: deal.revenueY1,
    revenueY2: deal.revenueY2,
    revenueY3: deal.revenueY3,
    totalDebt: deal.totalDebt,
    customerConcentration: deal.customerConcentration,
    legalConfirmedAt: deal.legalConfirmedAt,
    documentCount: docCount,
  });

  await db.update(privateDealsTable)
    .set({ qualityScore: score, trustLevel })
    .where(eq(privateDealsTable.id, dealId));

  return { score, trustLevel };
}

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
    const {
      companyName, industry, revenue, ebitda, growthRate,
      dealMode, revenueY1, revenueY2, revenueY3, totalDebt, customerConcentration,
      businessOverview, whySelling, growthDrivers, keyRisks, description,
      legalConfirmed,
    } = req.body as z.infer<typeof createDealSchema>;

    // Free plan: max 1 private deal
    const userTier = req.dbUser!.tier ?? "free";
    if (userTier === "free") {
      const [{ dealCount }] = await db
        .select({ dealCount: count() })
        .from(privateDealsTable)
        .where(eq(privateDealsTable.userId, req.dbUserId!));
      if (dealCount >= 1) {
        res.status(403).json({
          error: "Free plan allows 1 private deal analysis. Upgrade to Investor Pro for unlimited deals.",
          code: "plan_required",
          requiredPlan: "investor_pro",
        });
        return;
      }
    }

    // Validate: EBITDA cannot exceed revenue
    if (ebitda > revenue) {
      res.status(400).json({ error: "EBITDA cannot exceed revenue" });
      return;
    }

    const legalConfirmedAt = legalConfirmed ? new Date() : null;

    const [deal] = await db.insert(privateDealsTable).values({
      userId: req.dbUserId!,
      companyName, industry, revenue, ebitda, growthRate,
      dealMode: dealMode ?? "quick",
      revenueY1, revenueY2, revenueY3, totalDebt, customerConcentration,
      businessOverview, whySelling, growthDrivers, keyRisks, description,
      legalConfirmedAt,
      status: "analyzing",
    }).returning();

    // Compute initial quality score synchronously (no docs yet)
    const { score, trustLevel } = computeDealQualityScore({
      businessOverview, whySelling, growthDrivers, keyRisks,
      revenueY1, revenueY2, revenueY3, totalDebt, customerConcentration,
      legalConfirmedAt, documentCount: 0,
    });

    await db.update(privateDealsTable)
      .set({ qualityScore: score, trustLevel })
      .where(eq(privateDealsTable.id, deal.id));

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
          revenue, ebitda,
          revenueGrowthRate: growthRate / 100,
          benchmark,
        });

        const intelligence = computeIntelligence({
          listingId: deal.id,
          revenue, ebitda,
          revenueGrowthRate: growthRate / 100,
          debtRatio: totalDebt != null && revenue > 0 ? totalDebt / revenue : undefined,
          customerConcentration,
          industry, benchmark,
        });

        await db.update(privateDealsTable)
          .set({ status: "complete", valuation, intelligence })
          .where(eq(privateDealsTable.id, deal.id));
      } catch (err) {
        req.log.error({ err, dealId: deal.id }, "private deal analysis failed");
        await db.update(privateDealsTable)
          .set({ status: "failed" })
          .where(eq(privateDealsTable.id, deal.id))
          .catch(() => {});
      }
    });

    res.status(201).json({ ...deal, qualityScore: score, trustLevel });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    const [deal] = await db.select().from(privateDealsTable)
      .where(eq(privateDealsTable.id, id)).limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Attach documents
    const docs = await db.select().from(documentVaultTable)
      .where(eq(documentVaultTable.privateDealId, id));

    res.json({ ...deal, documents: docs });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    const [deal] = await db.select().from(privateDealsTable)
      .where(eq(privateDealsTable.id, id)).limit(1);

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

// Document vault endpoints
const addDocumentSchema = z.object({
  objectPath: z.string().min(1),
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive().optional(),
  documentType: z.enum(["pl_statement", "balance_sheet", "gst_filing", "other"]).optional().default("other"),
});

router.get("/:id/documents", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    const [deal] = await db.select({ userId: privateDealsTable.userId })
      .from(privateDealsTable).where(eq(privateDealsTable.id, id)).limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const docs = await db.select().from(documentVaultTable)
      .where(eq(documentVaultTable.privateDealId, id));
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", requireAuth, validateBody(addDocumentSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    const [deal] = await db.select().from(privateDealsTable)
      .where(eq(privateDealsTable.id, id)).limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { objectPath, fileName, fileSize, documentType } = req.body as z.infer<typeof addDocumentSchema>;

    const [doc] = await db.insert(documentVaultTable).values({
      privateDealId: id,
      uploadedBy: req.dbUserId!,
      objectPath, fileName, fileSize,
      documentType: documentType ?? "other",
    }).returning();

    // Refresh quality score now that a document exists
    await refreshQualityScore(id, deal);

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/documents/:docId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    const docId = parseId(req.params.docId);
    if (!id || !docId) { res.status(404).json({ error: "Not found" }); return; }

    const [deal] = await db.select().from(privateDealsTable)
      .where(eq(privateDealsTable.id, id)).limit(1);

    if (!deal || deal.userId !== req.dbUserId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(documentVaultTable)
      .where(eq(documentVaultTable.id, docId));

    await refreshQualityScore(id, deal);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
