-- Daily News Digest: Initial Schema
-- Run this migration in Supabase SQL Editor

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  label       text NOT NULL,
  is_selected boolean DEFAULT false
);

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date UNIQUE NOT NULL,
  status      text DEFAULT 'pending',  -- 'pending' | 'complete' | 'error'
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid REFERENCES reports(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES categories(id),
  topic_headline  text NOT NULL,
  summary_body    text NOT NULL,
  source_urls     text[] NOT NULL,   -- minimum 2 entries
  thumbnail_url   text,              -- Supabase Storage public URL
  created_at      timestamptz DEFAULT now()
);

-- Stores browser push subscriptions so the server can send notifications
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint   text UNIQUE NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_summaries_report_id ON summaries(report_id);
CREATE INDEX idx_summaries_category_id ON summaries(category_id);
CREATE INDEX idx_reports_report_date ON reports(report_date);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_categories_is_selected ON categories(is_selected);
