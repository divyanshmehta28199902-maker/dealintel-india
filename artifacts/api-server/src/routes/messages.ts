import { Router } from "express";
import { db } from "@workspace/db";
import {
  messageThreadsTable,
  messagesTable,
  usersTable,
  listingsTable,
} from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.dbUserId!;

    const rows = await db
      .select({
        thread: messageThreadsTable,
        listingName: listingsTable.companyName,
        sellerName: usersTable.name,
      })
      .from(messageThreadsTable)
      .leftJoin(listingsTable, eq(messageThreadsTable.listingId, listingsTable.id))
      .leftJoin(usersTable, eq(listingsTable.userId, usersTable.id))
      .where(
        or(
          eq(messageThreadsTable.sellerId, userId),
          eq(messageThreadsTable.investorId, userId)
        )
      )
      .orderBy(sql`${messageThreadsTable.lastMessageAt} DESC NULLS LAST`);

    // Get unread count per thread
    const result = await Promise.all(rows.map(async ({ thread, listingName, sellerName }) => {
      const [{ count }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(messagesTable)
        .where(
          eq(messagesTable.threadId, thread.id)
        );

      const otherUserId = thread.sellerId === userId ? thread.investorId : thread.sellerId;
      const [otherUser] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, otherUserId))
        .limit(1);

      return {
        ...thread,
        listingName,
        otherPartyName: otherUser?.name ?? "User",
        unreadCount: count ?? 0,
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:threadId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = req.dbUserId!;

    const [thread] = await db
      .select()
      .from(messageThreadsTable)
      .where(eq(messageThreadsTable.id, threadId))
      .limit(1);

    if (!thread || (thread.sellerId !== userId && thread.investorId !== userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const messages = await db
      .select({ message: messagesTable, senderName: usersTable.name })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.threadId, threadId))
      .orderBy(sql`${messagesTable.createdAt} ASC`);

    // Mark as read
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(eq(messagesTable.threadId, threadId));

    res.json(messages.map(({ message, senderName }) => ({ ...message, senderName })));
  } catch (err) {
    next(err);
  }
});

router.post("/:threadId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = req.dbUserId!;
    const { content } = req.body as { content: string };

    const [thread] = await db
      .select()
      .from(messageThreadsTable)
      .where(eq(messageThreadsTable.id, threadId))
      .limit(1);

    if (!thread || (thread.sellerId !== userId && thread.investorId !== userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [message] = await db.insert(messagesTable).values({
      threadId,
      senderId: userId,
      content,
    }).returning();

    await db
      .update(messageThreadsTable)
      .set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(messageThreadsTable.id, threadId));

    const [sender] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    res.status(201).json({ ...message, senderName: sender?.name ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
