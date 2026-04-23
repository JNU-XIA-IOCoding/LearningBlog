# CODEX — CLAUDE CODE EXECUTION PROMPT
# 完整全栈博客网站 · 本地自动化构建计划书
# ═══════════════════════════════════════════════════════════════

## 【执行说明 / How To Run】

```bash
# 前置条件：已安装 Node.js 20+, Docker Desktop, Git
# Prerequisites: Node.js 20+, Docker Desktop, Git

# 将此文件夹放入任意目录后，在该目录运行：
claude   # 启动 Claude Code，它会自动读取此 Codex.md
```

Claude Code 会按照本文档的 Phases 顺序**全自动**完成所有步骤。
遇到错误时请继续执行，文档中已提供 fallback 策略。

---

## 【项目背景 / Project Context】

**是什么：** 一个个人 CS 学习博客，主人是暨南大学（JNU）计算机科学与技术专业学生。
视觉风格：樱花美学 + 胶片摄影 + 学术编辑质感。

**现有基础（existing/ 目录）：**

| 文件 | 说明 | 完成度 |
|------|------|--------|
| `existing/frontend/index.html` | 完整前端单文件，含中英切换/樱花动画/照片轮播/学习模块/AI Agent 资源/日志/路线图 | 95% |
| `existing/backend/server.js` | Express API，含 JWT 认证/文章 CRUD/打卡/任务接口 | 80% |
| `existing/backend/db/schema.sql` | PostgreSQL 5 张表完整 schema | 100% |
| `existing/backend/Dockerfile` | Node 20 Alpine 镜像 | 100% |
| `existing/docker-compose.yml` | PostgreSQL + Node.js + Nginx 编排 | 90% |
| `existing/nginx.conf` | 静态资源 + API 反代 + gzip | 100% |

**目标：** 从单文件 HTML 原型 → 生产可用的完整全栈应用，支持部署到任意 VPS。

---

## 【最终目标架构 / Target Architecture】

```
codex/
├── frontend/                    ← React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── components/          ← 复用组件 (Nav, Hero, ModuleCard, PostCard...)
│   │   ├── pages/               ← 路由页面 (Home, Journal, Admin)
│   │   ├── hooks/               ← 自定义 Hook (useAuth, usePosts, useStreak...)
│   │   ├── stores/              ← Zustand 全局状态
│   │   ├── api/                 ← Axios 封装的 API 客户端
│   │   ├── i18n/                ← 中英翻译文件
│   │   ├── styles/              ← 全局 CSS 变量 (樱花设计系统)
│   │   └── App.tsx
│   ├── public/images/           ← 樱花照片资源
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     ← Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/              ← auth / posts / checkin / tasks / users
│   │   ├── middleware/          ← authenticate / rateLimiter / validate / upload
│   │   ├── db/                  ← Pool + 迁移脚本
│   │   ├── utils/               ← logger / errors / email
│   │   └── index.ts
│   ├── migrations/              ← 版本化数据库迁移
│   ├── tests/                   ← Jest 单元 + 集成测试
│   └── package.json
│
├── nginx/
│   ├── nginx.conf               ← 生产 Nginx 配置
│   └── ssl/                     ← Let's Encrypt 证书挂载点
│
├── scripts/
│   ├── setup.sh                 ← 一键初始化脚本
│   ├── deploy.sh                ← 生产部署脚本
│   └── backup-db.sh             ← 数据库备份
│
├── docker-compose.yml           ← 开发环境
├── docker-compose.prod.yml      ← 生产环境
├── .env.example
├── .env.development
└── README.md
```

---

## 【PHASE 0 — 环境检查与项目初始化】
### 预计时间：5 分钟

```bash
# 0.1 检查前置条件
node --version    # 需要 v20+
docker --version  # 需要已安装
git --version

# 0.2 创建工作目录
mkdir -p codex/{frontend,backend,nginx,scripts}
cd codex

# 0.3 Git 初始化
git init
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.local
pgdata/
ssl/
*.log
.DS_Store
EOF

# 0.4 复制现有文件作为起点
cp -r ../existing/backend ./backend-legacy
cp    ../existing/docker-compose.yml ./
cp    ../existing/nginx.conf ./nginx/nginx.conf
```

**检查点：** 目录结构存在，git init 成功。

---

## 【PHASE 1 — 数据库层 (Database)】
### 预计时间：10 分钟

### 1.1 启动 PostgreSQL（Docker）

