import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { listingsTable } from "./listings";
import { usersTable } from "./users";

export const declarationsTable = pgTable("declarations", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  accepted: boolean("accepted").notNull(),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeclarationSchema = createInsertSchema(declarationsTable).omit({ id: true, timestamp: true });
export type InsertDeclaration = z.infer<typeof insertDeclarationSchema>;
export type Declaration = typeof declarationsTable.$inferSelect;
