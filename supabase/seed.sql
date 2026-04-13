-- Daily News Digest: Seed Categories
-- Run after 001_initial_schema.sql in Supabase SQL Editor

INSERT INTO categories (slug, label, is_selected) VALUES
  ('ai-ml', 'AI / Machine Learning', false),
  ('tech', 'Technology', false),
  ('science', 'Science', false),
  ('space', 'Space & Astronomy', false),
  ('cybersecurity', 'Cybersecurity', false),
  ('business', 'Business & Economy', false),
  ('finance', 'Finance & Markets', false),
  ('politics', 'Politics & World Affairs', false),
  ('environment', 'Environment & Climate', false),
  ('health', 'Health & Medicine', false),
  ('sports', 'Sports', false),
  ('gaming', 'Gaming', false),
  ('entertainment', 'Entertainment & Film', false),
  ('music', 'Music', false),
  ('food', 'Food & Drink', false),
  ('travel', 'Travel', false),
  ('automotive', 'Automotive', false),
  ('fashion', 'Fashion & Design', false),
  ('social-media', 'Social Media & Internet Culture', false),
  ('startups', 'Startups & Venture Capital', false)
ON CONFLICT (slug) DO NOTHING;