```bash
# 仅启动 DB 用于开发
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: codex
      POSTGRES_USER: codex
      POSTGRES_PASSWORD: dev_password_2026
    ports:
      - "5432:5432"
    volumes:
      - pgdata_dev:/var/lib/postgresql/data
      - ./backend/db/migrations:/docker-entrypoint-initdb.d
volumes:
  pgdata_dev:
EOF

docker-compose -f docker-compose.dev.yml up -d db
sleep 3
docker-compose -f docker-compose.dev.yml exec db pg_isready
```

### 1.2 迁移系统（基于现有 schema.sql 扩展）

创建 `backend/db/migrations/` 目录，生成以下迁移文件：

**`001_initial_schema.sql`** — 基于 `existing/backend/db/schema.sql`，内容完全一致，仅添加版本表：
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);
-- [完整内容来自 existing/backend/db/schema.sql]
INSERT INTO schema_migrations(version) VALUES('001') ON CONFLICT DO NOTHING;
```

**`002_add_reactions.sql`** — 文章点赞/收藏：
```sql
CREATE TABLE IF NOT EXISTS post_reactions (
    id         SERIAL PRIMARY KEY,
    post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(20) DEFAULT 'like',  -- 'like' | 'bookmark'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id, type)
);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
INSERT INTO schema_migrations(version) VALUES('002') ON CONFLICT DO NOTHING;
```

**`003_add_visitor_logs.sql`** — 访客统计：
```sql
CREATE TABLE IF NOT EXISTS visitor_logs (
    id         SERIAL PRIMARY KEY,
    page       VARCHAR(200),
    referrer   VARCHAR(500),
    ua         TEXT,
    ip_hash    VARCHAR(64),  -- hashed for privacy
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_visitor_date ON visitor_logs(created_at DESC);
INSERT INTO schema_migrations(version) VALUES('003') ON CONFLICT DO NOTHING;
```

**`004_add_user_settings.sql`** — 用户偏好设置：
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
-- settings 结构: { "lang": "zh", "dark": false, "emailNotify": true }
INSERT INTO schema_migrations(version) VALUES('004') ON CONFLICT DO NOTHING;
```

### 1.3 迁移运行脚本

创建 `backend/db/migrate.js`：
```js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations(
    version VARCHAR(50) PRIMARY KEY, applied_at TIMESTAMP DEFAULT NOW()
  )`);
  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map(r => r.version));
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const v = file.split('_')[0];
    if (applied.has(v)) { console.log(`  ✓ ${file} (already applied)`); continue; }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`  ✅ Applied: ${file}`);
  }
  await pool.end();
  console.log('Migration complete.');
}
migrate().catch(e => { console.error(e); process.exit(1); });
```

**检查点：** `node backend/db/migrate.js` 输出所有 migration applied。

---

## 【PHASE 2 — 后端 API (Backend)】
### 预计时间：25 分钟

### 2.1 项目初始化

```bash
cd backend
# 基于 existing/backend/package.json 扩展
npm init -y
npm install express cors pg bcryptjs jsonwebtoken dotenv \
            express-rate-limit express-validator helmet morgan \
            multer sharp uuid
npm install -D nodemon jest supertest @types/node
```

最终 `package.json` scripts：
```json
{
  "scripts": {
    "dev":      "nodemon src/index.js",
    "start":    "node src/index.js",
    "migrate":  "node db/migrate.js",
    "test":     "jest --runInBand",
    "test:watch": "jest --watch"
  }
}
```

### 2.2 入口文件 `backend/src/index.js`

基于 `existing/backend/server.js`，新增以下中间件：
```js
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const morgan       = require('morgan');

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Request logging
app.use(morgan('combined'));

// Rate limiting — 全局 100req/15min
const limiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true });
app.use('/api/', limiter);

// Auth routes 更严格限速 — 10req/15min
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
app.use('/api/auth/', authLimiter);
```

### 2.3 路由文件（完整实现）

**`backend/src/routes/auth.js`** — 基于 existing/backend/server.js auth 部分，补充：
- `POST /api/auth/register` ✅ (existing)
- `POST /api/auth/login` ✅ (existing)
- `GET  /api/auth/me` ✅ (existing)
- `PUT  /api/auth/profile` ✅ (existing)
- `POST /api/auth/change-password` 🆕
- `POST /api/auth/refresh-token` 🆕

**`backend/src/routes/posts.js`** — 完整文章 CRUD：
- `GET    /api/posts` ✅ + 分页 `?page=1&limit=10`
- `GET    /api/posts/:id` ✅ + 自动增加 view_count
- `POST   /api/posts` ✅
- `PUT    /api/posts/:id` ✅
- `DELETE /api/posts/:id` ✅
- `POST   /api/posts/:id/like` 🆕 点赞
- `POST   /api/posts/:id/bookmark` 🆕 收藏

**`backend/src/routes/checkin.js`** — 打卡系统：
- `POST /api/checkin` ✅
- `GET  /api/checkins?days=30` ✅
- `GET  /api/checkins/stats` 🆕 返回最长连续/总次数

**`backend/src/routes/tasks.js`** — 周任务 CRUD ✅ (existing 完整)

**`backend/src/routes/upload.js`** 🆕 — 图片上传：
```js
const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const { v4: uuid } = require('uuid');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8*1024*1024 } });

