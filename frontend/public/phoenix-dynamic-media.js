(() => {
  "use strict";

  const SECTION_MAP = [
    { id: "home", key: "hero", type: "hero" },
    { id: "about", key: "about", type: "section" },
    { id: "learning", key: "learning", type: "section" },
    { id: "ai-agents", key: "ai", type: "section" },
    { id: "journal", key: "journal", type: "section" },
    { id: "roadmap", key: "roadmap", type: "section" }
  ];

  const SECTION_KEYS = SECTION_MAP.map((x) => x.key);
  const STATIC_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:5173" : "";
  const API_BASES = window.location.protocol === "file:"
    ? ["http://127.0.0.1:3001/api"]
    : [`${window.location.origin}/api`, "http://127.0.0.1:3001/api"];
  const IMAGE_INTERVAL_MS = 11000;
  const activeSources = new Map();

  function injectStyles() {
    if (document.getElementById("phoenix-dynamic-media-style")) return;
    const style = document.createElement("style");
    style.id = "phoenix-dynamic-media-style";
    style.textContent = `
      html,
      body {
        max-width: 100%;
        overflow-x: hidden;
      }
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }
      .hero {
        width: 100%;
        min-height: 100vh;
        min-height: 100svh;
      }
      .slideshow,
      .slideshow__slide {
        width: 100%;
        height: 100%;
        min-width: 0;
      }
      .slideshow__slide {
        background-size: cover !important;
        background-position: center center !important;
      }
      .slideshow__slide.phoenix-media-video {
        background-image: none !important;
        overflow: hidden;
      }
      .slideshow__slide.phoenix-media-video video {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        min-width: 100%;
        min-height: 100%;
        object-fit: cover;
        object-position: center center;
        display: block;
        filter: none;
        transform: translate3d(-50%, -50%, 0);
        background: transparent;
      }
      .section {
        overflow: hidden;
        isolation: isolate;
      }
      .section > .section__inner {
        position: relative;
        z-index: 2;
        width: min(100%, var(--max-w));
      }
      .phoenix-section-media {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
        opacity: .62;
        background: transparent;
        contain: layout paint;
      }
      .mod-card,
      .post-card,
      .widget,
      .rm-task,
      .stat-box,
      .search-input,
      .write-btn,
      .detail-panel,
      .modal,
      .tag,
      .skill-pill,
      .post-tag {
        background-color: rgba(255, 252, 247, .58) !important;
        border-color: rgba(232, 160, 160, .34) !important;
        backdrop-filter: blur(7px) saturate(1.08);
        -webkit-backdrop-filter: blur(7px) saturate(1.08);
      }
      .mod-card:hover,
      .post-card:hover,
      .widget:hover,
      .rm-task:hover,
      .write-btn:hover {
        background-color: rgba(255, 252, 247, .70) !important;
      }
      .social-btn,
      .btn--ghost,
      .ai-filter,
      .post-card__read,
      .ai-card__link {
        background-color: rgba(255, 252, 247, .20) !important;
        border-color: rgba(232, 160, 160, .42) !important;
        backdrop-filter: blur(5px) saturate(1.08);
        -webkit-backdrop-filter: blur(5px) saturate(1.08);
      }
      .social-btn:hover,
      .btn--ghost:hover,
      .ai-filter:hover,
      .ai-filter.is-active {
        background-color: rgba(255, 252, 247, .48) !important;
      }
      .ai-card {
        background: rgba(37, 25, 20, .42) !important;
        border-color: rgba(244, 194, 194, .24) !important;
        backdrop-filter: blur(7px) saturate(1.08);
        -webkit-backdrop-filter: blur(7px) saturate(1.08);
      }
      .ai-card:hover {
        background: rgba(37, 25, 20, .54) !important;
      }
      .section--dark .ai-filter {
        background-color: rgba(255, 255, 255, .08) !important;
      }
      .section--dark .ai-filter.is-active {
        background-color: rgba(244, 194, 194, .50) !important;
      }
      .progress-track,
      .cal-day {
        background-color: rgba(253, 232, 232, .44) !important;
      }
      .badge,
      .post-card__cat,
      .ai-type-badge {
        background-color: rgba(255, 252, 247, .46) !important;
      }
      .phoenix-section-media__item {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transform: translateZ(0);
        transition: opacity 1.2s var(--ease);
        will-change: opacity;
        filter: none;
      }
      .phoenix-section-media__item.is-active {
        opacity: 1;
      }
      .phoenix-section-media__item--image {
        background-size: cover;
        background-position: center center;
        background-repeat: no-repeat;
      }
      video.phoenix-section-media__item {
        object-fit: cover;
        object-position: center center;
        display: block;
        background: transparent;
      }
      .phoenix-section-media__veil {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: none;
        opacity: 0;
      }
      @media (max-width: 900px) {
        .hero__content {
          max-width: min(92vw, 640px);
          padding-left: clamp(1rem, 4vw, 1.5rem);
          padding-right: clamp(1rem, 4vw, 1.5rem);
        }
        .hero__stats {
          gap: clamp(.75rem, 4vw, 2.5rem);
          flex-wrap: wrap;
        }
        .section {
          padding-left: clamp(1rem, 5vw, 1.5rem);
          padding-right: clamp(1rem, 5vw, 1.5rem);
        }
      }
      @media (max-width: 720px) {
        .slideshow__slide.phoenix-media-video video,
        video.phoenix-section-media__item {
          object-fit: cover;
          object-position: center center;
        }
        .phoenix-section-media {
          opacity: .58;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function stripLocalAssetHost(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      const url = new URL(value);
      const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
      const assetPath = url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/wallpapers/");
      if (local && assetPath) return url.pathname;
    } catch {
      return value;
    }
    return value;
  }

  function assetUrl(raw) {
    const src = stripLocalAssetHost(raw);
    if (!src) return "";
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${STATIC_BASE}${encodeURI(path)}`;
  }

  function isVideo(src) {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(stripLocalAssetHost(src));
  }

  function normalizeEntry(entry) {
    if (!entry) return null;
    const raw = typeof entry === "string"
      ? entry
      : entry.path || entry.file_url || entry.url || entry.src || "";
    const source = stripLocalAssetHost(raw);
    if (!source) return null;
    return {
      source,
      url: assetUrl(source),
      kind: typeof entry === "object" && entry.kind ? String(entry.kind) : (isVideo(source) ? "video" : "image")
    };
  }

  function normalizeList(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map(normalizeEntry)
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.source)) return false;
        seen.add(item.source);
        return true;
      });
  }

  function rotate(list, offset) {
    if (!list.length) return [];
    return list.map((_, index) => list[(index + offset) % list.length]);
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadStaticConfig() {
    const sections = await fetchJson(`${STATIC_BASE}/wallpapers/sections.json`);
    if (sections && typeof sections === "object") {
      const config = {};
      SECTION_KEYS.forEach((key, index) => {
        const list = normalizeList(sections[key]);
        config[key] = list.length ? list : [];
        if (!config[key].length && key !== "hero") {
          config[key] = rotate(config.hero || [], index);
        }
      });
      return config;
    }

    const manifest = normalizeList(await fetchJson(`${STATIC_BASE}/wallpapers/manifest.json`));
    const config = {};
    SECTION_KEYS.forEach((key, index) => {
      config[key] = rotate(manifest, index);
    });
    return config;
  }

  async function loadApiSelection() {
    for (const base of API_BASES) {
      const data = await fetchJson(`${base}/wallpapers`);
      const selection = data && data.selection ? data.selection : null;
      if (!selection) continue;
      const config = {};
      let hasAny = false;
      SECTION_KEYS.forEach((key) => {
        config[key] = normalizeList(selection[key]);
        if (config[key].length) hasAny = true;
      });
      if (hasAny) return config;
    }
    return null;
  }

  async function loadConfig() {
    const staticConfig = await loadStaticConfig();
    const apiConfig = await loadApiSelection();
    if (!apiConfig) return staticConfig;

    const merged = {};
    SECTION_KEYS.forEach((key, index) => {
      merged[key] = apiConfig[key] && apiConfig[key].length
        ? apiConfig[key]
        : (staticConfig[key] && staticConfig[key].length ? staticConfig[key] : rotate(staticConfig.hero || [], index));
    });
    return merged;
  }

  function randomNext(list, current, playerId) {
    if (list.length <= 1) return 0;
    const busy = new Set(
      [...activeSources.entries()]
        .filter(([key]) => key !== playerId)
        .map(([, value]) => value)
    );
    let candidates = list
      .map((_, index) => index)
      .filter((index) => index !== current && !busy.has(list[index].source));

    if (!candidates.length) {
      candidates = list.map((_, index) => index).filter((index) => index !== current);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function createHeroNode(item, index) {
    const slide = document.createElement("div");
    slide.className = `slideshow__slide${item.kind === "video" ? " phoenix-media-video" : ""}${index === 0 ? " is-active" : ""}`;
    slide.dataset.source = item.source;
    if (item.kind === "video") {
      const video = document.createElement("video");
      video.src = item.url;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      slide.appendChild(video);
    } else {
      slide.style.backgroundImage = `url("${item.url.replace(/"/g, "%22")}")`;
    }
    return slide;
  }

  function createSectionNode(item, index) {
    if (item.kind === "video") {
      const video = document.createElement("video");
      video.className = `phoenix-section-media__item${index === 0 ? " is-active" : ""}`;
      video.dataset.source = item.source;
      video.src = item.url;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      return video;
    }

    const image = document.createElement("div");
    image.className = `phoenix-section-media__item phoenix-section-media__item--image${index === 0 ? " is-active" : ""}`;
    image.dataset.source = item.source;
    image.style.backgroundImage = `url("${item.url.replace(/"/g, "%22")}")`;
    return image;
  }

  function makePlayer({ id, list, nodes, dots, onChange, autoplay = true }) {
    let current = 0;
    let imageTimer = null;
    let fallbackTimer = null;
    let enabled = Boolean(autoplay);

    function clearTimers() {
      if (imageTimer) window.clearTimeout(imageTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      imageTimer = null;
      fallbackTimer = null;
    }

    function playVideo(video) {
      if (!enabled) return;
      video.preload = "auto";
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (enabled) {
            fallbackTimer = window.setTimeout(() => activate(randomNext(list, current, id)), 1800);
          }
        });
      }
    }

    function activate(next) {
      clearTimers();
      if (!nodes.length) return;
      current = ((next % nodes.length) + nodes.length) % nodes.length;
      if (enabled) {
        activeSources.set(id, list[current].source);
      } else {
        activeSources.delete(id);
      }

      nodes.forEach((node, index) => {
        const active = index === current;
        node.classList.toggle("is-active", active);
        const video = node.tagName === "VIDEO" ? node : node.querySelector("video");
        if (!video) return;
        video.onended = null;
        video.pause();
        if (!active) {
          try { video.currentTime = 0; } catch {}
          return;
        }
        if (!enabled) return;
        video.onended = () => activate(randomNext(list, current, id));
        playVideo(video);
      });

      if (dots) {
        [...dots.children].forEach((dot, index) => dot.classList.toggle("is-active", index === current));
      }
      if (typeof onChange === "function") onChange(current);

      if (enabled && list[current].kind !== "video") {
        imageTimer = window.setTimeout(() => activate(randomNext(list, current, id)), IMAGE_INTERVAL_MS);
      }
    }

    function setEnabled(nextEnabled) {
      const normalized = Boolean(nextEnabled);
      if (enabled === normalized) return;
      enabled = normalized;
      if (enabled) {
        activate(current);
        return;
      }

      clearTimers();
      activeSources.delete(id);
      nodes.forEach((node) => {
        const video = node.tagName === "VIDEO" ? node : node.querySelector("video");
        if (!video) return;
        video.onended = null;
        video.pause();
      });
    }

    return { activate, setEnabled };
  }

  function mountHero(list) {
    const box = document.getElementById("slideshow");
    let dots = document.getElementById("slide-dots");
    if (!box || !list.length) return;
    box.innerHTML = "";
    if (dots) {
      const cleanDots = dots.cloneNode(false);
      dots.replaceWith(cleanDots);
      dots = cleanDots;
    }

    const nodes = list.map((item, index) => {
      const node = createHeroNode(item, index);
      box.appendChild(node);
      if (dots) {
        const dot = document.createElement("button");
        dot.className = `slide-dot${index === 0 ? " is-active" : ""}`;
        dot.type = "button";
        dot.setAttribute("aria-label", `Media ${index + 1}`);
        dot.dataset.idx = String(index);
        dots.appendChild(dot);
      }
      return node;
    });

    const player = makePlayer({ id: "hero", list, nodes, dots });
    if (dots) {
      dots.addEventListener("click", (event) => {
        const button = event.target.closest(".slide-dot");
        if (!button) return;
        player.activate(Number(button.dataset.idx || 0));
      });
    }
    player.activate(0);
  }

  function mountSection(id, list) {
    const section = document.getElementById(id);
    if (!section || !list.length) return;
    section.querySelectorAll(":scope > .phoenix-section-media").forEach((node) => node.remove());

    const host = document.createElement("div");
    host.className = "phoenix-section-media";
    host.setAttribute("aria-hidden", "true");
    const nodes = list.map((item, index) => {
      const node = createSectionNode(item, index);
      host.appendChild(node);
      return node;
    });
    const veil = document.createElement("div");
    veil.className = "phoenix-section-media__veil";
    host.appendChild(veil);
    section.insertBefore(host, section.firstElementChild);

    const player = makePlayer({ id, list, nodes, autoplay: false });
    player.activate(0);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          player.setEnabled(entry.isIntersecting && entry.intersectionRatio > 0.08);
        });
      }, {
        root: null,
        rootMargin: "180px 0px 180px 0px",
        threshold: [0, 0.08, 0.18, 0.35]
      });
      observer.observe(section);
    } else {
      player.setEnabled(true);
    }
  }

  async function boot() {
    injectStyles();
    const config = await loadConfig();
    mountHero(config.hero || []);
    SECTION_MAP
      .filter((item) => item.type === "section")
      .forEach((item) => mountSection(item.id, config[item.key] || config.hero || []));
  }

  function ready() {
    window.setTimeout(() => {
      boot().catch((error) => console.warn("[phoenix-media] boot failed", error));
    }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();
