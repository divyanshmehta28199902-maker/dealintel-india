import { Router } from "express";
import { db } from "@workspace/db";
import { pipelinesTable, listingsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, requireRole, requirePlan, type AuthRequest } from "../lib/auth";
import { validateBody, parseId } from "../lib/validate";
import type { ActivityEntry } from "@workspace/db";

const router = Router();

const VALID_STAGES = ["interested", "contacted", "due_diligence", "negotiation", "closed"] as const;

const addToPipelineSchema = z.object({
  listingId: z.number().int().positive(),
  notes: z.string().max(3000).optional(),
});

const updateStageSchema = z.object({
  stage: z.enum(VALID_STAGES),
  notes: z.string().max(3000).optional(),
  successFeePrompted: z.enum(["yes", "no"]).optional(),
});

// GET /api/pipeline — investor's pipeline with listing details
router.get("/", requireAuth, requireRole("investor"), requirePlan("investor_pro"), async (req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select({
        pipeline: pipelinesTable,
        listingName: listingsTable.companyName,
        listingIndustry: listingsTable.industry,
        listingRevenue: listingsTable.revenue,
        listingAskingValuation: listingsTable.askingValuation,
        listingStatus: listingsTable.status,
        sellerName: usersTable.name,
      })
      .from(pipelinesTable)
      .leftJoin(listingsTable, eq(pipelinesTable.listingId, listingsTable.id))
      .leftJoin(usersTable, eq(listingsTable.userId, usersTable.id))
      .where(eq(pipelinesTable.investorId, req.dbUserId!))
      .orderBy(sql`${pipelinesTable.updatedAt} DESC`);

    res.json(rows.map(({ pipeline, listingName, listingIndustry, listingRevenue, listingAskingValuation, listingStatus, sellerName }) => ({
      ...pipeline,
      listing: { name: listingName, industry: listingIndustry, revenue: listingRevenue, askingValuation: listingAskingValuation, status: listingStatus },
      sellerName,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/pipeline — add a listing to pipeline
router.post("/", requireAuth, requireRole("investor"), requirePlan("investor_pro"), validateBody(addToPipelineSchema), async (req: AuthRequest, res, next) => {
  try {
    const { listingId, notes } = req.body as z.infer<typeof addToPipelineSchema>;

    // Check listing exists and is active
    const [listing] = await db.select({ id: listingsTable.id, status: listingsTable.status })
      .from(listingsTable).where(eq(listingsTable.id, listingId)).limit(1);

    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

    // Idempotent: return existing pipeline entry if one exists
    const [existing] = await db.select().from(pipelinesTable)
      .where(and(eq(pipelinesTable.investorId, req.dbUserId!), eq(pipelinesTable.listingId, listingId)))
      .limit(1);

    if (existing) { res.status(200).json(existing); return; }

    const initialActivity: ActivityEntry[] = [{
      ts: new Date().toISOString(),
      stage: "interested",
      note: notes ?? "Added to pipeline",
    }];

    const [pipeline] = await db.insert(pipelinesTable).values({
      investorId: req.dbUserId!,
      listingId,
      stage: "interested",
      notes: notes ?? null,
      activityLog: initialActivity,
    }).returning();

    res.status(201).json(pipeline);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pipeline/:id/stage — advance stage
router.patch("/:id/stage", requireAuth, requireRole("investor"), requirePlan("investor_pro"), validateBody(updateStageSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    const [pipeline] = await db.select().from(pipelinesTable)
      .where(and(eq(pipelinesTable.id, id), eq(pipelinesTable.investorId, req.dbUserId!)))
      .limit(1);

    if (!pipeline) { res.status(404).json({ error: "Not found" }); return; }

    const { stage, notes, successFeePrompted } = req.body as z.infer<typeof updateStageSchema>;

    const existingLog = (pipeline.activityLog as ActivityEntry[]) ?? [];
    const newEntry: ActivityEntry = {
      ts: new Date().toISOString(),
      stage,
      note: notes ?? undefined,
    };

    const updates: Partial<typeof pipelinesTable.$inferSelect> = {
      stage,
      activityLog: [...existingLog, newEntry],
    };
    if (notes !== undefined) updates.notes = notes;
    if (successFeePrompted !== undefined) updates.successFeePrompted = successFeePrompted;

    const [updated] = await db.update(pipelinesTable)
      .set(updates)
      .where(eq(pipelinesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pipeline/:id
router.delete("/:id", requireAuth, requireRole("investor"), requirePlan("investor_pro"), async (req: AuthRequest, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(404).json({ error: "Not found" }); return; }

    await db.delete(pipelinesTable)
      .where(and(eq(pipelinesTable.id, id), eq(pipelinesTable.investorId, req.dbUserId!)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
