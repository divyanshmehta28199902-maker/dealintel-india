import { Router } from "express";
import { db } from "@workspace/db";
import {
  listingsTable,
  watchlistTable,
  privateDealsTable,
  contactRequestsTable,
  messageThreadsTable,
  industryBenchmarksTable,
} from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/seller", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.dbUserId!;

    const [stats] = await db
      .select({
        totalListings: sql<number>`cast(count(*) as int)`,
        activeListings: sql<number>`cast(count(*) filter (where ${listingsTable.status} = 'active') as int)`,
        draftListings: sql<number>`cast(count(*) filter (where ${listingsTable.status} = 'draft') as int)`,
        totalViews: sql<number>`cast(coalesce(sum(${listingsTable.viewCount}), 0) as int)`,
      })
      .from(listingsTable)
      .where(eq(listingsTable.userId, userId));

    const [crStats] = await db
      .select({
        pendingContactRequests: sql<number>`cast(count(*) filter (where ${contactRequestsTable.status} = 'pending') as int)`,
        acceptedContactRequests: sql<number>`cast(count(*) filter (where ${contactRequestsTable.status} = 'accepted') as int)`,
      })
      .from(contactRequestsTable)
      .leftJoin(listingsTable, eq(contactRequestsTable.listingId, listingsTable.id))
      .where(eq(listingsTable.userId, userId));

    const [threadStats] = await db
      .select({ totalMessages: sql<number>`cast(count(*) as int)` })
      .from(messageThreadsTable)
      .where(eq(messageThreadsTable.sellerId, userId));

    res.json({
      ...stats,
      ...crStats,
      totalMessages: threadStats?.totalMessages ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/investor", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.dbUserId!;

    const [watchlistStat] = await db
      .select({ watchlistCount: sql<number>`cast(count(*) as int)` })
      .from(watchlistTable)
      .where(eq(watchlistTable.userId, userId));

    const [dealStat] = await db
      .select({ privateDealsCount: sql<number>`cast(count(*) as int)` })
      .from(privateDealsTable)
      .where(eq(privateDealsTable.userId, userId));

    const [crStat] = await db
      .select({ contactRequestsSent: sql<number>`cast(count(*) as int)` })
      .from(contactRequestsTable)
      .where(eq(contactRequestsTable.investorId, userId));

    const [threadStat] = await db
      .select({ activeThreads: sql<number>`cast(count(*) as int)` })
      .from(messageThreadsTable)
      .where(eq(messageThreadsTable.investorId, userId));

    const recentListings = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"))
      .orderBy(sql`${listingsTable.createdAt} DESC`)
      .limit(5);

    res.json({
      watchlistCount: watchlistStat?.watchlistCount ?? 0,
      privateDealsCount: dealStat?.privateDealsCount ?? 0,
      contactRequestsSent: crStat?.contactRequestsSent ?? 0,
      activeThreads: threadStat?.activeThreads ?? 0,
      recentListings,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/marketplace-stats", async (_req, res, next) => {
  try {
    const [totals] = await db
      .select({
        totalListings: sql<number>`cast(count(*) as int)`,
        totalDealValue: sql<number>`cast(coalesce(sum(${listingsTable.askingValuation}), 0) as float)`,
      })
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"));

    const byIndustry = await db
      .select({
        industry: listingsTable.industry,
        count: sql<number>`cast(count(*) as int)`,
        totalValue: sql<number>`cast(coalesce(sum(${listingsTable.askingValuation}), 0) as float)`,
      })
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"))
      .groupBy(listingsTable.industry)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const byStage = await db
      .select({
        stage: listingsTable.stage,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"))
      .groupBy(listingsTable.stage);

    res.json({
      totalListings: totals?.totalListings ?? 0,
      totalDealValue: totals?.totalDealValue ?? 0,
      byIndustry,
      byStage,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/benchmarks", async (_req, res, next) => {
  try {
    const benchmarks = await db.select().from(industryBenchmarksTable).orderBy(industryBenchmarksTable.industry);
    res.json(benchmarks);
  } catch (err) {
    next(err);
  }
});

export default router;
