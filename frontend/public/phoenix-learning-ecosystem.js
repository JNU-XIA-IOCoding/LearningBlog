(() => {
  "use strict";

  const API_BASES = location.protocol === "file:"
    ? ["http://127.0.0.1:3001/api"]
    : [`${location.origin}/api`, "http://127.0.0.1:3001/api"];

  const state = {
    apiBase: "",
    dashboard: null,
    activeDay: 1,
    resourceTopic: "all"
  };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectStyles() {
    if (document.getElementById("phoenix-learning-ecosystem-style")) return;
    const style = document.createElement("style");
    style.id = "phoenix-learning-ecosystem-style";
    style.textContent = `
      .px-eco {
        margin-top: 2rem;
        display: grid;
        gap: 1rem;
      }
      .px-eco-panel {
        border: 1px solid rgba(232, 160, 160, .34);
        background: rgba(255, 252, 247, .54);
        backdrop-filter: blur(7px) saturate(1.08);
        -webkit-backdrop-filter: blur(7px) saturate(1.08);
        padding: 1rem;
        box-shadow: 0 10px 28px rgba(71, 43, 31, .08);
      }
      .px-eco-title {
        margin: 0 0 .7rem;
        font-family: var(--f-display);
        font-size: 1.05rem;
        color: var(--c-bark);
      }
      .section--dark .px-eco-title { color: var(--c-cream); }
      .px-eco-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: .75rem;
      }
      .px-eco-stat {
        border: 1px solid rgba(232, 160, 160, .26);
        background: rgba(255, 255, 255, .36);
        padding: .75rem;
      }
      .px-eco-stat strong {
        display: block;
        font-family: var(--f-display);
        font-size: 1.45rem;
        color: var(--c-rose);
      }
      .px-eco-stat span {
        font-size: .76rem;
        color: var(--c-bark-soft);
      }
      .px-resource-form,
      .px-task-row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: .55rem;
        align-items: center;
      }
      .px-resource-form textarea {
        grid-column: 1 / -1;
        min-height: 72px;
      }
      .px-resource-form input,
      .px-resource-form select,
      .px-resource-form textarea,
      .px-task-row input,
      .px-day-note {
        width: 100%;
        border: 1px solid rgba(232, 160, 160, .34);
        background: rgba(255, 255, 255, .68);
        padding: .65rem .72rem;
        font: inherit;
        color: var(--c-bark);
      }
      .px-resource-form button,
      .px-day-card button,
      .px-task-row button,
      .px-resource-card a,
      .px-eco-action {
        border: 1px solid rgba(232, 160, 160, .44);
        background: rgba(255, 252, 247, .72);
        color: var(--c-bark);
        padding: .62rem .86rem;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
      }
      .px-resource-form button:hover,
      .px-day-card button:hover,
      .px-task-row button:hover,
      .px-resource-card a:hover,
      .px-eco-action:hover {
        border-color: var(--c-rose);
      }
      .px-days {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: .55rem;
      }
      .px-day-card {
        border: 1px solid rgba(232, 160, 160, .26);
        background: rgba(255, 252, 247, .50);
        padding: .72rem;
        min-height: 132px;
        display: grid;
        gap: .45rem;
      }
      .px-day-card.is-active {
        border-color: var(--c-rose);
        background: rgba(255, 252, 247, .78);
      }
      .px-day-card.is-done {
        background: rgba(235, 248, 239, .72);
      }
      .px-day-card small {
        color: var(--c-bark-soft);
      }
      .px-day-card h4 {
        margin: 0;
        font-size: .88rem;
        line-height: 1.35;
      }
      .px-day-detail {
        display: grid;
        grid-template-columns: 1.1fr .9fr;
        gap: 1rem;
      }
      .px-detail-copy {
        display: grid;
        gap: .65rem;
        color: var(--c-bark);
        line-height: 1.7;
      }
      .px-detail-copy h3 {
        margin: 0;
        font-family: var(--f-display);
        font-size: 1.3rem;
      }
      .px-resource-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: .75rem;
      }
      .px-resource-card {
        border: 1px solid rgba(232, 160, 160, .24);
        background: rgba(255, 252, 247, .52);
        padding: .8rem;
        display: grid;
        gap: .55rem;
      }
      .px-resource-card h4 {
        margin: 0;
        font-size: .92rem;
      }
      .px-resource-card p {
        margin: 0;
        color: var(--c-bark-soft);
        font-size: .8rem;
        line-height: 1.6;
      }
      .px-tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: .35rem;
      }
      .px-tag {
        border: 1px solid rgba(232, 160, 160, .30);
        background: rgba(255,255,255,.34);
        padding: .15rem .42rem;
        font-size: .68rem;
        color: var(--c-bark-soft);
      }
      .px-task-list {
        display: grid;
        gap: .45rem;
      }
      .px-task-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: .55rem;
        align-items: center;
        border: 1px solid rgba(232, 160, 160, .22);
        background: rgba(255,255,255,.40);
        padding: .52rem;
      }
      .px-task-item.is-done span {
        text-decoration: line-through;
        opacity: .58;
      }
      .px-empty {
        color: var(--c-bark-soft);
        font-style: italic;
        padding: .75rem 0;
      }
      @media (max-width: 920px) {
        .px-eco-grid,
        .px-resource-list,
        .px-day-detail {
          grid-template-columns: 1fr;
        }
        .px-days {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .px-resource-form,
        .px-task-row {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function resolveApiBase() {
    if (state.apiBase) return state.apiBase;
    for (const base of API_BASES) {
      try {
        const response = await fetch(`${base}/health`, { cache: "no-store" });
        if (response.ok) {
          state.apiBase = base;
          return base;
        }
      } catch {}
    }
    return "";
  }

  async function request(path, init = {}) {
    const base = await resolveApiBase();
    if (!base) throw new Error("Backend API unavailable");
    const headers = { ...(init.headers || {}) };
    if (init.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json; charset=utf-8";
    }
    const response = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error((data && data.error) || `HTTP ${response.status}`);
    return data;
  }

  function progressMap() {
    const map = new Map();
    (state.dashboard?.progress || []).forEach((item) => map.set(Number(item.day_number), item));
    return map;
  }

  function resourcesForDay(day) {
    return (state.dashboard?.resources || []).filter((item) => Number(item.day_number) === Number(day));
  }

  function renderDashboardShell() {
    const learningInner = document.querySelector("#learning .section__inner");
    if (learningInner && !document.getElementById("px-learning-dashboard")) {
      const node = document.createElement("div");
      node.id = "px-learning-dashboard";
      node.className = "px-eco reveal";
      learningInner.appendChild(node);
    }

    const roadmapInner = document.querySelector("#roadmap .section__inner");
    if (roadmapInner && !document.getElementById("px-plan-dashboard")) {
      const node = document.createElement("div");
      node.id = "px-plan-dashboard";
      node.className = "px-eco reveal";
      roadmapInner.appendChild(node);
    }
  }

  function renderLearningDashboard() {
    const root = document.getElementById("px-learning-dashboard");
    if (!root || !state.dashboard) return;
    const summary = state.dashboard.summary || {};
    const percent = Math.round((Number(summary.done_days || 0) / Math.max(Number(summary.total_days || 14), 1)) * 100);
    root.innerHTML = `
      <section class="px-eco-panel">
        <h3 class="px-eco-title">Interactive Learning Dashboard</h3>
        <div class="px-eco-grid">
          <div class="px-eco-stat"><strong>${esc(summary.done_days || 0)}/14</strong><span>14-day sprint progress</span></div>
          <div class="px-eco-stat"><strong>${esc(percent)}%</strong><span>speedrun completion</span></div>
          <div class="px-eco-stat"><strong>${esc(summary.resources || 0)}</strong><span>uploaded learning resources</span></div>
          <div class="px-eco-stat"><strong>${esc(summary.open_tasks || 0)}</strong><span>open project tasks</span></div>
        </div>
      </section>
      <section class="px-eco-panel">
        <h3 class="px-eco-title">Upload Learning Resource</h3>
        <form class="px-resource-form" id="px-resource-form">
          <input name="title" required placeholder="Resource title" />
          <input name="url" placeholder="Link, optional when uploading a file" />
          <select name="day_number">
            ${Array.from({ length: 14 }, (_, i) => `<option value="${i + 1}">Day ${i + 1}</option>`).join("")}
          </select>
          <select name="topic">
            <option value="agents">agents</option>
            <option value="prompting">prompting</option>
            <option value="rag">rag</option>
            <option value="backend">backend</option>
            <option value="database">database</option>
            <option value="deployment">deployment</option>
            <option value="general">general</option>
          </select>
          <select name="difficulty">
            <option value="beginner">beginner</option>
            <option value="intermediate">intermediate</option>
            <option value="advanced">advanced</option>
          </select>
          <input name="tags" placeholder="tags, comma separated" />
          <input name="file" type="file" />
          <textarea name="description" placeholder="Why this resource matters"></textarea>
          <button type="submit">Upload / Save Resource</button>
        </form>
      </section>
    `;
    document.getElementById("px-resource-form")?.addEventListener("submit", handleResourceUpload);
  }

  function renderPlanDashboard() {
    const root = document.getElementById("px-plan-dashboard");
    if (!root || !state.dashboard) return;
    const days = state.dashboard.plan || [];
    const map = progressMap();
    const active = days.find((day) => Number(day.day_number) === Number(state.activeDay)) || days[0];
    if (!active) return;
    const activeProgress = map.get(Number(active.day_number));
    const activeResources = resourcesForDay(active.day_number);
    root.innerHTML = `
      <section class="px-eco-panel">
        <h3 class="px-eco-title">14-Day AI Agent Speedrun</h3>
        <div class="px-days">
          ${days.map((day) => {
            const progress = map.get(Number(day.day_number));
            const done = progress?.status === "done";
            const activeClass = Number(day.day_number) === Number(state.activeDay) ? " is-active" : "";
            return `
              <article class="px-day-card${activeClass}${done ? " is-done" : ""}" data-day="${esc(day.day_number)}">
                <small>Day ${esc(day.day_number)} · ${esc(day.estimated_minutes || 90)} min</small>
                <h4>${esc(day.title)}</h4>
                <small>${esc(day.focus)}</small>
                <button type="button" data-action="open-day" data-day="${esc(day.day_number)}">${done ? "Review" : "Open"}</button>
              </article>
            `;
          }).join("")}
        </div>
      </section>
      <section class="px-eco-panel">
        <div class="px-day-detail">
          <div class="px-detail-copy">
            <h3>Day ${esc(active.day_number)} · ${esc(active.title)}</h3>
            <div><strong>Knowledge:</strong> ${esc(active.knowledge)}</div>
            <div><strong>Deep dive:</strong> ${esc(active.deep_dive)}</div>
            <div><strong>Practice:</strong> ${esc(active.practice)}</div>
            <div><strong>Deliverable:</strong> ${esc(active.deliverable)}</div>
            <textarea class="px-day-note" id="px-day-note" rows="4" placeholder="Save your notes for this day">${esc(activeProgress?.notes || "")}</textarea>
            <div class="px-tag-row">
              <button class="px-eco-action" data-action="mark-active" data-day="${esc(active.day_number)}">Mark In Progress</button>
              <button class="px-eco-action" data-action="mark-done" data-day="${esc(active.day_number)}">Complete Day</button>
            </div>
          </div>
          <div>
            <h3 class="px-eco-title">Day Resources</h3>
            <div class="px-resource-list">
              ${activeResources.length ? activeResources.map(renderResourceCard).join("") : `<div class="px-empty">No resources for this day yet. Upload one above.</div>`}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderResourceCard(item) {
    const href = item.file_url || item.url || "#";
    const tags = Array.isArray(item.tags) ? item.tags : [];
    return `
      <article class="px-resource-card">
        <h4>${esc(item.title)}</h4>
        <p>${esc(item.description || "Learning resource")}</p>
        <div class="px-tag-row">
          <span class="px-tag">${esc(item.kind || "link")}</span>
          <span class="px-tag">${esc(item.topic || "general")}</span>
          ${tags.slice(0, 3).map((tag) => `<span class="px-tag">${esc(tag)}</span>`).join("")}
        </div>
        <a href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open Resource</a>
      </article>
    `;
  }

  function renderTasks() {
    const list = document.getElementById("task-list");
    if (!list || !state.dashboard) return;
    const tasks = state.dashboard.tasks || [];
    list.className = "px-task-list";
    list.innerHTML = tasks.length
      ? tasks.map((task) => `
          <label class="px-task-item${task.done ? " is-done" : ""}">
            <input type="checkbox" data-task-id="${esc(task.id)}" ${task.done ? "checked" : ""} />
            <span>${esc(task.text)}</span>
            <small>${esc(task.priority || "mid")}</small>
          </label>
        `).join("")
      : `<div class="px-empty">No project tasks yet.</div>`;
  }

  function renderCheckins() {
    const summary = state.dashboard?.summary || {};
    const checkins = state.dashboard?.checkins || [];
    const streakNum = document.getElementById("streak-num");
    const qStreak = document.getElementById("q-streak");
    if (streakNum) streakNum.textContent = String(summary.streak || 0);
    if (qStreak) qStreak.textContent = String(summary.streak || 0);
    const qDone = document.getElementById("q-done");
    if (qDone) qDone.textContent = String(summary.completed_tasks || 0);
    const cal = document.getElementById("cal-grid");
    if (cal) {
      const set = new Set(checkins.map((x) => String(x).slice(0, 10)));
      const today = new Date();
      cal.innerHTML = Array.from({ length: 35 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (34 - index));
        const key = date.toISOString().slice(0, 10);
        return `<span class="cal-day${set.has(key) ? " is-done" : ""}" title="${esc(key)}"></span>`;
      }).join("");
    }
  }

  async function handleResourceUpload(event) {
    event.preventDefault();
    if (state.dashboard?.readonly) {
      alert("Open the local site on this computer to upload resources.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await request("/local/learning/resources", { method: "POST", body: data });
      form.reset();
      await refresh();
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  async function updateDay(day, status) {
    if (state.dashboard?.readonly) {
      alert("Open the local site on this computer to save progress.");
      return;
    }
    const note = document.getElementById("px-day-note")?.value || "";
    await request(`/local/learning/progress/${day}`, {
      method: "PUT",
      body: JSON.stringify({ status, notes: note })
    });
    await refresh();
  }

  function bindGlobalActions() {
    document.addEventListener("click", async (event) => {
      const actionNode = event.target.closest("[data-action]");
      if (!actionNode) return;
      const action = actionNode.dataset.action;
      const day = Number(actionNode.dataset.day || 1);
      if (action === "open-day") {
        state.activeDay = day;
        renderPlanDashboard();
      }
      if (action === "mark-active" || action === "mark-done") {
        event.preventDefault();
        await updateDay(day, action === "mark-done" ? "done" : "active");
      }
    });
  }

  function bindTasks() {
    const list = document.getElementById("task-list");
    if (list && list.dataset.pxBound !== "1") {
      list.dataset.pxBound = "1";
      list.addEventListener("change", async (event) => {
        const input = event.target.closest("input[data-task-id]");
        if (!input) return;
        await request(`/local/tasks/${input.dataset.taskId}`, {
          method: "PUT",
          body: JSON.stringify({ done: input.checked })
        });
        await refresh();
      });
    }

    const oldButton = document.getElementById("add-task-btn");
    if (oldButton && oldButton.dataset.pxBound !== "1") {
      const button = oldButton.cloneNode(true);
      button.dataset.pxBound = "1";
      oldButton.replaceWith(button);
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const input = document.getElementById("task-input");
        const priority = document.getElementById("task-pri");
        const text = input?.value?.trim();
        if (!text) return;
        if (state.dashboard?.readonly) {
          alert("Open the local site on this computer to add tasks.");
          return;
        }
        await request("/local/tasks", {
          method: "POST",
          body: JSON.stringify({ text, priority: priority?.value || "mid" })
        });
        input.value = "";
        await refresh();
      });
    }
  }

  function bindCheckin() {
    const oldButton = document.getElementById("checkin-btn");
    if (!oldButton || oldButton.dataset.pxBound === "1") return;
    const button = oldButton.cloneNode(true);
    button.dataset.pxBound = "1";
    button.textContent = "Check In Today";
    oldButton.replaceWith(button);
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (state.dashboard?.readonly) {
        alert("Open the local site on this computer to check in.");
        return;
      }
      try {
        await request("/local/checkin", { method: "POST", body: JSON.stringify({}) });
        await refresh();
      } catch (error) {
        alert(error.message || String(error));
      }
    });
  }

  async function refresh() {
    try {
      state.dashboard = await request("/local/learning/dashboard");
    } catch {
      state.dashboard = await request("/learning/dashboard");
    }
    renderLearningDashboard();
    renderPlanDashboard();
    renderTasks();
    renderCheckins();
    bindTasks();
    bindCheckin();
  }

  async function boot() {
    injectStyles();
    renderDashboardShell();
    bindGlobalActions();
    try {
      await refresh();
    } catch (error) {
      console.warn("[phoenix-learning] ecosystem unavailable", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(boot, 180), { once: true });
  } else {
    window.setTimeout(boot, 180);
  }
})();
