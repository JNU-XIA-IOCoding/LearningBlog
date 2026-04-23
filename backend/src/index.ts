import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { Pool } from "pg";
import { z } from "zod";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "phoenix-blog-secret";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT || 12);
const uploadDir = path.resolve(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/phoenix_blog",
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000)
});

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "5mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 400 }));
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      const mediaPattern = /\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|mov|m4v|webm)$/i;
      if (mediaPattern.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable, no-transform");
        res.setHeader("Accept-Ranges", "bytes");
      }
    }
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: AUTH_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

type SafeUser = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: string;
  streak: number;
  last_checkin: string | null;
};

type AuthRequest = express.Request & {
  user?: { id: number; username: string; role: string };
  file?: Express.Multer.File;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (
      _req: express.Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void
    ) => cb(null, uploadDir),
    filename: (
      _req: express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${stamp}${ext}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    if (!allowed) {
      cb(new Error("Only image/video are allowed"));
      return;
    }
    cb(null, true);
  }
});

function signToken(user: { id: number; username: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "15d" });
}

function auth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function optionalAuth(req: AuthRequest, _res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    } catch {
      req.user = undefined;
    }
  }
  next();
}

function adminOnly(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

function isLocalAdminRequest(req: express.Request) {
  const host = String(req.headers.host || "").toLowerCase();
  const origin = String(req.headers.origin || "").toLowerCase();
  const referer = String(req.headers.referer || "").toLowerCase();
  const ip = String(req.ip || "");
  return (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    origin.startsWith("file://") ||
    origin.startsWith("http://127.0.0.1") ||
    origin.startsWith("http://localhost") ||
    referer.startsWith("file://") ||
    referer.startsWith("http://127.0.0.1") ||
    referer.startsWith("http://localhost") ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.includes("127.0.0.1")
  );
}

function mapUser(row: any): SafeUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    streak: row.streak,
    last_checkin: row.last_checkin
  };
}

function hashIp(ip: string | undefined) {
  if (!ip) return "";
  return createHash("sha256").update(ip).digest("hex");
}

app.use((req, _res, next) => {
  if (req.path.startsWith("/api") && !req.path.startsWith("/api/health")) {
    pool
      .query("INSERT INTO visitor_logs(path, method, ip_hash, ua) VALUES ($1,$2,$3,$4)", [
        req.path,
        req.method,
        hashIp(req.ip),
        req.headers["user-agent"] || ""
      ])
      .catch(() => undefined);
  }
  next();
});

app.get("/api/health", async (_req, res) => {
  const db = await pool.query("SELECT NOW() as now");
  res.json({ ok: true, now: db.rows[0].now, app_url: APP_URL });
});

