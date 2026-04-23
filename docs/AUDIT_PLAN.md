# Phoenix Blog — v3 升级计划书
# 标准网站开发全流程 · Standard Web Dev Workflow

---

## 一、现状审计 (Audit)

| 维度 | 当前值 | 目标值 | 问题描述 |
|------|--------|--------|---------|
| 文件大小 | 452 KB | < 90 KB | Base64图片占83.6%，阻塞HTML解析 |
| CSS规则块 | 231块 | < 160块 | 重复选择器22处，transition:all 2处 |
| 内联onclick | 36处 | 0处 | 违反关注点分离，无法统一管理 |
| 内联style | 36处 | < 8处 | 样式散落，维护困难 |
| 动画帧率 | 未限制 | ≤ 30fps | 粒子动画无帧率上限，CPU占用高 |
| 图片加载 | 阻塞式 | 懒加载 | 5张base64同步嵌入，首屏阻塞 |
| JS架构 | 全局变量 | 模块模式 | 函数直接挂window，容易冲突 |
| setInterval | 未清理 | 清理注册 | 幻灯片计时器无销毁机制 |
| 粒子对象 | 无对象池 | 对象池复用 | 35个Petal对象频繁GC |
| 覆盖层透明度 | ~0.55 | 0.4 | 照片中人物显示不够清晰 |

---

## 二、需求规划 (Requirements)

### 必须修复 (P0)
- [ ] 覆盖层透明度 → 0.4，人物清晰可见
- [ ] 图片异步加载：DOMContentLoaded后解码，不阻塞首屏
- [ ] 移除所有inline onclick → 事件委托
- [ ] transition:all → 具体属性(transform,opacity,background-color)
- [ ] 粒子帧率限制 ≤ 30fps，节省CPU
- [ ] 粒子对象池，避免GC抖动

### 重要改进 (P1)
- [ ] CSS去重，清理冗余规则
- [ ] CSS containment: layout paint 应用到卡片
- [ ] will-change 精准控制（仅hover动画元素）
- [ ] 字体加载优化：font-display:optional 降级字体
- [ ] 幻灯片：图片预加载队列 + 错误降级
- [ ] i18n 补全所有节点，包括title标签
- [ ] roadmap 双列布局移动端折叠
- [ ] IntersectionObserver统一管理，避免重复实例

### 体验升级 (P2)
- [ ] 页面加载进度条（细线，顶部）
- [ ] 图片加载占位符（优雅的淡入）
- [ ] 键盘导航支持（tab键、esc键）
- [ ] 减少动态效果选项 prefers-reduced-motion
- [ ] 打印样式 @media print
- [ ] meta description, OG标签

---

## 三、架构设计 (Architecture)

### HTML结构
```
<head>
  preconnect → 字体CDN
  preload → 关键CSS字体(critical only)
  <style>  ← 关键CSS内联(首屏)
  meta OG/description
</head>
<body>
  [loading bar]
  [nav]
  [hero + slideshow]    ← 图片异步注入
  [about]
  [learning]
  [ai-agents]
  [journal]
  [roadmap]
  [footer]
  [modals]
  [detail-panel]
  <script defer>  ← 全部JS延迟执行
</body>
```

### JS模块划分
```
App {
  Config      ← 常量、数据集中管理
  State       ← localStorage统一接口
  I18n        ← 翻译系统
  Slideshow   ← 图片轮播(异步加载)
  Sakura      ← 粒子系统(对象池+帧率控制)
  Nav         ← 导航(滚动高亮,汉堡菜单)
  Modules     ← 学习模块渲染
  AI          ← AI资源渲染
  Journal     ← 日志CRUD
  Tasks       ← 任务管理
  Streak      ← 打卡日历
  Theme       ← 深色模式
  UI          ← Toast, Modal, Panel(事件委托)
}
```

### CSS架构
```
1. Custom Properties (设计token)
2. Reset + Base
3. Layout primitives (section, grid, flex)
4. Components (nav, hero, card, modal...)
5. Utilities (reveal, tag, badge...)
6. Dark mode (prefers-color-scheme + .dark class)
7. Reduced motion (@media prefers-reduced-motion)
8. Print (@media print)
```

---

## 四、性能目标 (Metrics)

| 指标 | 当前 | 目标 |
|------|------|------|
| HTML大小(gzip后) | ~85KB | <35KB |
| 首屏渲染时间 | ~600ms | <200ms |
| 粒子CPU占用 | ~8% | <2% |
| 动画流畅度 | 卡顿 | 稳定30fps |
| Lighthouse性能 | ~55 | >90 |
| 无JS可用性 | 完全不可用 | 基础内容可见 |

---

## 五、实施顺序 (Execution Order)

```
Step 1: 设计系统 CSS — token / reset / layout
Step 2: 关键渲染路径 — nav / hero / photo overlay(0.4)
Step 3: 异步图片系统 — base64→ObjectURL懒加载
Step 4: 粒子系统重写 — 对象池+帧率控制
Step 5: 组件CSS — module cards / ai cards / blog / roadmap
Step 6: JS架构 — App模块 / State / I18n
Step 7: 渲染函数 — modules / ai / journal / tasks / streak
Step 8: 事件系统 — 委托 / 键盘 / 减少动效
Step 9: 内容数据 — 完整modules / ai_res数据
Step 10: 后处理 — meta / prefers-reduced-motion / print
```
