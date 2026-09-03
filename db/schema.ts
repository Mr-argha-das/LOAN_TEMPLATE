import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loanApplications = sqliteTable(
  "loan_applications",
  {
    id: text("id").primaryKey(),
    answersJson: text("answers_json").notNull(),
    status: text("status", { enum: ["pending", "approved"] })
      .notNull()
      .default("pending"),
    panDocumentKey: text("pan_document_key").notNull(),
    panDocumentName: text("pan_document_name").notNull(),
    panDocumentType: text("pan_document_type").notNull(),
    aadhaarDocumentKey: text("aadhaar_document_key").notNull(),
    aadhaarDocumentName: text("aadhaar_document_name").notNull(),
    aadhaarDocumentType: text("aadhaar_document_type").notNull(),
    aadhaarFrontDocumentKey: text("aadhaar_front_document_key"),
    aadhaarFrontDocumentName: text("aadhaar_front_document_name"),
    aadhaarFrontDocumentType: text("aadhaar_front_document_type"),
    aadhaarBackDocumentKey: text("aadhaar_back_document_key"),
    aadhaarBackDocumentName: text("aadhaar_back_document_name"),
    aadhaarBackDocumentType: text("aadhaar_back_document_type"),
    approvalTitle: text("approval_title").notNull().default(""),
    approvalImageKey: text("approval_image_key"),
    approvalImageName: text("approval_image_name"),
    approvalImageType: text("approval_image_type"),
    createdAt: text("created_at").notNull(),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [index("idx_loan_applications_status_created").on(table.status, table.createdAt)],
);