router.post('/api/upload/avatar', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const filename = `avatar_${req.user.id}_${uuid()}.webp`;
  const dest = path.join(__dirname, '../../public/uploads', filename);
  await sharp(req.buffer).resize(400, 400, { fit:'cover' }).webp({ quality:80 }).toFile(dest);
  const url = `/uploads/${filename}`;
  await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, req.user.id]);
  res.json({ url });
});
```

**`backend/src/routes/stats.js`** 🆕 — 站点统计：
```js
router.get('/api/stats/public', async (req, res) => {
  const [posts, users, checkins] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM posts'),
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM checkins'),
  ]);
  res.json({
    total_posts: +posts.rows[0].count,
    total_users: +users.rows[0].count,
    total_checkins: +checkins.rows[0].count,
  });
});
```

### 2.4 中间件

**`backend/src/middleware/auth.js`** — JWT 验证（从 existing 提取）

**`backend/src/middleware/validate.js`** 🆕 — express-validator 包装：
```js
const { validationResult } = require('express-validator');
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};
```

**`backend/src/middleware/logger.js`** 🆕 — 访客日志中间件（隐私安全：IP 哈希）

### 2.5 环境变量

创建 `backend/.env.development`：
```ini
DATABASE_URL=postgresql://codex:dev_password_2026@localhost:5432/codex
JWT_SECRET=dev-codex-secret-change-in-production-2026
PORT=3001
NODE_ENV=development
UPLOAD_DIR=./public/uploads
```

创建 `backend/.env.example`（提交到 git）：
```ini
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/codex
JWT_SECRET=your-very-long-random-secret-here
PORT=3001
NODE_ENV=production
UPLOAD_DIR=./public/uploads
```

### 2.6 测试

在 `backend/tests/` 创建：
- `auth.test.js` — 注册/登录/token 验证
- `posts.test.js` — CRUD + 权限检查
- `checkin.test.js` — 打卡/连续天数逻辑

```bash
# 运行测试
cd backend
npm test
# 预期：所有测试通过
```

**检查点：** `npm run dev` 启动，`curl http://localhost:3001/api/stats/public` 返回 JSON。

---

## 【PHASE 3 — 前端重构 (Frontend · React + Vite)】
### 预计时间：40 分钟

### 3.1 初始化 React 项目

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install axios zustand react-router-dom @tanstack/react-query \
            lucide-react framer-motion date-fns
npm install -D @types/react @types/react-dom tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 设计系统 — 移植 v3 CSS 变量

将 `existing/frontend/index.html` 中的 `:root` CSS 变量完整移入 `frontend/src/styles/tokens.css`。
同时移入所有 `@keyframes`、基础排版规则。

保持与现有 v3 完全相同的视觉风格：
- 字体：Playfair Display / Noto Serif SC / JetBrains Mono
- 颜色：樱花色板（--c-cream, --c-petal, --c-bark 等）
- 动画：sakura petals, hero fadeUp, card hover

### 3.3 组件拆分（从 existing/frontend/index.html 提取）

**从现有单文件提取以下组件：**

