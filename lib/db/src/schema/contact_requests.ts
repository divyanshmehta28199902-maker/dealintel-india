import { pgTable, serial, text, timestamp, integer, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const contactRequestsTable = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => usersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  message: text("message"),
  status: text("status").notNull().default("pending"), // pending | accepted | declined
  threadId: integer("thread_id"),
  ndaAgreed: boolean("nda_agreed").notNull().default(false),
  ndaAgreedAt: timestamp("nda_agreed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("contact_requests_active_uniq")
    .on(table.investorId, table.listingId)
    .where(sql`${table.status} in ('pending', 'accepted')`),
]);

export const insertContactRequestSchema = createInsertSchema(contactRequestsTable).omit({ id: true, status: true, threadId: true, ndaAgreedAt: true, createdAt: true, updatedAt: true });
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
export type ContactRequest = typeof contactRequestsTable.$inferSelect;