app.get("/api/health/deep", async (_req, res) => {
  const [dbNow, visitors, media] = await Promise.all([
    pool.query("SELECT NOW() as now"),
    pool.query("SELECT COUNT(*)::int AS count FROM visitor_logs"),
    pool.query("SELECT COUNT(*)::int AS count FROM media_assets")
  ]);
  res.json({
    ok: true,
    db_now: dbNow.rows[0].now,
    visitor_logs: visitors.rows[0].count,
    media_assets: media.rows[0].count
  });
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(32),
    email: z.string().email(),
    password: z.string().min(6),
    display_name: z.string().min(1).max(64).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { username, email, password, display_name } = parsed.data;
  const exists = await pool.query("SELECT id FROM users WHERE username=$1 OR email=$2", [username, email]);
  if (exists.rowCount) {
    res.status(409).json({ error: "Username or email already exists" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username,email,password_hash,display_name)
     VALUES ($1,$2,$3,$4)
     RETURNING id,username,email,display_name,role,streak,last_checkin`,
    [username, email, password_hash, display_name || username]
  );

  const user = mapUser(result.rows[0]);
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  res.status(201).json({ user, token });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const result = await pool.query("SELECT * FROM users WHERE username=$1 OR email=$1", [parsed.data.username]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const safe = mapUser(user);
  const token = signToken({ id: safe.id, username: safe.username, role: safe.role });
  res.json({ user: safe, token });
});

app.post("/api/auth/local-admin", async (req, res) => {
  if (!isLocalAdminRequest(req)) {
    res.status(403).json({ error: "Local admin mode is only available on this computer" });
    return;
  }

  const result = await pool.query("SELECT * FROM users WHERE username='admin' ORDER BY id ASC LIMIT 1");
  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ error: "Admin user not found" });
    return;
  }

  const safe = mapUser(user);
  const token = signToken({ id: safe.id, username: safe.username, role: safe.role });
  res.json({ user: safe, token, mode: "local-admin" });
});

app.get("/api/auth/me", auth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    "SELECT id,username,email,display_name,role,streak,last_checkin FROM users WHERE id=$1",
    [req.user!.id]
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(result.rows[0]));
});

app.get("/api/site-settings", async (_req, res) => {
  const result = await pool.query("SELECT key, value, updated_at FROM site_settings ORDER BY key ASC");
  res.setHeader("Cache-Control", "public, max-age=180");
  res.json(result.rows);
});

app.get("/api/posts", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 60);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  const clauses: string[] = ["p.status='published'"];
  const params: unknown[] = [];
  let i = 1;

  if (category) {
    clauses.push(`p.category = $${i++}`);
    params.push(category);
  }
  if (search) {
    clauses.push(`(p.title ILIKE $${i} OR p.content ILIKE $${i})`);
    params.push(`%${search}%`);
    i += 1;
  }
  const countParams = [...params];

  const query = `
    SELECT p.*, u.display_name, u.username
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY p.created_at DESC
    LIMIT $${i++} OFFSET $${i}
  `;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  const total = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM posts p
     WHERE ${clauses.join(" AND ")}`,
    countParams
  );
  res.json({ posts: result.rows, total: total.rows[0].count, limit, offset });
});

app.post("/api/posts", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    category: z.string().max(80).optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().max(300).optional(),
    cover_url: z.string().url().optional(),
    status: z.enum(["published", "draft"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { title, content, category, tags, summary, cover_url, status } = parsed.data;

  const result = await pool.query(
    `INSERT INTO posts (user_id,title,content,category,tags,summary,cover_url,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [req.user!.id, title, content, category || "Learning", tags || [], summary || "", cover_url || null, status || "published"]
  );

  res.status(201).json(result.rows[0]);
});

app.post("/api/local/markdown-notes", async (req, res) => {
  if (!isLocalAdminRequest(req)) {
    res.status(403).json({ error: "Markdown note writes are local-owner only" });
    return;
  }

  const schema = z.object({
    title: z.string().min(1).max(200),
    markdown: z.string().min(1),
    category: z.string().max(80).optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().max(300).optional(),
    status: z.enum(["published", "draft"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const admin = await pool.query("SELECT id FROM users WHERE username='admin' ORDER BY id ASC LIMIT 1");
  if (!admin.rowCount) {
    res.status(404).json({ error: "Admin user not found" });
    return;
  }

  const { title, markdown, category, tags, summary, status } = parsed.data;
  const result = await pool.query(
    `INSERT INTO posts (user_id,title,content,category,tags,summary,cover_url,status)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,$7)
     RETURNING *`,
    [admin.rows[0].id, title, markdown, category || "Learning", tags || [], summary || "", status || "published"]
  );

  res.status(201).json({ post: result.rows[0], format: "markdown" });
});

app.put("/api/posts/:id", auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    category: z.string().max(80).optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().max(300).optional(),
    cover_url: z.string().url().optional().nullable(),
    status: z.enum(["published", "draft"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  if (!Object.keys(parsed.data).length) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const found = await pool.query("SELECT * FROM posts WHERE id=$1 AND user_id=$2", [id, req.user!.id]);
  if (!found.rowCount) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const row = found.rows[0];
  const payload = parsed.data;

  const updated = await pool.query(
    `UPDATE posts
     SET title=$1,
         content=$2,
         category=$3,
         tags=$4,
         summary=$5,
         cover_url=$6,
         status=$7,
         updated_at=NOW()
     WHERE id=$8 AND user_id=$9
     RETURNING *`,
    [
      payload.title ?? row.title,
      payload.content ?? row.content,
      payload.category ?? row.category,
      payload.tags ?? row.tags,
      payload.summary ?? row.summary,
      payload.cover_url === undefined ? row.cover_url : payload.cover_url,
      payload.status ?? row.status,
      id,
      req.user!.id
    ]
  );

  res.json(updated.rows[0]);
});

app.post("/api/posts/:id/like", optionalAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const liked = await pool.query(
    `UPDATE posts
     SET likes_count = COALESCE(likes_count, 0) + 1
     WHERE id=$1
     RETURNING id, likes_count`,
    [id]
  );
  if (!liked.rowCount) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(liked.rows[0]);
});

app.delete("/api/posts/:id", auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const result = await pool.query("DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id", [id, req.user!.id]);
  if (!result.rowCount) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json({ deleted: true });
});

app.get("/api/tasks", auth, async (req: AuthRequest, res) => {
  const result = await pool.query("SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC", [req.user!.id]);
  res.json(result.rows);
});

app.post("/api/tasks", auth, async (req: AuthRequest, res) => {
  const schema = z.object({ text: z.string().min(1).max(300), priority: z.enum(["high", "mid", "low"]).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const result = await pool.query(
    "INSERT INTO tasks (user_id,text,priority) VALUES ($1,$2,$3) RETURNING *",
    [req.user!.id, parsed.data.text, parsed.data.priority || "mid"]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/tasks/:id", auth, async (req: AuthRequest, res) => {
  const schema = z.object({ done: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const result = await pool.query(
    "UPDATE tasks SET done=$1 WHERE id=$2 AND user_id=$3 RETURNING *",
    [parsed.data.done, Number(req.params.id), req.user!.id]
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(result.rows[0]);
});

app.delete("/api/tasks/:id", auth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING id",
    [Number(req.params.id), req.user!.id]
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ deleted: true });
});

app.post("/api/checkin", auth, async (req: AuthRequest, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const found = await pool.query("SELECT id FROM checkins WHERE user_id=$1 AND check_date=$2", [req.user!.id, today]);
  if (found.rowCount) {
    res.status(409).json({ error: "Already checked in today" });
    return;
  }

  await pool.query("INSERT INTO checkins (user_id,check_date) VALUES ($1,$2)", [req.user!.id, today]);

  const user = await pool.query("SELECT streak,last_checkin FROM users WHERE id=$1", [req.user!.id]);
  const row = user.rows[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const nextStreak = row.last_checkin === yesterday ? Number(row.streak || 0) + 1 : 1;

  await pool.query("UPDATE users SET streak=$1,last_checkin=$2 WHERE id=$3", [nextStreak, today, req.user!.id]);
  res.json({ streak: nextStreak, check_date: today });
});

app.get("/api/checkins", auth, async (req: AuthRequest, res) => {
  const days = Math.max(Math.min(Number(req.query.days || 30), 365), 1);
  const [rows, user] = await Promise.all([
    pool.query(
      `SELECT check_date
       FROM checkins
       WHERE user_id=$1
         AND check_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
       ORDER BY check_date ASC`,
      [req.user!.id, days]
    ),
    pool.query("SELECT streak,last_checkin FROM users WHERE id=$1", [req.user!.id])
  ]);

  res.json({
    days,
    checkins: rows.rows.map((x) => x.check_date),
    streak: user.rows[0]?.streak || 0,
    last_checkin: user.rows[0]?.last_checkin || null
  });
});

app.post("/api/upload", auth, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  const kind = req.file.mimetype.startsWith("video/") ? "video" : "image";

  const result = await pool.query(
    `INSERT INTO media_assets (user_id, file_name, file_url, mime_type, size_bytes, kind)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [req.user!.id, req.file.originalname, url, req.file.mimetype, req.file.size, kind]
  );

  res.status(201).json(result.rows[0]);
});

app.get("/api/wallpapers", async (_req, res) => {
  const [items, settings] = await Promise.all([
    pool.query(
      `SELECT id, file_name, file_url, mime_type, size_bytes, kind, created_at
       FROM media_assets
       WHERE kind IN ('image','video')
       ORDER BY created_at DESC
       LIMIT 300`
    ),
    pool.query(
      `SELECT key, value
       FROM site_settings
       WHERE key IN ('hero_media','about_media','learning_media','ai_media','journal_media','roadmap_media')`
    )
  ]);

  const selectionMap: Record<string, string[]> = {};
  settings.rows.forEach((row) => {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        selectionMap[row.key] = parsed.map((x) => String(x));
      }
    } catch {
      selectionMap[row.key] = [];
    }
  });

  res.setHeader("Cache-Control", "public, max-age=120");
  res.json({
    items: items.rows,
    selection: {
      hero: selectionMap.hero_media || [],
      about: selectionMap.about_media || [],
      learning: selectionMap.learning_media || [],
      ai: selectionMap.ai_media || [],
      journal: selectionMap.journal_media || [],
      roadmap: selectionMap.roadmap_media || []
    }
  });
});

