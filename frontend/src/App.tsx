import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { useAuthStore } from "./store/auth";

type Post = {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
  display_name: string;
  cover_url?: string;
  summary?: string;
  status?: string;
};
type Task = { id: number; text: string; priority: string; done: boolean };
type AIResource = {
  id: number;
  title: string;
  type: string;
  url: string;
  description: string;
  tags: string[];
  difficulty?: string;
  topic?: string;
  stars?: number;
};
type AIResourceResponse = {
  items: AIResource[];
  bookmarks: number[];
  meta: { limit: number; offset: number; sort: string; search: string };
};
type SiteSetting = { key: string; value: string; updated_at: string };
type AdminOverview = { users: number; posts: number; tasks: number; media: number; visitors_7d: number };
type AdminUser = { id: number; username: string; email: string; display_name: string; role: "admin" | "user"; streak: number; created_at: string };
type AdminPost = { id: number; title: string; category: string; status: string; created_at: string; cover_url?: string; username: string; display_name: string };
type MediaAsset = { id: number; file_name: string; file_url: string; mime_type: string; size_bytes: number; kind: string; created_at: string; display_name?: string };
type VisitorTrend = { day: string; count: number };
type LearningSession = {
  id: number;
  topic: string;
  planned_minutes: number;
  actual_minutes?: number;
  status: string;
  started_at: string;
  completed_at?: string;
};
type RoadmapTemplate = { key: string; name: string; phases: string[] };

const wallpapers = [
  { kind: "image", src: "/wallpapers/2026_03_19_19_23_10_IMG_6104.JPG" },
  { kind: "image", src: "/wallpapers/2026_03_19_19_27_01_IMG_6113.PNG" },
  { kind: "video", src: "/wallpapers/2026_03_19_19_24_58_IMG_6112.MP4" },
  { kind: "image", src: "/wallpapers/2026_03_19_19_23_18_IMG_6106.JPG" }
] as const;

