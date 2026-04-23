CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100),
    bio           TEXT,
    avatar_url    TEXT,
    streak        INT DEFAULT 0,
    last_checkin  DATE,
    role          VARCHAR(20) DEFAULT 'user',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id            SERIAL PRIMARY KEY,
    user_id       INT REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    content       TEXT NOT NULL,
    category      VARCHAR(100) DEFAULT 'General',
    tags          TEXT[] DEFAULT '{}',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, check_date)
);

CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    text       VARCHAR(500) NOT NULL,
    priority   VARCHAR(10) DEFAULT 'mid',
    done       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_resources (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(300) NOT NULL,
    type        VARCHAR(40) NOT NULL,
    url         TEXT NOT NULL,
    description TEXT,
    tags        TEXT[] DEFAULT '{}',
    source      VARCHAR(100) DEFAULT 'free-ai-agents-resources',
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_type ON ai_resources(type);

INSERT INTO users (username, email, password_hash, display_name, role)
VALUES ('admin', 'admin@phoenix.local', '$2a$12$LJ3m4yPnPfGiGrz7G4rXe.B/6YJkFpK3ufYaY9kL9X8jKq5kI5kGe', 'Phoenix Admin', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO ai_resources (title, type, url, description, tags)
VALUES
('Free AI Agents Resources', 'resource', 'https://github.com/avinash201199/free-ai-agents-resources', 'Curated collection of frameworks, guides, and examples for AI agents.', ARRAY['agents','starter']),
('AutoGen', 'framework', 'https://github.com/microsoft/autogen', 'Multi-agent conversation framework from Microsoft.', ARRAY['framework','multi-agent']),
('LangGraph', 'framework', 'https://github.com/langchain-ai/langgraph', 'Stateful orchestration for long-running agent workflows.', ARRAY['orchestration','graph']),
('CrewAI', 'framework', 'https://github.com/crewAIInc/crewAI', 'Role-based multi-agent collaboration.', ARRAY['crew','automation']),
('OpenHands', 'tool', 'https://github.com/All-Hands-AI/OpenHands', 'Agent platform focused on software tasks.', ARRAY['coding-agent','devtools']),
('DSPy', 'framework', 'https://github.com/stanfordnlp/dspy', 'Programming model for LM pipelines and optimization.', ARRAY['research','prompting']),
('AgentOps', 'tool', 'https://github.com/AgentOps-AI/agentops', 'Observability and analytics for agent systems.', ARRAY['observability','ops'])
ON CONFLICT DO NOTHING;
