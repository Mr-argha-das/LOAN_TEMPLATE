ALTER TABLE `loan_applications` ADD `processing_fee_amount` integer;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `payment_upi_id` text;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `payment_qr_key` text;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `payment_qr_name` text;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `payment_qr_type` text;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `fee_paid_marked_at` text;--> statement-breakpoint
ALTER TABLE `loan_applications` ADD `loan_transferred_at` text;