app.get("/api/ai-resources", optionalAuth, async (req: AuthRequest, res) => {
  const search = (req.query.search as string | undefined)?.trim();
  const type = (req.query.type as string | undefined)?.trim();
  const difficulty = (req.query.difficulty as string | undefined)?.trim();
  const topic = (req.query.topic as string | undefined)?.trim();
  const sort = ((req.query.sort as string | undefined) || "newest").trim();
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const where: string[] = ["1=1"];
  const params: Array<string | number> = [];
  let idx = 1;

  if (search) {
    where.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR $${idx} = ANY(tags))`);
    params.push(`%${search}%`);
    idx++;
  }
  if (type && type !== "all") {
    where.push(`type = $${idx++}`);
    params.push(type);
  }
  if (difficulty && difficulty !== "all") {
    where.push(`difficulty = $${idx++}`);
    params.push(difficulty);
  }
  if (topic && topic !== "all") {
    where.push(`topic = $${idx++}`);
    params.push(topic);
  }

  const orderBy =
    sort === "popular"
      ? "stars DESC, created_at DESC"
      : sort === "title"
        ? "title ASC"
        : "created_at DESC, id DESC";

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT *
     FROM ai_resources
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  let bookmarks: number[] = [];
  if (req.user) {
    const marks = await pool.query(
      "SELECT resource_id FROM user_ai_bookmarks WHERE user_id=$1",
      [req.user.id]
    );
    bookmarks = marks.rows.map((x) => Number(x.resource_id));
  }

  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    items: result.rows,
    bookmarks,
    meta: { limit, offset, sort, search: search || "" }
  });
});

app.get("/api/me/bookmarks", auth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    `SELECT a.*
     FROM user_ai_bookmarks b
     JOIN ai_resources a ON b.resource_id = a.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

app.post("/api/ai-resources/:id/bookmark", auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const created = await pool.query(
    `INSERT INTO user_ai_bookmarks(user_id, resource_id)
     VALUES ($1,$2)
     ON CONFLICT (user_id, resource_id) DO NOTHING
     RETURNING *`,
    [req.user!.id, id]
  );
  res.status(201).json({ bookmarked: true, inserted: created.rows.length > 0 });
});

app.delete("/api/ai-resources/:id/bookmark", auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await pool.query(
    "DELETE FROM user_ai_bookmarks WHERE user_id=$1 AND resource_id=$2",
    [req.user!.id, id]
  );
  res.json({ bookmarked: false });
});