export default function App() {
  const queryClient = useQueryClient();
  const { token, user, init, login, logout } = useAuthStore();
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [wallpaperMode, setWallpaperMode] = useState<"original" | "cover">("original");
  const [showWallpaperPreview, setShowWallpaperPreview] = useState(false);
  const currentWallpaper = wallpapers[wallpaperIndex % wallpapers.length];

  const [activePanel, setActivePanel] = useState<"workspace" | "admin">("workspace");

  const [loginForm, setLoginForm] = useState({ username: "admin", password: "phoenix2026" });
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "Learning",
    summary: "",
    cover_url: "",
    status: "published"
  });
  const [taskText, setTaskText] = useState("");
  const [aiFilter, setAiFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceSort, setResourceSort] = useState("newest");
  const [settingDraft, setSettingDraft] = useState<Record<string, string>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [aiForm, setAiForm] = useState({ title: "", type: "framework", url: "", description: "", tags: "" });
  const [focusTopic, setFocusTopic] = useState("Deep Work");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [roadmapKey, setRoadmapKey] = useState("ai-agent");
  const [phaseDone, setPhaseDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWallpaperIndex((prev) => (prev + 1) % wallpapers.length);
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: async () => (await api.get("/stats")).data });
  const siteSettingsQuery = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => (await api.get("/site-settings")).data as SiteSetting[]
  });
  const postQuery = useQuery({ queryKey: ["posts"], queryFn: async () => (await api.get("/posts?limit=30")).data });
  const aiQuery = useQuery({
    queryKey: ["ai-resources", aiFilter, difficultyFilter, topicFilter, resourceSearch, resourceSort, token],
    queryFn: async () =>
      (
        await api.get("/ai-resources", {
          params: {
            type: aiFilter,
            difficulty: difficultyFilter,
            topic: topicFilter,
            search: resourceSearch,
            sort: resourceSort,
            limit: 120
          }
        })
      ).data as AIResourceResponse
  });

  const meQuery = useQuery({
    queryKey: ["me", token],
    enabled: Boolean(token),
    queryFn: async () => (await api.get("/auth/me")).data
  });

  const role = (meQuery.data?.role || user?.role) as "admin" | "user" | undefined;
  const isAdmin = role === "admin" && Boolean(token);

  const tasksQuery = useQuery({
    queryKey: ["tasks", token],
    enabled: Boolean(token),
    queryFn: async () => (await api.get("/tasks")).data as Task[]
  });

  const bookmarkQuery = useQuery({
    queryKey: ["bookmarks", token],
    enabled: Boolean(token),
    queryFn: async () => (await api.get("/me/bookmarks")).data as AIResource[]
  });

  const sessionQuery = useQuery({
    queryKey: ["sessions", token],
    enabled: Boolean(token),
    queryFn: async () => (await api.get("/sessions")).data as LearningSession[]
  });

  const sessionStatsQuery = useQuery({
    queryKey: ["sessions-stats", token],
    enabled: Boolean(token),
    queryFn: async () =>
      (await api.get("/sessions/stats")).data as { total_sessions: number; total_minutes: number; completed_sessions: number }
  });

  const roadmapQuery = useQuery({
    queryKey: ["roadmap-templates"],
    queryFn: async () => (await api.get("/roadmap/templates")).data as RoadmapTemplate[]
  });

  const adminOverviewQuery = useQuery({
    queryKey: ["admin-overview", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/overview")).data as AdminOverview
  });

  const adminUsersQuery = useQuery({
    queryKey: ["admin-users", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/users")).data as AdminUser[]
  });

  const adminPostsQuery = useQuery({
    queryKey: ["admin-posts", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/posts")).data as AdminPost[]
  });

  const adminMediaQuery = useQuery({
    queryKey: ["admin-media", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/media")).data as MediaAsset[]
  });

  const adminVisitorsQuery = useQuery({
    queryKey: ["admin-visitors", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/visitors?days=14")).data as VisitorTrend[]
  });

  const adminSettingsQuery = useQuery({
    queryKey: ["admin-settings", token],
    enabled: isAdmin,
    queryFn: async () => (await api.get("/admin/site-settings")).data as SiteSetting[]
  });

  useEffect(() => {
    if (adminSettingsQuery.data) {
      const mapped: Record<string, string> = {};
      adminSettingsQuery.data.forEach((item) => {
        mapped[item.key] = item.value;
      });
      setSettingDraft(mapped);
    }
  }, [adminSettingsQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async () => (await api.post("/auth/login", loginForm)).data,
    onSuccess: (data) => {
      login(data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async () => (await api.post("/posts", postForm)).data,
    onSuccess: () => {
      setPostForm({ title: "", content: "", category: "Learning", summary: "", cover_url: "", status: "published" });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    }
  });

  const checkinMutation = useMutation({
    mutationFn: async () => (await api.post("/checkin")).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => (await api.post("/tasks", { text: taskText, priority: "mid" })).data,
    onSuccess: () => {
      setTaskText("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: Task) => (await api.put(`/tasks/${task.id}`, { done: !task.done })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return (await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })).data as MediaAsset;
    },
    onSuccess: (asset) => {
      setPostForm((prev) => ({ ...prev, cover_url: asset.file_url }));
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  });

  const setUserRoleMutation = useMutation({
    mutationFn: async ({ id, role: nextRole }: { id: number; role: "admin" | "user" }) =>
      (await api.put(`/admin/users/${id}/role`, { role: nextRole })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const deletePostAdminMutation = useMutation({
    mutationFn: async (postId: number) => (await api.delete(`/admin/posts/${postId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  });

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => (await api.put("/admin/site-settings", { key, value })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-public"] });
    }
  });

  const addAiResourceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: aiForm.title,
        type: aiForm.type,
        url: aiForm.url,
        description: aiForm.description,
        tags: aiForm.tags.split(",").map((x) => x.trim()).filter(Boolean)
      };
      return (await api.post("/admin/ai-resources", payload)).data;
    },
    onSuccess: () => {
      setAiForm({ title: "", type: "framework", url: "", description: "", tags: "" });
      queryClient.invalidateQueries({ queryKey: ["ai-resources"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
  });

  const deleteAiResourceMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/admin/ai-resources/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-resources"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async ({ id, bookmarked }: { id: number; bookmarked: boolean }) => {
      if (bookmarked) {
        return (await api.delete(`/ai-resources/${id}/bookmark`)).data;
      }
      return (await api.post(`/ai-resources/${id}/bookmark`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-resources"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  });

  const startSessionMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/sessions/start", {
          topic: focusTopic,
          planned_minutes: focusMinutes
        })
      ).data as LearningSession,
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      setRemainingSeconds((session.planned_minutes || focusMinutes) * 60);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-stats"] });
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, actualMinutes }: { sessionId: number; actualMinutes: number }) =>
      (await api.put(`/sessions/${sessionId}/complete`, { actual_minutes: actualMinutes })).data,
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-stats"] });
    }
  });

  function submitLogin(e: FormEvent) {
    e.preventDefault();
    loginMutation.mutate();
  }

  function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    createPostMutation.mutate();
  }

  function triggerUpload() {
    if (!uploadFile) return;
    uploadMutation.mutate(uploadFile);
  }

  function toggleBookmark(resourceId: number) {
    if (!token) return;
    const isMarked = bookmarkedSet.has(resourceId);
    bookmarkMutation.mutate({ id: resourceId, bookmarked: isMarked });
  }

  function startFocusSession() {
    if (!token) return;
    if (activeSessionId) return;
    startSessionMutation.mutate();
  }

  function completeFocusSession() {
    if (!token || !activeSessionId) return;
    const actualMinutes = Math.max(1, Math.round((focusMinutes * 60 - remainingSeconds) / 60));
    completeSessionMutation.mutate({ sessionId: activeSessionId, actualMinutes });
  }

  useEffect(() => {
    if (!activeSessionId) return;
    if (remainingSeconds <= 0) {
      completeFocusSession();
      return;
    }
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSessionId, remainingSeconds]);

  useEffect(() => {
    if (!activeSessionId) {
      setRemainingSeconds(focusMinutes * 60);
    }
  }, [focusMinutes, activeSessionId]);

  const aiTypes = useMemo(() => {
    const types = new Set(aiQuery.data?.items?.map((x) => x.type) || []);
    return ["all", ...Array.from(types)];
  }, [aiQuery.data]);

  const difficultyTypes = useMemo(() => {
    const values = new Set(aiQuery.data?.items?.map((x) => x.difficulty || "intermediate") || []);
    return ["all", ...Array.from(values)];
  }, [aiQuery.data]);

  const topicTypes = useMemo(() => {
    const values = new Set(aiQuery.data?.items?.map((x) => x.topic || "general") || []);
    return ["all", ...Array.from(values)];
  }, [aiQuery.data]);

  const filteredAI = aiQuery.data?.items || [];

  const bookmarkedSet = useMemo(() => {
    if (token) {
      return new Set((bookmarkQuery.data || []).map((x) => x.id));
    }
    return new Set(aiQuery.data?.bookmarks || []);
  }, [aiQuery.data, bookmarkQuery.data, token]);

  const siteMap = useMemo(() => {
    const map: Record<string, string> = {};
    (siteSettingsQuery.data || []).forEach((item) => {
      map[item.key] = item.value;
    });
    return map;
  }, [siteSettingsQuery.data]);

  return (
    <div className="page">
      <div className={`wallpaper-layer ${wallpaperMode === "original" ? "original-quality" : ""}`} aria-hidden>
        {currentWallpaper.kind === "video" ? (
          <video
            key={currentWallpaper.src}
            className={`wallpaper-media ${wallpaperMode === "original" ? "mode-original" : "mode-cover"}`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src={currentWallpaper.src} type="video/mp4" />
          </video>
        ) : (
          <img
            key={currentWallpaper.src}
            className={`wallpaper-media ${wallpaperMode === "original" ? "mode-original" : "mode-cover"}`}
            src={currentWallpaper.src}
            alt="wallpaper"
            loading="eager"
            decoding="sync"
            draggable={false}
          />
        )}
        <div className="wallpaper-overlay" />
      </div>

      <header className="hero card">
        <h1>{siteMap.hero_title || "Phoenix Learning Journey"}</h1>
        <p>{siteMap.hero_subtitle || "JNU CST study log with backend, database and dynamic media wallpaper."}</p>
        <div className="hero-stats">
          <span>Posts {statsQuery.data?.total_posts ?? 0}</span>
          <span>Users {statsQuery.data?.total_users ?? 0}</span>
          <span>AI Resources {statsQuery.data?.total_ai_resources ?? 0}</span>
        </div>
        <div className="inline wrap">
          <button className={activePanel === "workspace" ? "active" : ""} onClick={() => setActivePanel("workspace")}>Workspace</button>
          {isAdmin && (
            <button className={activePanel === "admin" ? "active" : ""} onClick={() => setActivePanel("admin")}>Admin Dashboard</button>
          )}
        </div>
      </header>

      {activePanel === "workspace" && (
        <>
          <section className="grid two-col">
            <div className="card">
              <h2>Account</h2>
              {!token ? (
                <form onSubmit={submitLogin} className="stack">
                  <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Username or email" />
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" />
                  <button type="submit">Login</button>
                  {loginMutation.isError && <small>Login failed.</small>}
                </form>
              ) : (
                <div className="stack">
                  <p>Welcome {user?.display_name || meQuery.data?.display_name}</p>
                  <p>Role: {role || "user"}</p>
                  <p>Current streak: {meQuery.data?.streak ?? user?.streak ?? 0}</p>
                  <button onClick={() => checkinMutation.mutate()}>Daily Check-in</button>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>

            <div className="card">
              <h2>Wallpaper Control</h2>
              <p>Overlay opacity fixed at 0.4. Original-quality mode is enabled by default, with no image compression.</p>
              <div className="inline wrap">
                <button className={wallpaperMode === "original" ? "active" : ""} onClick={() => setWallpaperMode("original")}>
                  Original Quality
                </button>
                <button className={wallpaperMode === "cover" ? "active" : ""} onClick={() => setWallpaperMode("cover")}>
                  Full Cover
                </button>
                <button onClick={() => setShowWallpaperPreview(true)}>Preview Original</button>
              </div>
              <div className="inline wrap">
                {wallpapers.map((item, idx) => (
                  <button key={item.src} onClick={() => setWallpaperIndex(idx)} className={idx === wallpaperIndex ? "active" : ""}>
                    {item.kind} {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Learning Journal</h2>
            {token && (
              <form onSubmit={submitPost} className="stack">
                <input value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} placeholder="Post title" />
                <input value={postForm.category} onChange={(e) => setPostForm({ ...postForm, category: e.target.value })} placeholder="Category" />
                <input value={postForm.summary} onChange={(e) => setPostForm({ ...postForm, summary: e.target.value })} placeholder="Summary (short)" />
                <textarea value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} placeholder="Write your learning note" rows={5} />
                <div className="inline wrap">
                  <select value={postForm.status} onChange={(e) => setPostForm({ ...postForm, status: e.target.value })}>
                    <option value="published">published</option>
                    <option value="draft">draft</option>
                  </select>
                  <input value={postForm.cover_url} onChange={(e) => setPostForm({ ...postForm, cover_url: e.target.value })} placeholder="Cover URL (optional)" />
                </div>
                <div className="inline wrap">
                  <input type="file" accept="image/*,video/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={triggerUpload} disabled={!uploadFile || uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Uploading..." : "Upload Cover"}
                  </button>
                </div>
                <button type="submit">Publish</button>
              </form>
            )}
            <div className="stack">
              {(postQuery.data?.posts || []).map((post: Post) => (
                <article key={post.id} className="post-item">
                  {post.cover_url && <img className="cover-preview" src={post.cover_url} alt="cover" />}
                  <h3>{post.title}</h3>
                  <small>{post.display_name} | {post.category}</small>
                  {post.summary && <p>{post.summary}</p>}
                  <p>{post.content}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid two-col">
            <div className="card">
              <h2>Weekly Tasks</h2>
              {token ? (
                <>
                  <div className="inline">
                    <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Add a task" />
                    <button onClick={() => createTaskMutation.mutate()} disabled={!taskText.trim()}>Add</button>
                  </div>
                  <div className="stack">
                    {(tasksQuery.data || []).map((task) => (
                      <label key={task.id} className="task-item">
                        <input type="checkbox" checked={task.done} onChange={() => toggleTaskMutation.mutate(task)} />
                        <span>{task.text}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p>Login required for personal task board.</p>
              )}
            </div>

            <div className="card">
              <h2>AI Agent Resources</h2>
              <div className="inline wrap">
                <input
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search resources, tags, topic"
                />
                <select value={resourceSort} onChange={(e) => setResourceSort(e.target.value)}>
                  <option value="newest">newest</option>
                  <option value="popular">popular</option>
                  <option value="title">title</option>
                </select>
              </div>
              <div className="inline wrap">
                {aiTypes.map((type) => (
                  <button key={type} onClick={() => setAiFilter(type)} className={type === aiFilter ? "active" : ""}>{type}</button>
                ))}
              </div>
              <div className="inline wrap">
                {difficultyTypes.map((type) => (
                  <button key={type} onClick={() => setDifficultyFilter(type)} className={type === difficultyFilter ? "active" : ""}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="inline wrap">
                {topicTypes.map((type) => (
                  <button key={type} onClick={() => setTopicFilter(type)} className={type === topicFilter ? "active" : ""}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="stack">
                {filteredAI.map((item) => (
                  <article key={item.id} className="post-item">
                    <h3>{item.title}</h3>
                    <small>
                      {item.type} | {item.difficulty || "intermediate"} | {item.topic || "general"} | stars {item.stars || 0}
                    </small>
                    <p>{item.description}</p>
                    <div className="inline wrap">
                      <a href={item.url} target="_blank" rel="noreferrer">Open Resource</a>
                      {token && (
                        <button onClick={() => toggleBookmark(item.id)} disabled={bookmarkMutation.isPending}>
                          {bookmarkedSet.has(item.id) ? "Bookmarked" : "Bookmark"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="grid two-col">
            <div className="card">
              <h2>Focus Studio</h2>
              <p>Start a timed deep-work session. Sessions are stored in your profile stats.</p>
              <div className="inline wrap">
                <input value={focusTopic} onChange={(e) => setFocusTopic(e.target.value)} placeholder="Focus topic" />
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={focusMinutes}
                  onChange={(e) => setFocusMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 25)))}
                />
                <span>minutes</span>
              </div>
              <h3>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</h3>
              <div className="inline wrap">
                <button onClick={startFocusSession} disabled={!token || !!activeSessionId || startSessionMutation.isPending}>
                  Start Session
                </button>
                <button onClick={completeFocusSession} disabled={!activeSessionId || completeSessionMutation.isPending}>
                  Complete Session
                </button>
              </div>
              <small>
                Sessions: {sessionStatsQuery.data?.total_sessions || 0} | Completed: {sessionStatsQuery.data?.completed_sessions || 0} | Minutes: {sessionStatsQuery.data?.total_minutes || 0}
              </small>
              <div className="stack scroll-pane">
                {(sessionQuery.data || []).slice(0, 8).map((s) => (
                  <div key={s.id} className="row-space">
                    <span>{s.topic}</span>
                    <small>{s.status} | {s.actual_minutes || s.planned_minutes} min</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>Roadmap Builder</h2>
              <p>Choose a direction and track phase completion for your current semester sprint.</p>
              <div className="inline wrap">
                {(roadmapQuery.data || []).map((tpl) => (
                  <button key={tpl.key} className={tpl.key === roadmapKey ? "active" : ""} onClick={() => setRoadmapKey(tpl.key)}>
                    {tpl.name}
                  </button>
                ))}
              </div>
              <div className="stack">
                {(roadmapQuery.data?.find((x) => x.key === roadmapKey)?.phases || []).map((phase, idx) => {
                  const key = `${roadmapKey}-${idx}`;
                  return (
                    <label key={key} className="task-item">
                      <input
                        type="checkbox"
                        checked={Boolean(phaseDone[key])}
                        onChange={() => setPhaseDone((prev) => ({ ...prev, [key]: !prev[key] }))}
                      />
                      <span>{phase}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {activePanel === "admin" && isAdmin && (
        <section className="card stack">
          <h2>Admin Operations Panel</h2>
          <p>Central management for growth metrics, users, content, media assets, traffic and site copy.</p>

          <div className="grid five-col">
            <div className="metric-card"><strong>{adminOverviewQuery.data?.users ?? 0}</strong><span>Users</span></div>
            <div className="metric-card"><strong>{adminOverviewQuery.data?.posts ?? 0}</strong><span>Posts</span></div>
            <div className="metric-card"><strong>{adminOverviewQuery.data?.tasks ?? 0}</strong><span>Tasks</span></div>
            <div className="metric-card"><strong>{adminOverviewQuery.data?.media ?? 0}</strong><span>Media</span></div>
            <div className="metric-card"><strong>{adminOverviewQuery.data?.visitors_7d ?? 0}</strong><span>Visitors 7d</span></div>
          </div>

          <div className="grid two-col">
            <div className="card admin-block">
              <h3>User Permissions</h3>
              <div className="stack scroll-pane">
                {(adminUsersQuery.data || []).map((u) => (
                  <div className="row-space" key={u.id}>
                    <div>
                      <strong>{u.display_name || u.username}</strong>
                      <small>{u.email}</small>
                    </div>
                    <button
                      onClick={() => setUserRoleMutation.mutate({ id: u.id, role: u.role === "admin" ? "user" : "admin" })}
                      disabled={setUserRoleMutation.isPending}
                    >
                      {u.role}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card admin-block">
              <h3>Traffic Trend (14d)</h3>
              <div className="stack scroll-pane">
                {(adminVisitorsQuery.data || []).map((v) => (
                  <div key={v.day} className="row-space">
                    <span>{new Date(v.day).toLocaleDateString()}</span>
                    <span>{v.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid two-col">
            <div className="card admin-block">
              <h3>Content Moderation</h3>
              <div className="stack scroll-pane">
                {(adminPostsQuery.data || []).map((p) => (
                  <div key={p.id} className="row-space">
                    <div>
                      <strong>{p.title}</strong>
                      <small>{p.display_name} | {p.status}</small>
                    </div>
                    <button onClick={() => deletePostAdminMutation.mutate(p.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card admin-block">
              <h3>Media Library</h3>
              <div className="stack scroll-pane">
                {(adminMediaQuery.data || []).map((m) => (
                  <div className="row-space" key={m.id}>
                    <a href={m.file_url} target="_blank" rel="noreferrer">{m.file_name}</a>
                    <small>{Math.round(m.size_bytes / 1024)} KB</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid two-col">
            <div className="card admin-block stack">
              <h3>Site Settings</h3>
              {Object.keys(settingDraft).map((key) => (
                <div key={key} className="stack">
                  <label>{key}</label>
                  <textarea
                    rows={2}
                    value={settingDraft[key]}
                    onChange={(e) => setSettingDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                  <button onClick={() => saveSettingMutation.mutate({ key, value: settingDraft[key] })}>Save {key}</button>
                </div>
              ))}
            </div>

            <div className="card admin-block stack">
              <h3>AI Resource Manager</h3>
              <input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} placeholder="Title" />
              <input value={aiForm.type} onChange={(e) => setAiForm({ ...aiForm, type: e.target.value })} placeholder="Type" />
              <input value={aiForm.url} onChange={(e) => setAiForm({ ...aiForm, url: e.target.value })} placeholder="URL" />
              <textarea value={aiForm.description} onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })} rows={2} placeholder="Description" />
              <input value={aiForm.tags} onChange={(e) => setAiForm({ ...aiForm, tags: e.target.value })} placeholder="tags,comma,separated" />
              <button onClick={() => addAiResourceMutation.mutate()} disabled={addAiResourceMutation.isPending}>Add AI Resource</button>
              <div className="stack scroll-pane">
                {(aiQuery.data?.items || []).map((item) => (
                  <div key={item.id} className="row-space">
                    <span>{item.title}</span>
                    <button onClick={() => deleteAiResourceMutation.mutate(item.id)} disabled={deleteAiResourceMutation.isPending}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {showWallpaperPreview && (
        <div className="wallpaper-preview-modal" role="dialog" aria-modal="true">
          <button className="wallpaper-preview-close" onClick={() => setShowWallpaperPreview(false)}>Close</button>
          <div className="wallpaper-preview-content">
            {currentWallpaper.kind === "video" ? (
              <video controls autoPlay loop playsInline className="wallpaper-preview-media">
                <source src={currentWallpaper.src} type="video/mp4" />
              </video>
            ) : (
              <img src={currentWallpaper.src} alt="original wallpaper" className="wallpaper-preview-media" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
