import { Router } from "express";
import { db } from "@workspace/db";
import {
  messageThreadsTable,
  messagesTable,
  usersTable,
  listingsTable,
} from "@workspace/db";
import { eq, or, and, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { validateBody, parseId } from "../lib/validate";

const router = Router();

const messageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

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
          and(
            eq(messagesTable.threadId, thread.id),
            eq(messagesTable.isRead, false),
            ne(messagesTable.senderId, userId),
          )
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
    const threadId = parseId(req.params.threadId);
    if (!threadId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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

    // Mark only the *incoming* messages as read for this viewer.
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(messagesTable.threadId, threadId),
          ne(messagesTable.senderId, userId),
        )
      );

    res.json(messages.map(({ message, senderName }) => ({ ...message, senderName })));
  } catch (err) {
    next(err);
  }
});

router.post("/:threadId", requireAuth, validateBody(messageSchema), async (req: AuthRequest, res, next) => {
  try {
    const threadId = parseId(req.params.threadId);
    if (!threadId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const userId = req.dbUserId!;
    const { content } = req.body as z.infer<typeof messageSchema>;

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
