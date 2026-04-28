CREATE TABLE IF NOT EXISTS learning_resources (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR(220) NOT NULL,
    kind           VARCHAR(40) DEFAULT 'link',
    url            TEXT,
    file_url       TEXT,
    description    TEXT,
    topic          VARCHAR(80) DEFAULT 'general',
    difficulty     VARCHAR(20) DEFAULT 'beginner',
    tags           TEXT[] DEFAULT '{}',
    day_number     INT,
    created_by     INT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_plan_days (
    id              SERIAL PRIMARY KEY,
    day_number      INT UNIQUE NOT NULL CHECK (day_number BETWEEN 1 AND 14),
    title           VARCHAR(220) NOT NULL,
    focus           VARCHAR(160) NOT NULL,
    knowledge       TEXT NOT NULL,
    deep_dive       TEXT NOT NULL,
    practice        TEXT NOT NULL,
    deliverable     TEXT NOT NULL,
    estimated_minutes INT DEFAULT 90,
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_day_progress (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    day_number      INT NOT NULL CHECK (day_number BETWEEN 1 AND 14),
    status          VARCHAR(20) DEFAULT 'todo',
    notes           TEXT DEFAULT '',
    completed_at    TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_day ON learning_resources(day_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_resources_topic ON learning_resources(topic);
CREATE INDEX IF NOT EXISTS idx_study_day_progress_user ON study_day_progress(user_id, day_number);

INSERT INTO study_plan_days (day_number, title, focus, knowledge, deep_dive, practice, deliverable, estimated_minutes, tags)
VALUES
(1, 'Map the AI Agent Landscape', 'Agent concepts and learning map', 'Understand what an AI agent is: model, tool use, memory, planning loop, environment, and feedback.', 'Compare simple chatbots, tool-calling assistants, RAG agents, workflow agents, and multi-agent systems. Notice where each one fails.', 'Draw your own agent architecture map and annotate model, tools, memory, state, and safety checks.', 'A one-page architecture sketch and glossary.', 80, ARRAY['agents','overview']),
(2, 'Prompting and Output Contracts', 'Prompt structure and reliable formats', 'Learn instruction hierarchy, role framing, examples, constraints, and JSON output contracts.', 'Study why vague prompts fail and how schemas, rubrics, and adversarial examples improve consistency.', 'Create five prompts for the same task: casual, structured, JSON, rubric-based, and failure-aware.', 'Prompt pack saved as a Markdown note.', 90, ARRAY['prompting','contracts']),
(3, 'Tool Calling Fundamentals', 'Functions, parameters, and execution boundaries', 'Learn how models decide when to call tools and how typed parameters reduce ambiguity.', 'Separate model reasoning from deterministic code. Treat tools as small, auditable capabilities.', 'Design three tools for a study assistant: search resources, create note, update task.', 'Tool spec table with inputs, outputs, and failure modes.', 90, ARRAY['tools','api']),
(4, 'RAG Basics', 'Retrieval augmented generation', 'Learn chunking, embeddings, vector search, reranking, and answer synthesis.', 'Understand why retrieval quality matters more than model size for knowledge-heavy apps.', 'Create a mini RAG plan for your blog resources: source, chunk, metadata, ranking, citation.', 'RAG pipeline diagram and evaluation checklist.', 100, ARRAY['rag','retrieval']),
(5, 'Memory and State', 'Short-term and long-term memory', 'Learn session state, user profile memory, vector memory, and database-backed memory.', 'Compare what belongs in prompt context, relational tables, and searchable memory.', 'Design memory fields for your learning blog: goals, streak, finished days, notes, weak topics.', 'Memory schema proposal.', 85, ARRAY['memory','database']),
(6, 'Workflow Orchestration', 'Graphs, queues, and repeatable flows', 'Learn sequential workflows, branching, retries, human approval, and resumability.', 'See why production agents often look like workflows with model steps rather than free-form autonomy.', 'Model a resource upload workflow from admin action to frontend display.', 'Workflow checklist with success and rollback states.', 95, ARRAY['workflow','backend']),
(7, 'Frontend Interaction Design', 'Learning dashboard UX', 'Learn how dashboards communicate progress, next actions, resources, and feedback.', 'Study compact information hierarchy: progress first, next day second, resources and notes nearby.', 'Review this blog dashboard and write three UI improvements after using it.', 'UI improvement note.', 75, ARRAY['frontend','dashboard']),
(8, 'Backend API Design', 'REST contracts and validation', 'Learn endpoints, validation, auth boundaries, local admin mode, and error messages.', 'Compare public read APIs, owner-only local APIs, and authenticated admin APIs.', 'Write API contracts for check-in, task completion, resource upload, and day progress.', 'API contract Markdown.', 100, ARRAY['backend','api']),
(9, 'Database Modeling', 'Tables, indexes, and progress tracking', 'Learn relational modeling for posts, resources, tasks, check-ins, and day progress.', 'Think in constraints: uniqueness, foreign keys, query patterns, and auditability.', 'Explain why study_day_progress needs UNIQUE(user_id, day_number).', 'Database explanation note.', 90, ARRAY['postgres','schema']),
(10, 'Evaluation and Testing', 'Quality loops for agents and apps', 'Learn smoke tests, API tests, UI checks, and agent output evaluation.', 'Define pass/fail checks before expanding features. Make regressions visible.', 'Create ten checks for your learning blog and run at least three manually.', 'Test checklist.', 85, ARRAY['testing','quality']),
(11, 'Deployment Basics', 'Local, tunnel, and production paths', 'Learn local dev, Docker, reverse proxy, tunnel limitations, and permanent domain options.', 'Understand why free tunnels are temporary and what changes with a real domain.', 'Write a deployment decision note: free tunnel, VPS, Cloudflare, or managed platform.', 'Deployment comparison note.', 80, ARRAY['deployment','docker']),
(12, 'Security and Admin Boundaries', 'Authentication and safe owner actions', 'Learn password auth, local-only operations, file upload limits, and public/private APIs.', 'Review common risks: unrestricted upload, public admin APIs, token leakage, and weak rate limits.', 'Audit one API endpoint and note who can call it and why.', 'Security audit note.', 95, ARRAY['security','auth']),
(13, 'Capstone Build Day', 'Ship a usable learning workflow', 'Combine notes, tasks, resources, progress, and dashboard into one coherent user loop.', 'Focus on completing the loop rather than adding loose features.', 'Use the site for a real study session: upload a resource, check in, finish tasks, write a note.', 'A completed study day with evidence in the dashboard.', 120, ARRAY['capstone','product']),
(14, 'Review and Next Sprint', 'Retrospective and next roadmap', 'Learn how to review progress, identify weak areas, and plan the next two-week sprint.', 'Turn usage data into decisions: what you opened, completed, skipped, or repeated.', 'Write a retrospective and choose the next 14-day theme.', 'Next sprint plan.', 90, ARRAY['review','planning'])
ON CONFLICT (day_number) DO UPDATE
SET title = EXCLUDED.title,
    focus = EXCLUDED.focus,
    knowledge = EXCLUDED.knowledge,
    deep_dive = EXCLUDED.deep_dive,
    practice = EXCLUDED.practice,
    deliverable = EXCLUDED.deliverable,
    estimated_minutes = EXCLUDED.estimated_minutes,
    tags = EXCLUDED.tags,
    updated_at = NOW();

INSERT INTO learning_resources (title, kind, url, description, topic, difficulty, tags, day_number)
VALUES
('Free AI Agents Resources', 'link', 'https://github.com/avinash201199/free-ai-agents-resources', 'Large curated list of AI agent frameworks, papers, projects, and learning material.', 'agents', 'beginner', ARRAY['agents','curated'], 1),
('Prompt Engineering Guide', 'link', 'https://www.promptingguide.ai/', 'Structured guide for prompt patterns, reasoning prompts, and evaluation examples.', 'prompting', 'beginner', ARRAY['prompting','guide'], 2),
('OpenAI Cookbook', 'link', 'https://github.com/openai/openai-cookbook', 'Practical examples for API workflows, structured outputs, embeddings, and applications.', 'llm-api', 'beginner', ARRAY['api','examples'], 3),
('LangGraph', 'link', 'https://github.com/langchain-ai/langgraph', 'Graph-based orchestration framework for durable agent workflows.', 'workflow', 'intermediate', ARRAY['agents','workflow'], 6),
('LlamaIndex', 'link', 'https://github.com/run-llama/llama_index', 'Data framework for RAG and knowledge applications.', 'rag', 'intermediate', ARRAY['rag','data'], 4),
('PostgreSQL Documentation', 'link', 'https://www.postgresql.org/docs/', 'Official PostgreSQL docs for database modeling and query fundamentals.', 'database', 'beginner', ARRAY['postgres','database'], 9),
('Docker Documentation', 'link', 'https://docs.docker.com/', 'Official Docker documentation for local deployment and production packaging.', 'deployment', 'beginner', ARRAY['docker','deploy'], 11)
ON CONFLICT DO NOTHING;
