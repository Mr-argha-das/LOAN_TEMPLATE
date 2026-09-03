CREATE TABLE `loan_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`answers_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`pan_document_key` text NOT NULL,
	`pan_document_name` text NOT NULL,
	`pan_document_type` text NOT NULL,
	`aadhaar_document_key` text NOT NULL,
	`aadhaar_document_name` text NOT NULL,
	`aadhaar_document_type` text NOT NULL,
	`approval_title` text DEFAULT '' NOT NULL,
	`approval_image_key` text,
	`approval_image_name` text,
	`approval_image_type` text,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_loan_applications_status_created` ON `loan_applications` (`status`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
