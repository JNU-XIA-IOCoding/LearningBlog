/**
 * Phoenix Blog — Backend Server
 * Node.js + Express + PostgreSQL
 * ─────────────────────────────────
 * Features: JWT auth, CRUD posts, check-in streak, user profile
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'phoenix-sakura-secret-2026';

// ─── Database ───
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/phoenix_blog',
});

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('../public'));

// ─── Auth Middleware ───
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional auth — doesn't block, just attaches user if present
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch (e) {}
  }
  next();
}

// ═══════════════════════════
// AUTH ROUTES
// ═══════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check existing
    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, display_name, created_at`,
      [username, email, hash, display_name || username]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1', [username]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name },
      token
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, bio, streak, last_checkin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { display_name, bio, avatar_url } = req.body;
    const result = await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name),
       bio = COALESCE($2, bio), avatar_url = COALESCE($3, avatar_url),
       updated_at = NOW() WHERE id = $4
       RETURNING id, username, email, display_name, bio, avatar_url`,
      [display_name, bio, avatar_url, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════
// POSTS ROUTES
// ═══════════════════════════

// Get all posts (public)
app.get('/api/posts', optionalAuth, async (req, res) => {
  try {
    const { category, tag, search, limit = 20, offset = 0 } = req.query;
    let query = `SELECT p.*, u.username, u.display_name, u.avatar_url
                 FROM posts p JOIN users u ON p.user_id = u.id WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (category) { query += ` AND p.category = $${idx++}`; params.push(category); }
    if (tag) { query += ` AND $${idx++} = ANY(p.tags)`; params.push(tag); }
    if (search) { query += ` AND (p.title ILIKE $${idx} OR p.content ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    query += ` ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM posts');
    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (e) {
    console.error('Get posts error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post (auth required)
app.post('/api/posts', auth, async (req, res) => {
  try {
    const { title, content, code_snippet, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const result = await pool.query(
      `INSERT INTO posts (user_id, title, content, code_snippet, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, title, content, code_snippet || null, category || 'General', tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('Create post error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update post
app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const { title, content, code_snippet, category, tags } = req.body;
    const result = await pool.query(
      `UPDATE posts SET title = COALESCE($1, title), content = COALESCE($2, content),
       code_snippet = COALESCE($3, code_snippet), category = COALESCE($4, category),
       tags = COALESCE($5, tags), updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [title, content, code_snippet, category, tags, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Post not found or unauthorized' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Post not found or unauthorized' });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════
// CHECK-IN / STREAK ROUTES
// ═══════════════════════════

// Check in today
app.post('/api/checkin', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in
    const existing = await pool.query(
      'SELECT id FROM checkins WHERE user_id = $1 AND check_date = $2',
      [req.user.id, today]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Already checked in today' });

    // Insert checkin
    await pool.query(
      'INSERT INTO checkins (user_id, check_date) VALUES ($1, $2)',
      [req.user.id, today]
    );

    // Update streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const user = await pool.query('SELECT streak, last_checkin FROM users WHERE id = $1', [req.user.id]);
    let newStreak = 1;
    if (user.rows[0].last_checkin === yesterday) {
      newStreak = (user.rows[0].streak || 0) + 1;
    }

    await pool.query(
      'UPDATE users SET streak = $1, last_checkin = $2 WHERE id = $3',
      [newStreak, today, req.user.id]
    );

    res.json({ streak: newStreak, date: today });
  } catch (e) {
    console.error('Checkin error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get checkin history
app.get('/api/checkins', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT check_date FROM checkins WHERE user_id = $1
       AND check_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       ORDER BY check_date DESC`,
      [req.user.id]
    );
    res.json(result.rows.map(r => r.check_date));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════
// TASKS ROUTES
// ═══════════════════════════

app.get('/api/tasks', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { text, priority = 'mid' } = req.body;
    const result = await pool.query(
      'INSERT INTO tasks (user_id, text, priority) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, text, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { done } = req.body;
    const result = await pool.query(
      'UPDATE tasks SET done = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [done, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════
// STATS
// ═══════════════════════════
app.get('/api/stats', optionalAuth, async (req, res) => {
  try {
    const [posts, users] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM posts'),
      pool.query('SELECT COUNT(*) as count FROM users'),
    ]);
    res.json({
      total_posts: parseInt(posts.rows[0].count),
      total_users: parseInt(users.rows[0].count),
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`\n  🌸 Phoenix Blog API running on port ${PORT}`);
  console.log(`  📚 Docs: http://localhost:${PORT}/api\n`);
});
