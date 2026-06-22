import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const PIPELINE_STAGES = ["interested", "contacted", "due_diligence", "negotiation", "closed"] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export interface ActivityEntry {
  ts: string;
  stage: string;
  note?: string;
}

export const pipelinesTable = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => usersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  stage: text("stage").notNull().default("interested"),
  notes: text("notes"),
  activityLog: jsonb("activity_log").notNull().default([]),
  successFeePrompted: text("success_fee_prompted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Pipeline = typeof pipelinesTable.$inferSelect;