app.post("/api/sessions/start", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    topic: z.string().min(1).max(200),
    planned_minutes: z.number().int().min(5).max(240).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const started = await pool.query(
    `INSERT INTO learning_sessions(user_id, topic, planned_minutes, status)
     VALUES ($1,$2,$3,'running')
     RETURNING *`,
    [req.user!.id, parsed.data.topic, parsed.data.planned_minutes || 25]
  );
  res.status(201).json(started.rows[0]);
});

app.put("/api/sessions/:id/complete", auth, async (req: AuthRequest, res) => {
  const schema = z.object({ actual_minutes: z.number().int().min(1).max(600).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const sessionId = Number(req.params.id);
  const updated = await pool.query(
    `UPDATE learning_sessions
     SET status='completed', actual_minutes=COALESCE($1, planned_minutes), completed_at=NOW()
     WHERE id=$2 AND user_id=$3
     RETURNING *`,
    [parsed.data.actual_minutes || null, sessionId, req.user!.id]
  );
  if (!updated.rowCount) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(updated.rows[0]);
});

app.get("/api/sessions", auth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    `SELECT * FROM learning_sessions
     WHERE user_id=$1
     ORDER BY started_at DESC
     LIMIT 100`,
    [req.user!.id]
  );
  res.json(result.rows);
});

