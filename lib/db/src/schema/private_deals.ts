import { pgTable, serial, text, timestamp, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const privateDealsTable = pgTable("private_deals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  revenue: doublePrecision("revenue").notNull(),
  ebitda: doublePrecision("ebitda").notNull(),
  growthRate: doublePrecision("growth_rate").notNull(),
  description: text("description"),
  status: text("status").notNull().default("analyzing"), // analyzing | complete
  valuation: jsonb("valuation"),
  intelligence: jsonb("intelligence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrivateDealSchema = createInsertSchema(privateDealsTable).omit({ id: true, status: true, valuation: true, intelligence: true, createdAt: true, updatedAt: true });
export type InsertPrivateDeal = z.infer<typeof insertPrivateDealSchema>;
export type PrivateDeal = typeof privateDealsTable.$inferSelect;
