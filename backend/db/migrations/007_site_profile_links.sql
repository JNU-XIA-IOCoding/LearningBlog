INSERT INTO site_settings (key, value, updated_at)
VALUES
  ('hero_title', 'A Journey in<br><em>Computer Science</em>', NOW()),
  ('hero_subtitle', 'Learning in Bloom · 花开有时', NOW()),
  ('announcement', 'Build in public. Ship every week.', NOW()),
  ('social_github', 'https://github.com/JNU-XIA-IOCoding', NOW()),
  ('social_email', 'mailto:2274743960@qq.com', NOW()),
  ('social_bilibili', '#', NOW()),
  ('social_csdn', '#', NOW()),
  ('profile_bio_1', 'A Computer Science & Technology student at Jinan University, currently in sophomore spring. I believe in learning through building - documenting every step here, from algorithms to AI agents.', NOW()),
  ('profile_bio_2', 'When not coding, you''ll find me with a vintage camera among cherry blossoms, searching for that perfect light. Photography taught me to notice details - a skill that translates surprisingly well to debugging.', NOW())
ON CONFLICT (key) DO NOTHING;