```
src/components/
├── layout/
│   ├── Nav.tsx           ← 导航栏（从 .nav 相关 HTML + CSS 提取）
│   ├── Footer.tsx        ← Footer（从 footer HTML 提取）
│   └── Layout.tsx        ← 包裹 Nav + Footer
│
├── hero/
│   ├── Hero.tsx          ← Hero section
│   ├── Slideshow.tsx     ← 照片轮播（保持现有逻辑）
│   └── SakuraCanvas.tsx  ← 粒子动画（保持现有 Sakura 模块代码）
│
├── modules/
│   ├── ModuleGrid.tsx    ← 学习模块网格
│   ├── ModuleCard.tsx    ← 单个模块卡片
│   └── ModulePanel.tsx   ← 侧滑详情面板
│
├── ai/
│   ├── AISection.tsx     ← AI Agent 板块
│   └── AICard.tsx        ← 单个资源卡片
│
├── journal/
│   ├── JournalSection.tsx← 日志板块布局
│   ├── PostCard.tsx      ← 文章卡片
│   ├── WriteModal.tsx    ← 写作弹窗
│   └── Sidebar.tsx       ← 侧边统计栏
│
├── roadmap/
│   ├── RoadmapSection.tsx← 路线图板块
│   ├── Timeline.tsx      ← 时间线组件
│   └── TaskList.tsx      ← 周任务列表
│
├── profile/
│   └── ProfileSection.tsx← About 板块
│
└── ui/
    ├── Toast.tsx         ← 通知提示
    ├── DetailPanel.tsx   ← 通用侧滑面板
    ├── Modal.tsx         ← 通用弹窗
    ├── Button.tsx        ← 按钮组件
    ├── Badge.tsx         ← 状态标签
    └── ProgressBar.tsx   ← 进度条
```

### 3.4 页面路由

```
src/pages/
├── HomePage.tsx          ← 所有 section 的集成页
├── AdminPage.tsx         ← 管理员控制台（仅 admin 角色可见）
└── NotFoundPage.tsx      ← 404 页面
```

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import HomePage     from './pages/HomePage';
import AdminPage    from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthGuard } from './components/ui/AuthGuard';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/"       element={<HomePage />} />
          <Route path="/admin"  element={<AuthGuard role="admin"><AdminPage /></AuthGuard>} />
          <Route path="*"       element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### 3.5 数据获取层

**`src/api/client.ts`** — Axios 实例：
```ts
import axios from 'axios';
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// 自动附加 JWT
client.interceptors.request.use(config => {
  const token = localStorage.getItem('codex_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → 清除 token
client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('codex_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);
export default client;
```

**`src/api/posts.ts`**, **`src/api/auth.ts`**, **`src/api/checkin.ts`**, **`src/api/tasks.ts`** — 各自封装对应后端路由。

### 3.6 全局状态 (Zustand)

