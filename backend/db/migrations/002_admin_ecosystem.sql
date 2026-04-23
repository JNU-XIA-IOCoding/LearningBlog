ALTER TABLE posts
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';

CREATE TABLE IF NOT EXISTS media_assets (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE SET NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_url    TEXT NOT NULL,
    mime_type   VARCHAR(100) NOT NULL,
    size_bytes  BIGINT NOT NULL,
    kind        VARCHAR(20) DEFAULT 'image',
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(100) UNIQUE NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    id          SERIAL PRIMARY KEY,
    path        VARCHAR(500) NOT NULL,
    method      VARCHAR(10) NOT NULL,
    ip_hash     VARCHAR(120),
    ua          TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_created ON visitor_logs(created_at DESC);

INSERT INTO site_settings(key, value) VALUES
('hero_title', 'Phoenix Learning Journey'),
('hero_subtitle', 'JNU CST study log with dynamic wallpaper and full-stack capability.'),
('announcement', 'Build in public. Ship every week.')
ON CONFLICT (key) DO NOTHING;
