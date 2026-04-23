ALTER TABLE posts
ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