app.get("/api/sessions/stats", auth, async (req: AuthRequest, res) => {
  const stats = await pool.query(
    `SELECT
       COUNT(*)::int AS total_sessions,
       COALESCE(SUM(COALESCE(actual_minutes, planned_minutes)),0)::int AS total_minutes,
       COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0)::int AS completed_sessions
     FROM learning_sessions
     WHERE user_id=$1`,
    [req.user!.id]
  );
  res.json(stats.rows[0]);
});

app.get("/api/roadmap/templates", (_req, res) => {
  res.json([
    {
      key: "ai-agent",
      name: "AI Agent Engineer",
      phases: [
        "Prompting and tool-calling fundamentals",
        "RAG architecture and retrieval evaluation",
        "Multi-agent orchestration and memory",
        "Production deployment, tracing, and guardrails"
      ]
    },
    {
      key: "fullstack",
      name: "Full-Stack Builder",
      phases: [
        "TypeScript + React + state management",
        "Backend API design and auth model",
        "Database indexing, cache, and consistency",
        "Observability, CI/CD, and production hardening"
      ]
    },
    {
      key: "backend",
      name: "Backend Systems",
      phases: [
        "REST and event-driven architecture",
        "Data modeling and SQL optimization",
        "Queues, workflows, and async processing",
        "Reliability engineering and scaling strategy"
      ]
    }
  ]);
});

app.get("/api/stats", async (_req, res) => {
  const [posts, users, resources] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM posts"),
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM ai_resources")
  ]);
  res.json({
    total_posts: posts.rows[0].count,
    total_users: users.rows[0].count,
    total_ai_resources: resources.rows[0].count
  });
});

app.get("/api/admin/overview", auth, adminOnly, async (_req, res) => {
  const [users, posts, tasks, media, visitors] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM posts"),
    pool.query("SELECT COUNT(*)::int AS count FROM tasks"),
    pool.query("SELECT COUNT(*)::int AS count FROM media_assets"),
    pool.query("SELECT COUNT(*)::int AS count FROM visitor_logs WHERE created_at >= NOW() - INTERVAL '7 days'")
  ]);

  res.json({
    users: users.rows[0].count,
    posts: posts.rows[0].count,
    tasks: tasks.rows[0].count,
    media: media.rows[0].count,
    visitors_7d: visitors.rows[0].count
  });
});

