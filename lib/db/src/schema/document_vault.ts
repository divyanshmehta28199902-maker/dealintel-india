import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { privateDealsTable } from "./private_deals";

export const DOCUMENT_TYPES = ["pl_statement", "balance_sheet", "gst_filing", "other"] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const documentVaultTable = pgTable("document_vault", {
  id: serial("id").primaryKey(),
  privateDealId: integer("private_deal_id").references(() => privateDealsTable.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").notNull().references(() => usersTable.id),
  documentType: text("document_type").notNull().default("other"),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentVaultEntry = typeof documentVaultTable.$inferSelect;
