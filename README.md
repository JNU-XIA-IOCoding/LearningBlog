# Phoenix Blog 全栈工程

## 当前状态
- 前后端、数据库、管理后台、上传系统、PWA 已打通
- 本地容器已运行：`frontend + backend + db`
- 支持免费分享链接（无需购买域名）
- 支持后续正式域名 HTTPS 上线（Caddy 自动证书）

## 画质说明（已按要求）
- 壁纸默认 `Original Quality` 原画质模式
- 透明度固定 `0.4`
- 不做后端重编码
- 静态媒体响应头带 `no-transform`
- 支持原图/原视频全屏预览

## 本地开发启动
```bash
docker-compose up --build -d
```

访问：
- 前端：`http://localhost:5173`
- 后端健康：`http://localhost:3001/api/health`
- 深度健康：`http://localhost:3001/api/health/deep`

管理员：
- 用户名：`admin`
- 密码：`phoenix2026`

## 免费分享（稳定推荐）
一键启动稳定免费通道（Cloudflare Quick Tunnel）：
```bash
powershell -ExecutionPolicy Bypass -File scripts/share-free-stable.ps1 -Tag jnu-xia
```

脚本会输出两条地址：
- Tunnel URL（真实可访问）
- Branded URL（带 `jnu-xia` 路径标识）

并保存到：`ops/active-share-url.txt`

## 旧版免费方案（不稳定）
- `loca.lt` 子域偶发 `Tunnel Unavailable`，已不推荐作为主分享链路。

## 正式域名上线（后续）
购买域名后可一键部署：
```bash
powershell -ExecutionPolicy Bypass -File scripts/deploy-guided.ps1
```

## 常用脚本
- 壁纸同步：`scripts/sync-wallpapers.ps1`
- 数据库备份：`scripts/backup-db.ps1`
- 依赖初始化：`scripts/bootstrap.ps1`
- 免费分享稳定版：`scripts/share-free-stable.ps1`

## 能力清单
- 学习日志发布、草稿、分类
- AI 学习资源库（搜索、筛选、收藏）
- 专注计时会话（开始/完成/统计）
- 路线图模板（AI Agent / Full-Stack / Backend）
- 用户与权限管理
- 内容审核与媒体资产管理
- 移动端 PWA 安装

## CI
- `.github/workflows/ci.yml`
- 自动检查后端 TypeScript 与前端生产构建
