import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const messageThreadsTable = pgTable("message_threads", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  investorId: integer("investor_id").notNull().references(() => usersTable.id),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => messageThreadsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageThreadSchema = createInsertSchema(messageThreadsTable).omit({ id: true, lastMessage: true, lastMessageAt: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, isRead: true, createdAt: true });
export type InsertMessageThread = z.infer<typeof insertMessageThreadSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageThread = typeof messageThreadsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
