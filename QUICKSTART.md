# Phoenix Blog — Claude Code Quick Start
# ════════════════════════════════════════

## 第一步：确认前置条件

- [ ] Node.js 20+ 已安装
- [ ] Docker Desktop 已安装并运行
- [ ] Git 已安装
- [ ] 已有域名（Phase 8 SSL 需要，开发阶段可跳过）
- [ ] Claude Code 已安装：`npm install -g @anthropic-ai/claude-code`

## 第二步：启动 Claude Code

```bash
# 进入此 zip 解压后的目录
cd phoenix-blog-claude-code

# 启动 Claude Code（会自动读取 CLAUDE.md）
claude

# Claude Code 会问：要执行哪个 Phase？
# 回复：全部按顺序执行 Phase 0 到 Phase 10
```

## 第三步：中途监控

每个 Phase 结束时都有"检查点"，Claude Code 会自动运行验证命令。
如果失败，它会自动尝试修复并继续。

## 第四步：最终验收

执行完成后：
1. 打开 http://localhost — 应看到与 existing/frontend/index.html 完全一致的视觉
2. 打开 http://localhost/admin — 输入 admin / phoenix2026 登录
3. 写一篇日志，验证保存到数据库

## 常见问题

**Q: Docker 端口冲突**
A: 修改 docker-compose.yml 中的端口映射，如 `"8080:80"`

**Q: PostgreSQL 连接失败**
A: 确认 Docker Desktop 正在运行，等待健康检查通过后再继续

**Q: 前端样式与 existing 不一致**
A: 将 existing/frontend/index.html 的 `<style>` 内容完整复制到 frontend/src/styles/tokens.css

---

## 现有文件索引

```
existing/frontend/index.html   ← 视觉基准，所有样式从此提取
existing/backend/server.js     ← API 实现参考
existing/backend/db/schema.sql ← 数据库表结构
existing/docker-compose.yml    ← 容器编排基础
existing/nginx.conf            ← Nginx 基础配置
docs/AUDIT_PLAN.md             ← 性能审计报告（v3 改进记录）
```

---

## 技术栈一览

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React | 18 |
| 构建工具 | Vite | 5 |
| 语言 | TypeScript | 5 |
| 状态管理 | Zustand | 4 |
| 数据请求 | TanStack Query | 5 |
| 路由 | React Router | 6 |
| 动画 | Framer Motion | 11 |
| 后端框架 | Express | 4 |
| 运行时 | Node.js | 20 |
| 数据库 | PostgreSQL | 16 |
| 认证 | JWT + bcrypt | — |
| 图片处理 | Sharp | — |
| 容器 | Docker + Alpine | — |
| 反向代理 | Nginx | Alpine |
| SSL | Let's Encrypt | — |
