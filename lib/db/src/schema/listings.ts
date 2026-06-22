import { pgTable, serial, text, timestamp, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  description: text("description"),
  revenue: doublePrecision("revenue").notNull(),
  ebitda: doublePrecision("ebitda").notNull(),
  ebitdaMargin: doublePrecision("ebitda_margin"),
  revenueGrowthRate: doublePrecision("revenue_growth_rate"),
  askingValuation: doublePrecision("asking_valuation").notNull(),
  debtRatio: doublePrecision("debt_ratio"),
  customerConcentration: doublePrecision("customer_concentration"),
  employeeCount: integer("employee_count"),
  foundedYear: integer("founded_year"),
  city: text("city"),
  state: text("state"),
  stage: text("stage").notNull().default("growth"), // seed | early | growth | mature
  status: text("status").notNull().default("draft"), // draft | pending_approval | active | under_negotiation | closed
  declarationAccepted: boolean("declaration_accepted").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, viewCount: true, declarationAccepted: true, status: true, createdAt: true, updatedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
