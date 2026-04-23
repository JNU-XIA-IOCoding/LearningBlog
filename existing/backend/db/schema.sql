-- ═══════════════════════════════════════════════
-- Phoenix Blog · Database Schema · PostgreSQL
-- ═══════════════════════════════════════════════

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100),
    bio           TEXT,
    avatar_url    TEXT,
    streak        INT DEFAULT 0,
    last_checkin  DATE,
    role          VARCHAR(20) DEFAULT 'user',  -- 'user' | 'admin'
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Posts / Learning Notes
CREATE TABLE IF NOT EXISTS posts (
    id            SERIAL PRIMARY KEY,
    user_id       INT REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    content       TEXT NOT NULL,
    code_snippet  TEXT,
    category      VARCHAR(100) DEFAULT 'General',
    tags          TEXT[] DEFAULT '{}',
    views         INT DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Check-in records
CREATE TABLE IF NOT EXISTS checkins (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, check_date)
);

-- Weekly tasks
CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    text       VARCHAR(500) NOT NULL,
    priority   VARCHAR(10) DEFAULT 'mid',  -- 'high' | 'mid' | 'low'
    done       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comments (future)
CREATE TABLE IF NOT EXISTS comments (
    id         SERIAL PRIMARY KEY,
    post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user     ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags     ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_checkins_user  ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user     ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(post_id);

-- Seed admin user (password: phoenix2026)
INSERT INTO users (username, email, password_hash, display_name, role, streak)
VALUES ('admin', 'admin@jnu.edu.cn',
  '$2a$12$LJ3m4yPnPfGiGrz7G4rXe.B/6YJkFpK3ufYaY9kL9X8jKq5kI5kGe',
  'Blog Admin', 'admin', 7)
ON CONFLICT (username) DO NOTHING;
