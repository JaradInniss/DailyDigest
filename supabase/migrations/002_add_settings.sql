-- Migration: Add settings table for user preferences (timezone)
-- Version 1.1 - Task 14

CREATE TABLE IF NOT EXISTS settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timezone    text NOT NULL DEFAULT 'Atlantic/Halifax',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Insert default settings row (single-user app, so just one row)
INSERT INTO settings (timezone) VALUES ('Atlantic/Halifax')
ON CONFLICT DO NOTHING;