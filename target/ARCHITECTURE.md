# Phoenix Blog — Target File Tree
# 执行完成后应得到的完整目录结构

phoenix-blog/
├── CLAUDE.md                         ← Claude Code 主 Prompt（本文件所在位置）
├── README.md                         ← 项目文档（Phase 10 生成）
├── .gitignore
├── .env.example                      ← 环境变量模板
├── docker-compose.yml                ← 开发环境编排
├── docker-compose.prod.yml           ← 生产环境编排
│
├── existing/                         ← ✅ 现有基础文件（不要修改）
│   ├── frontend/
│   │   └── index.html                ← v3 单文件前端（视觉参考基准）
│   ├── backend/
│   │   ├── server.js                 ← API 原型
│   │   ├── db/schema.sql             ← 数据库 schema
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── frontend/                         ← 🔨 React + Vite + TypeScript
│   ├── public/
│   │   ├── images/                   ← 樱花照片（从 existing 提取 base64 → 文件）
│   │   │   ├── hero-1.jpg
│   │   │   ├── hero-2.jpg
│   │   │   ├── hero-3.jpg
│   │   │   ├── hero-4.jpg
│   │   │   └── hero-5.jpg
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Nav.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── hero/
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Slideshow.tsx
│   │   │   │   └── SakuraCanvas.tsx
│   │   │   ├── modules/
│   │   │   │   ├── ModuleGrid.tsx
│   │   │   │   ├── ModuleCard.tsx
│   │   │   │   └── ModulePanel.tsx
│   │   │   ├── ai/
│   │   │   │   ├── AISection.tsx
│   │   │   │   └── AICard.tsx
│   │   │   ├── journal/
│   │   │   │   ├── JournalSection.tsx
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── WriteModal.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── roadmap/
│   │   │   │   ├── RoadmapSection.tsx
│   │   │   │   ├── Timeline.tsx
│   │   │   │   └── TaskList.tsx
│   │   │   ├── profile/
│   │   │   │   └── ProfileSection.tsx
│   │   │   └── ui/
│   │   │       ├── Toast.tsx
│   │   │       ├── DetailPanel.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       ├── AuthGuard.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePosts.ts
│   │   │   ├── useStreak.ts
│   │   │   ├── useTasks.ts
│   │   │   └── useTheme.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── blogStore.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── posts.ts
│   │   │   ├── checkin.ts
│   │   │   ├── tasks.ts
│   │   │   └── upload.ts
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   ├── zh.json
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   ├── tokens.css            ← 樱花 CSS 变量系统
│   │   │   ├── base.css              ← Reset + 排版
│   │   │   └── animations.css        ← keyframes
│   │   ├── data/
│   │   │   ├── modules.ts            ← 6个学习模块数据
│   │   │   └── ai-resources.ts       ← 17个AI资源数据
│   │   ├── types/
│   │   │   └── index.ts              ← User, Post, Task 等类型定义
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── .env.development
│   ├── .env.production
│   └── package.json
│
├── backend/                          ← 🔨 Node.js + Express (基于 existing 完善)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── posts.js
│   │   │   ├── checkin.js
│   │   │   ├── tasks.js
│   │   │   ├── upload.js             ← 🆕
│   │   │   └── stats.js              ← 🆕
│   │   ├── middleware/
│   │   │   ├── auth.js               ← JWT 验证
│   │   │   ├── validate.js           ← 🆕 express-validator
│   │   │   ├── rateLimiter.js        ← 🆕
│   │   │   └── logger.js             ← 🆕 访客日志
│   │   ├── db/
│   │   │   ├── pool.js               ← pg.Pool 实例
│   │   │   └── migrate.js            ← 迁移运行器
│   │   └── index.js                  ← 入口（基于 existing/backend/server.js）
│   ├── db/
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql
│   │       ├── 002_add_reactions.sql
│   │       ├── 003_add_visitor_logs.sql
│   │       └── 004_add_user_settings.sql
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── posts.test.js
│   │   └── checkin.test.js
│   ├── public/
│   │   └── uploads/                  ← 用户上传头像
│   ├── Dockerfile                    ← 来自 existing
│   ├── .env.example
│   ├── .env.development
│   └── package.json
│
├── nginx/
│   ├── nginx.conf                    ← 开发环境（来自 existing）
│   └── nginx.prod.conf               ← 🆕 生产环境（含 SSL）
│
├── scripts/
│   ├── setup.sh                      ← 🆕 首次初始化
│   ├── deploy.sh                     ← 🆕 生产部署
│   └── backup-db.sh                  ← 🆕 数据库备份
│
└── ssl/                              ← Let's Encrypt 证书挂载（gitignored）
    ├── fullchain.pem
    └── privkey.pem
