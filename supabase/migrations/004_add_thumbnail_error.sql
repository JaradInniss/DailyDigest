-- Migration: Add thumbnail_error column for debugging thumbnail failures
-- Version 1.1 - Task 17

ALTER TABLE summaries
ADD COLUMN thumbnail_error TEXT;