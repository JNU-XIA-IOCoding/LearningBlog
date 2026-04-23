(() => {
  "use strict";

  const API_BASES = window.location.protocol === "file:"
    ? ["http://127.0.0.1:3001/api"]
    : [`${window.location.origin}/api`, "http://127.0.0.1:3001/api"];
  const RESET_VERSION = "2026-04-23-zero-md-v1";

  const state = {
    apiBase: "",
    aiItems: [],
    aiFilter: "all"
  };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isZh() {
    return localStorage.getItem("pblog_lang") === "zh";
  }

  async function request(path, init = {}) {
    const base = await resolveApiBase();
    if (!base) throw new Error("API unavailable");
    const headers = { ...(init.headers || {}) };
    if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json; charset=utf-8";
    const response = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error((data && data.error) || `HTTP ${response.status}`);
    return data;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async function resolveApiBase() {
    if (state.apiBase) return state.apiBase;
    for (const base of API_BASES) {
      try {
        await fetchJson(`${base}/health`);
        state.apiBase = base;
        return base;
      } catch {}
    }
    return "";
  }

  async function api(path) {
    return await request(path);
  }

  function resetLocalLearningState() {
    const zeroState = {
      posts: [],
      streak: 0,
      lastCk: null,
      ckDays: [],
      tasks: []
    };
    localStorage.setItem("pblog_v3", JSON.stringify(zeroState));
    localStorage.setItem("pblog_reset_version", RESET_VERSION);
  }

  function setText(ids, value) {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    });
  }

  function forceZeroStats() {
    setText(["h-posts", "q-posts"], 0);
    setText(["h-streak", "q-streak", "streak-num"], 0);
    const button = document.getElementById("checkin-btn");
    if (button) {
      button.disabled = false;
      button.textContent = isZh() ? "今日打卡" : "Check In Today";
    }
  }

  function emptyMessage() {
    return isZh() ? "从 0 篇 Markdown 学习笔记开始。" : "Start from 0 Markdown learning notes.";
  }

  function renderEmptyPosts() {
    const container = document.getElementById("blog-posts");
    if (!container) return;
    container.dataset.source = "backend";
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--c-bark-soft);font-family:var(--f-display);font-style:italic;font-size:1rem">
        ${esc(emptyMessage())}
      </div>
    `;
    const tagCloud = document.getElementById("tag-cloud");
    if (tagCloud) tagCloud.innerHTML = "";
    forceZeroStats();
  }

  function stripMarkdown(markdown) {
    return String(markdown || "")
      .replace(/^---[\s\S]*?---\s*/m, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_`>#-]/g, "")
      .trim();
  }

  function formatStars(value) {
    const n = Number(value || 0);
    if (!n) return "";
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  }

  function normalizeAi(item) {
    const type = String(item.type || "resource").toLowerCase();
    return {
      type: ["framework", "tool", "paper", "course", "resource"].includes(type) ? type : "resource",
      name: item.name || item.title || "Untitled Resource",
      desc: item.desc || item.description || item.summary || "",
      url: item.url || item.link || "#",
      stars: formatStars(item.stars)
    };
  }

  function renderAi(filter = state.aiFilter) {
    const grid = document.getElementById("ai-grid");
    if (!grid || !state.aiItems.length) return;
    state.aiFilter = filter;
    const items = filter === "all"
      ? state.aiItems
      : state.aiItems.filter((item) => item.type === filter);

    grid.dataset.source = "backend";
    grid.innerHTML = items.map((item) => `
      <div class="ai-card">
        <span class="ai-type-badge ai-type-badge--${esc(item.type)}">${esc(item.type)}</span>
        ${item.stars ? `<div class="ai-card__stars"><i class="fa-solid fa-star" style="color:#D4A84B;font-size:.58rem" aria-hidden="true"></i> ${esc(item.stars)}</div>` : ""}
        <h4 class="ai-card__title">${esc(item.name)}</h4>
        <p class="ai-card__desc">${esc(item.desc)}</p>
        <a class="ai-card__link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
          View Resource <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    `).join("");
  }

  function bindAiFilters() {
    const filters = document.getElementById("ai-filters");
    if (!filters || filters.dataset.backendBridge === "1") return;
    filters.dataset.backendBridge = "1";
    filters.addEventListener("click", (event) => {
      if (!state.aiItems.length) return;
      const button = event.target.closest(".ai-filter");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.querySelectorAll(".ai-filter").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderAi(button.dataset.filter || "all");
    }, true);
  }

  function renderPosts(posts) {
    const container = document.getElementById("blog-posts");
    if (!container || !Array.isArray(posts)) return;
    if (!posts.length) {
      renderEmptyPosts();
      return;
    }

    const locale = isZh() ? "zh-CN" : "en-US";
    container.dataset.source = "backend";
    container.innerHTML = posts.map((post) => {
      const date = post.created_at || post.updated_at || post.date || new Date().toISOString();
      const content = stripMarkdown(post.content || post.summary || "");
      const tags = Array.isArray(post.tags) ? post.tags : [];
      return `
        <article class="post-card" data-post-id="${esc(post.id)}">
          <div class="post-card__meta">
            <span class="post-card__date">${esc(new Date(date).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }))}</span>
            <span class="post-card__cat">${esc(post.category || "Learning")}</span>
          </div>
          <button class="post-card__title" type="button">${esc(post.title || "Untitled Note")}</button>
          <p class="post-card__excerpt">${esc(content.slice(0, 260))}${content.length > 260 ? "..." : ""}</p>
          <div class="post-card__foot">
            <span class="post-card__read">${isZh() ? "Markdown 数据库同步" : "Markdown synced to database"}</span>
            <div class="post-tags">${tags.slice(0, 4).map((tag) => `<span class="post-tag">${esc(tag)}</span>`).join("")}</div>
          </div>
        </article>
      `;
    }).join("");

    setText(["h-posts", "q-posts"], posts.length);
  }

  function updateStats(stats) {
    if (!stats) return;
    setText(["h-posts", "q-posts"], Number(stats.total_posts || 0));
  }

  function updateDatabaseNotice() {
    const notice = document.querySelector(".db-notice p");
    if (!notice) return;
    notice.innerHTML = isZh()
      ? "<strong>数据库已连接</strong> - 笔记以 Markdown 原文写入 PostgreSQL，当前从 0 days / 0 notes 开始。"
      : "<strong>Database Online</strong> - Notes are saved as Markdown in PostgreSQL. Current baseline is 0 days / 0 notes.";
  }

  function buildMarkdownNote() {
    const title = document.getElementById("p-title")?.value.trim() || "";
    const content = document.getElementById("p-content")?.value.trim() || "";
    const code = document.getElementById("p-code")?.value.trim() || "";
    const category = document.getElementById("p-cat")?.value || "Learning";
    const tags = (document.getElementById("p-tags")?.value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!title || !content) {
      throw new Error(isZh() ? "请填写标题和内容" : "Fill in title and content");
    }

    const frontMatter = [
      "---",
      `title: ${JSON.stringify(title)}`,
      `category: ${JSON.stringify(category)}`,
      `tags: [${tags.map((tag) => JSON.stringify(tag)).join(", ")}]`,
      `created_at: ${JSON.stringify(new Date().toISOString())}`,
      "format: markdown",
      "---"
    ].join("\n");

    const codeBlock = code ? `\n\n## Code\n\n\`\`\`\n${code}\n\`\`\`` : "";
    const markdown = `${frontMatter}\n\n# ${title}\n\n${content}${codeBlock}\n`;
    return {
      title,
      markdown,
      category,
      tags,
      summary: stripMarkdown(content).slice(0, 280)
    };
  }

  function clearEditor() {
    ["p-title", "p-content", "p-code", "p-tags"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  async function refreshPosts() {
    const posts = await api("/posts?limit=12");
    renderPosts(posts.posts || posts.items || posts || []);
    const stats = await api("/stats");
    updateStats(stats);
    forceZeroStatsIfEmpty(posts.posts || []);
  }

  function forceZeroStatsIfEmpty(posts) {
    if (Array.isArray(posts) && posts.length === 0) forceZeroStats();
  }

  function bindMarkdownSave() {
    const button = document.getElementById("modal-save");
    if (!button || button.dataset.markdownBridge === "1") return;
    button.dataset.markdownBridge = "1";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const payload = buildMarkdownNote();
        await request("/local/markdown-notes", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        clearEditor();
        document.getElementById("modal-overlay")?.classList.remove("is-open");
        document.body.style.overflow = "";
        await refreshPosts();
      } catch (error) {
        alert(error.message || String(error));
      }
    }, true);
  }

  function bindCheckinGuard() {
    const button = document.getElementById("checkin-btn");
    if (!button || button.dataset.backendBridge === "1") return;
    button.dataset.backendBridge = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(isZh() ? "已从 0 days 开始。打卡同步接口保留，当前基线已清零。" : "Baseline is reset to 0 days. Check-in sync remains available for the next iteration.");
      forceZeroStats();
    }, true);
  }

  async function boot() {
    resetLocalLearningState();
    window.setTimeout(forceZeroStats, 0);

    const base = await resolveApiBase();
    if (!base) {
      renderEmptyPosts();
      return;
    }

    updateDatabaseNotice();
    bindAiFilters();
    bindMarkdownSave();
    bindCheckinGuard();

    const [stats, resources, posts] = await Promise.allSettled([
      api("/stats"),
      api("/ai-resources?limit=60"),
      api("/posts?limit=12")
    ]);

    if (stats.status === "fulfilled") updateStats(stats.value);
    if (resources.status === "fulfilled" && Array.isArray(resources.value.items)) {
      state.aiItems = resources.value.items.map(normalizeAi);
      renderAi("all");
    }
    if (posts.status === "fulfilled") {
      const rows = posts.value.posts || posts.value.items || posts.value || [];
      renderPosts(rows);
      forceZeroStatsIfEmpty(rows);
    } else {
      renderEmptyPosts();
    }

    const langButton = document.getElementById("lang-btn");
    if (langButton) {
      langButton.addEventListener("click", () => {
        window.setTimeout(() => {
          updateDatabaseNotice();
          renderAi(state.aiFilter);
          refreshPosts().catch(() => renderEmptyPosts());
        }, 80);
      }, true);
    }
  }

  function ready() {
    window.setTimeout(() => {
      boot().catch((error) => console.warn("[phoenix-backend] bridge failed", error));
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();