**`src/stores/authStore.ts`**:
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null, token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'codex_auth' }
  )
);
```

**`src/stores/uiStore.ts`** — lang / darkMode / modalState

**`src/stores/blogStore.ts`** — 离线 posts 缓存（backend 不可用时降级到 localStorage）

### 3.7 i18n 系统

将 `existing/frontend/index.html` 中的 `I18N` 对象提取为：
```
src/i18n/
├── en.json    ← 英文翻译（从现有 I18N.en 提取）
├── zh.json    ← 中文翻译（从现有 I18N.zh 提取）
└── index.ts   ← 简单 t() 函数，兼容 Zustand lang state
```

### 3.8 环境变量

`frontend/.env.development`:
```ini
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=Learning Journey · CS Blog
```

`frontend/.env.production`:
```ini
VITE_API_URL=/api
VITE_APP_TITLE=Learning Journey · CS Blog
```

**检查点：** `npm run dev` 启动，localhost:5173 显示完整页面，样式与 v3 一致。

---

## 【PHASE 4 — 管理后台 (Admin Panel)】
### 预计时间：20 分钟

`src/pages/AdminPage.tsx` 包含：

### 4.1 仪表盘
- 站点统计卡片（总文章数、注册用户数、今日访问量、打卡总次数）
- 近 30 天文章发布趋势图（使用 recharts 或纯 CSS）

### 4.2 文章管理
- 文章列表（支持搜索、分类筛选、删除）
- 点击进入编辑（复用 WriteModal 组件）

### 4.3 用户管理（仅 admin）
- 用户列表（显示 username / email / streak / 注册时间）
- 禁用/启用用户

### 4.4 系统设置
- 修改个人资料（调用 PUT /api/auth/profile）
- 头像上传（调用 POST /api/upload/avatar）
- 修改密码

### 4.5 访问控制
`src/components/ui/AuthGuard.tsx`:
```tsx
export function AuthGuard({ children, role }: { children: ReactNode; role?: string }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
}
```

**检查点：** `/admin` 路由，admin 用户登录后可访问，普通用户重定向到首页。

---

## 【PHASE 5 — Docker 完整化 (Containerization)】
### 预计时间：15 分钟

### 5.1 Frontend Dockerfile

`frontend/Dockerfile`:
```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — Serve (Nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`frontend/nginx.frontend.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location ~* \.(js|css|png|jpg|svg|woff2)$ {
        expires 1y; add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 完整 docker-compose.yml（开发）

基于 `existing/docker-compose.yml` 重写，添加 frontend 服务：
```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: ./backend/.env.development
    environment:
      POSTGRES_DB: codex
      POSTGRES_USER: codex
      POSTGRES_PASSWORD: dev_password_2026
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codex"]
      interval: 5s; timeout: 5s; retries: 5

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    env_file: ./backend/.env.development
    environment:
      DATABASE_URL: postgresql://codex:dev_password_2026@db:5432/codex
    ports: ["3001:3001"]
    volumes: ["./backend:/app", "/app/node_modules"]

  frontend:
    build:
      context: ./frontend
      target: builder   # dev mode: just the build stage
    restart: unless-stopped
    ports: ["5173:5173"]
    volumes: ["./frontend:/app", "/app/node_modules"]
    command: npm run dev -- --host

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on: [backend, frontend]
    ports: ["80:80"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./backend/public/uploads:/usr/share/nginx/uploads:ro

volumes:
  pgdata:
```

### 5.3 docker-compose.prod.yml（生产）

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata_prod:/var/lib/postgresql/data
    # 生产不暴露端口

  backend:
    build: ./backend
    restart: always
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    # 不暴露端口，仅通过 nginx 代理

  frontend:
    build: ./frontend   # multi-stage build → static files
    restart: always

  nginx:
    image: nginx:alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./backend/public/uploads:/usr/share/nginx/uploads:ro
      - letsencrypt:/var/www/certbot

volumes:
  pgdata_prod:
  letsencrypt:
```

**检查点：** `docker-compose up --build` 全部容器健康运行，http://localhost 可访问。

---

## 【PHASE 6 — Nginx 生产配置】
### 预计时间：10 分钟

`nginx/nginx.prod.conf`:
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name YOUR_DOMAIN.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'";

    # Frontend (static)
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass         http://backend:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_read_timeout 30s;
    }

    # Uploads
    location /uploads/ {
        alias /usr/share/nginx/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;
}
```

---

## 【PHASE 7 — 部署脚本 (Deploy Scripts)】
### 预计时间：10 分钟

### `scripts/setup.sh` — 首次初始化

```bash
#!/bin/bash
set -e
echo "🌸 Codex — Setup"

# 1. 检查依赖
command -v docker >/dev/null || { echo "❌ Docker not found"; exit 1; }
command -v node   >/dev/null || { echo "❌ Node.js not found"; exit 1; }

# 2. 创建 .env 文件
[ ! -f backend/.env ] && cp backend/.env.example backend/.env && echo "📝 Created backend/.env — please edit!"

# 3. 安装依赖
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. 启动数据库
docker-compose -f docker-compose.dev.yml up -d db
sleep 5

# 5. 运行迁移
cd backend && DATABASE_URL="postgresql://codex:dev_password_2026@localhost:5432/codex" \
  node db/migrate.js && cd ..

echo "✅ Setup complete. Run: docker-compose up"
```

### `scripts/deploy.sh` — 生产部署 (VPS)

```bash
#!/bin/bash
set -e
echo "🚀 Codex — Production Deploy"

# 确认域名和 SSL
[ -z "$DOMAIN" ] && read -p "Enter domain (e.g. blog.example.com): " DOMAIN

# Pull latest
git pull origin main

# Build & restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec backend node db/migrate.js

echo "✅ Deployed to https://$DOMAIN"
```

### `scripts/backup-db.sh` — 数据库备份

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
FILE="backups/codex_${DATE}.sql.gz"
mkdir -p backups
docker-compose exec -T db pg_dump -U codex codex | gzip > "$FILE"
echo "✅ Backup saved: $FILE"
# 保留最近 7 个备份
ls -t backups/*.sql.gz | tail -n +8 | xargs -r rm
```

---

## 【PHASE 8 — SSL 证书 (HTTPS)】
### 预计时间：5 分钟（需要真实域名）

```bash
# 使用 Certbot 获取 Let's Encrypt 证书
docker run -it --rm \
  -v ./ssl:/etc/letsencrypt \
  -v ./ssl-challenges:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d YOUR_DOMAIN.com \
  --email your@email.com \
  --agree-tos --no-eff-email

# 证书自动续期（cron）
echo "0 0 1 * * docker run --rm -v $(pwd)/ssl:/etc/letsencrypt certbot/certbot renew" | crontab -
```

---

## 【PHASE 9 — 集成测试 & 验收】
### 预计时间：10 分钟

执行以下验收清单，**全部通过才算完成**：

### 功能测试
```bash
# 9.1 后端健康检查
curl http://localhost:3001/api/stats/public
# 预期: {"total_posts":N,"total_users":N,"total_checkins":N}

# 9.2 用户注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"Test1234!"}'
# 预期: {"user":{...},"token":"eyJ..."}

# 9.3 创建文章（需要 token）
TOKEN="eyJ..."  # 从上一步获取
curl -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","content":"Hello World","category":"Algorithms"}'
# 预期: 201 + post 对象

# 9.4 前端访问
open http://localhost      # 首页正常加载
open http://localhost/admin  # 未登录应重定向
```

### 性能验收
```bash
# 使用 Lighthouse CI（如已安装）
npx lhci autorun --url=http://localhost

# 手动检查指标：
# - 首屏渲染 < 2s（本地）
# - Sakura 动画 CPU 占用 < 3%（Activity Monitor / Task Manager）
# - 切换中英文：无闪烁，< 50ms
# - 5 张照片轮播：无卡顿
```

### 安全检查
```bash
# SQL 注入测试（应返回 422/400，不崩溃）
curl -X POST http://localhost:3001/api/auth/login \
  -d '{"username":"admin'; DROP TABLE users; --","password":"x"}'

# XSS 测试（应被 helmet 阻止）
curl http://localhost/api/posts?search='<script>alert(1)</script>'
```

---

## 【PHASE 10 — 文档输出】
### 预计时间：5 分钟

生成最终 `README.md`，包含：
1. 项目简介（中英双语）
2. 快速开始（3 种方式：纯前端 / Docker 开发 / 生产部署）
3. API 文档表格
4. 环境变量说明
5. 贡献指南
6. License (MIT)

---

## 【执行顺序总结 / Execution Summary】

```
Phase 0  →  环境初始化          (5 min)
Phase 1  →  数据库迁移系统      (10 min)
Phase 2  →  后端 API 完整化     (25 min)
Phase 3  →  前端 React 重构     (40 min)
Phase 4  →  管理后台            (20 min)
Phase 5  →  Docker 编排         (15 min)
Phase 6  →  Nginx 生产配置      (10 min)
Phase 7  →  部署脚本            (10 min)
Phase 8  →  SSL 证书            ( 5 min)
Phase 9  →  集成测试 & 验收     (10 min)
Phase 10 →  文档                ( 5 min)
─────────────────────────────────
Total                          ~155 min (~2.5 hours)
```

---

## 【关键技术决策说明】

| 决策 | 选型 | 原因 |
|------|------|------|
| 前端框架 | React 18 + Vite + TS | 生态最大，Vite 构建极快，TS 保证类型安全 |
| 状态管理 | Zustand | 轻量简洁，比 Redux 少 80% 代码 |
| 数据请求 | TanStack Query | 自动缓存/重试/背景刷新，完美契合博客场景 |
| 数据库 | PostgreSQL 16 | JSONB 支持灵活 settings，全文搜索，稳定可靠 |
| 认证 | JWT (30d) | 无状态，支持多端，简单可靠 |
| 图片处理 | Sharp | 服务端压缩头像，节省存储和带宽 |
| 容器 | Docker + Alpine | 镜像最小化，Node 20 Alpine ≈ 80MB |
| 反代 | Nginx | 静态资源缓存、gzip、SSL 终止、安全头 |
| 离线降级 | localStorage fallback | 无后端时前端仍完全可用（v3 设计保留） |

---

## 【给 Claude Code 的特别说明】

1. **优先保持视觉一致性**：提取组件时，精确复制 `existing/frontend/index.html` 中的 CSS 变量和动画，不要更改颜色/字体/间距。

2. **照片文件**：`existing/frontend/index.html` 中的 base64 图片数据需要提取为文件保存到 `frontend/public/images/`，并更新引用路径。用法：`const img = document.createElement('img'); img.src = base64str; fetch(base64str).then(r=>r.blob())...`

3. **graceful degradation**：所有 API 请求失败时，前端应该回退到 localStorage 数据，保证离线可用。

4. **语言切换**：切换语言时，确保页面 title 和 `<html lang>` 属性同步更新。

5. **错误边界**：在每个主要 section 组件外包裹 React ErrorBoundary，防止单个组件崩溃影响整页。

6. **admin 默认凭据**：首次运行后，`existing/backend/db/schema.sql` 中已插入 admin 用户（密码: `codex2026`）。提示用户首次登录后立即修改密码。