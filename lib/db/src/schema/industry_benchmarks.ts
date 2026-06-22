import { pgTable, serial, text, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const industryBenchmarksTable = pgTable("industry_benchmarks", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull().unique(),
  ebitdaMultiple: doublePrecision("ebitda_multiple").notNull(),
  revenueMultiple: doublePrecision("revenue_multiple").notNull(),
  growthRate: doublePrecision("growth_rate").notNull(),
  description: text("description").notNull(),
});

export const insertIndustryBenchmarkSchema = createInsertSchema(industryBenchmarksTable).omit({ id: true });
export type InsertIndustryBenchmark = z.infer<typeof insertIndustryBenchmarkSchema>;
export type IndustryBenchmark = typeof industryBenchmarksTable.$inferSelect;