app.get("/api/admin/users", auth, adminOnly, async (_req, res) => {
  const users = await pool.query(
    "SELECT id, username, email, display_name, role, streak, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(users.rows);
});

app.put("/api/admin/users/:id/role", auth, adminOnly, async (req: AuthRequest, res) => {
  const schema = z.object({ role: z.enum(["admin", "user"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const userId = Number(req.params.id);
  const updated = await pool.query(
    "UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id,username,role",
    [parsed.data.role, userId]
  );
  if (!updated.rowCount) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated.rows[0]);
});

app.get("/api/admin/posts", auth, adminOnly, async (_req, res) => {
  const posts = await pool.query(
    `SELECT p.id, p.title, p.category, p.status, p.created_at, p.cover_url, p.likes_count, u.username, u.display_name
     FROM posts p
     JOIN users u ON p.user_id=u.id
     ORDER BY p.created_at DESC`
  );
  res.json(posts.rows);
});

app.put("/api/admin/posts/:id/status", auth, adminOnly, async (req, res) => {
  const schema = z.object({ status: z.enum(["published", "draft"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updated = await pool.query(
    "UPDATE posts SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id,title,status,updated_at",
    [parsed.data.status, Number(req.params.id)]
  );
  if (!updated.rowCount) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(updated.rows[0]);
});

app.delete("/api/admin/posts/:id", auth, adminOnly, async (req, res) => {
  const deleted = await pool.query("DELETE FROM posts WHERE id=$1 RETURNING id", [Number(req.params.id)]);
  if (!deleted.rowCount) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json({ deleted: true });
});

app.get("/api/admin/media", auth, adminOnly, async (_req, res) => {
  const media = await pool.query(
    `SELECT m.*, u.username, u.display_name
     FROM media_assets m
     LEFT JOIN users u ON m.user_id = u.id
     ORDER BY m.created_at DESC`
  );
  res.json(media.rows);
});

app.get("/api/admin/visitors", auth, adminOnly, async (req, res) => {
  const days = Math.max(Number(req.query.days || 14), 1);
  const rows = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*)::int AS count
     FROM visitor_logs
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [days]
  );
  res.json(rows.rows);
});

app.get("/api/admin/checkins", auth, adminOnly, async (req, res) => {
  const days = Math.max(Number(req.query.days || 30), 1);
  const rows = await pool.query(
    `SELECT check_date, COUNT(*)::int AS count
     FROM checkins
     WHERE check_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
     GROUP BY check_date
     ORDER BY check_date ASC`,
    [days]
  );
  res.json(rows.rows);
});

app.get("/api/admin/site-settings", auth, adminOnly, async (_req, res) => {
  const settings = await pool.query("SELECT key, value, updated_at FROM site_settings ORDER BY key ASC");
  res.json(settings.rows);
});

app.get("/api/admin/wallpapers/selection", auth, adminOnly, async (_req, res) => {
  const rows = await pool.query(
    `SELECT key, value
     FROM site_settings
     WHERE key IN ('hero_media','about_media','learning_media','ai_media','journal_media','roadmap_media')`
  );
  const pick: Record<string, string[]> = {
    hero: [],
    about: [],
    learning: [],
    ai: [],
    journal: [],
    roadmap: []
  };
  const mapping: Record<string, keyof typeof pick> = {
    hero_media: "hero",
    about_media: "about",
    learning_media: "learning",
    ai_media: "ai",
    journal_media: "journal",
    roadmap_media: "roadmap"
  };
  rows.rows.forEach((x) => {
    const key = mapping[x.key];
    if (!key) return;
    try {
      const val = JSON.parse(x.value);
      if (Array.isArray(val)) pick[key] = val.map((s) => String(s));
    } catch {
      pick[key] = [];
    }
  });
  res.json(pick);
});

app.put("/api/admin/site-settings", auth, adminOnly, async (req, res) => {
  const schema = z.object({ key: z.string().min(1).max(100), value: z.string().max(5000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const updated = await pool.query(
    `INSERT INTO site_settings(key, value, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (key)
     DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
     RETURNING key, value, updated_at`,
    [parsed.data.key, parsed.data.value]
  );
  res.json(updated.rows[0]);
});

app.put("/api/admin/wallpapers/selection", auth, adminOnly, async (req, res) => {
  const schema = z.object({
    hero: z.array(z.string()).max(30).optional(),
    about: z.array(z.string()).max(30).optional(),
    learning: z.array(z.string()).max(30).optional(),
    ai: z.array(z.string()).max(30).optional(),
    journal: z.array(z.string()).max(30).optional(),
    roadmap: z.array(z.string()).max(30).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const entries: Array<{ key: string; value: string }> = [
    { key: "hero_media", value: JSON.stringify(parsed.data.hero || []) },
    { key: "about_media", value: JSON.stringify(parsed.data.about || []) },
    { key: "learning_media", value: JSON.stringify(parsed.data.learning || []) },
    { key: "ai_media", value: JSON.stringify(parsed.data.ai || []) },
    { key: "journal_media", value: JSON.stringify(parsed.data.journal || []) },
    { key: "roadmap_media", value: JSON.stringify(parsed.data.roadmap || []) }
  ];

  for (const entry of entries) {
    await pool.query(
      `INSERT INTO site_settings(key, value, updated_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (key)
       DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [entry.key, entry.value]
    );
  }

  res.json({ ok: true });
});

app.post("/api/admin/ai-resources", auth, adminOnly, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(300),
    type: z.string().min(1).max(40),
    url: z.string().url(),
    description: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const item = await pool.query(
    `INSERT INTO ai_resources(title, type, url, description, tags)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [parsed.data.title, parsed.data.type, parsed.data.url, parsed.data.description || "", parsed.data.tags || []]
  );
  res.status(201).json(item.rows[0]);
});

app.delete("/api/admin/ai-resources/:id", auth, adminOnly, async (req, res) => {
  const deleted = await pool.query("DELETE FROM ai_resources WHERE id=$1 RETURNING id", [Number(req.params.id)]);
  if (!deleted.rowCount) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.json({ deleted: true });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Phoenix blog backend running on http://localhost:${PORT}`);
});
