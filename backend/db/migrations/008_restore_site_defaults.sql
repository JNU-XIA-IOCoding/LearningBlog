INSERT INTO site_settings (key, value, updated_at)
VALUES
  ('hero_title', 'A Journey in<br><em>Computer Science</em>', NOW()),
  ('hero_subtitle', 'Learning in Bloom · 花开有时', NOW()),
  ('announcement', 'Posts, tasks, check-ins, and links are now connected to the backend ecosystem.', NOW())
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
