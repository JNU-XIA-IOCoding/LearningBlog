ALTER TABLE ai_resources
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS topic VARCHAR(60) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS lang VARCHAR(20) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS stars INT DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_resources_url_unique ON ai_resources(url);

CREATE TABLE IF NOT EXISTS user_ai_bookmarks (
    id           SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    resource_id  INT REFERENCES ai_resources(id) ON DELETE CASCADE,
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS learning_sessions (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES users(id) ON DELETE CASCADE,
    topic             VARCHAR(200) NOT NULL,
    planned_minutes   INT DEFAULT 25,
    actual_minutes    INT,
    status            VARCHAR(20) DEFAULT 'running',
    started_at        TIMESTAMP DEFAULT NOW(),
    completed_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON learning_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_ai_bookmarks(user_id, created_at DESC);

INSERT INTO ai_resources (title, type, url, description, tags, difficulty, topic, lang, is_free, stars)
VALUES
('LangChain', 'framework', 'https://github.com/langchain-ai/langchain', 'Popular framework for building LLM applications.', ARRAY['framework','agents'], 'intermediate', 'agent-framework', 'en', TRUE, 106000),
('LlamaIndex', 'framework', 'https://github.com/run-llama/llama_index', 'Data framework for LLM applications and RAG.', ARRAY['rag','data'], 'intermediate', 'rag', 'en', TRUE, 46000),
('Haystack', 'framework', 'https://github.com/deepset-ai/haystack', 'NLP framework with production-ready pipelines.', ARRAY['nlp','pipeline'], 'intermediate', 'rag', 'en', TRUE, 18000),
('Semantic Kernel', 'framework', 'https://github.com/microsoft/semantic-kernel', 'SDK for integrating LLMs into apps.', ARRAY['sdk','orchestration'], 'intermediate', 'agent-framework', 'en', TRUE, 27000),
('OpenAI Cookbook', 'resource', 'https://github.com/openai/openai-cookbook', 'Examples and guides for OpenAI API usage.', ARRAY['examples','api'], 'beginner', 'llm-api', 'en', TRUE, 70000),
('Prompt Engineering Guide', 'resource', 'https://www.promptingguide.ai/', 'Comprehensive prompt engineering handbook.', ARRAY['prompt','guide'], 'beginner', 'prompting', 'en', TRUE, 12000),
('Hugging Face Transformers', 'framework', 'https://github.com/huggingface/transformers', 'Transformers library for NLP and multimodal tasks.', ARRAY['models','nlp'], 'intermediate', 'modeling', 'en', TRUE, 145000),
('vLLM', 'tool', 'https://github.com/vllm-project/vllm', 'High-throughput and memory-efficient LLM serving.', ARRAY['inference','serving'], 'advanced', 'deployment', 'en', TRUE, 41000),
('Ollama', 'tool', 'https://github.com/ollama/ollama', 'Run open models locally with a simple API.', ARRAY['local','models'], 'beginner', 'deployment', 'en', TRUE, 165000),
('LM Studio', 'tool', 'https://lmstudio.ai/', 'Local model runtime with visual UI.', ARRAY['local','desktop'], 'beginner', 'deployment', 'en', TRUE, 3000),
('FastAPI', 'framework', 'https://github.com/fastapi/fastapi', 'Fast Python API framework for backend services.', ARRAY['backend','api'], 'beginner', 'backend', 'en', TRUE, 84000),
('NestJS', 'framework', 'https://github.com/nestjs/nest', 'Scalable Node.js framework for server applications.', ARRAY['backend','typescript'], 'intermediate', 'backend', 'en', TRUE, 71000),
('Supabase', 'tool', 'https://github.com/supabase/supabase', 'Open-source backend platform with Postgres.', ARRAY['backend','database'], 'beginner', 'backend', 'en', TRUE, 82000),
('PostgreSQL Docs', 'resource', 'https://www.postgresql.org/docs/', 'Official PostgreSQL documentation.', ARRAY['database','sql'], 'beginner', 'database', 'en', TRUE, 10000),
('Redis', 'tool', 'https://github.com/redis/redis', 'In-memory data store used for cache and queues.', ARRAY['cache','queue'], 'intermediate', 'backend', 'en', TRUE, 70000),
('Celery', 'tool', 'https://github.com/celery/celery', 'Distributed task queue for Python workloads.', ARRAY['task','queue'], 'intermediate', 'backend', 'en', TRUE, 27000),
('Temporal', 'tool', 'https://github.com/temporalio/temporal', 'Durable execution system for workflows.', ARRAY['workflow','durable'], 'advanced', 'orchestration', 'en', TRUE, 14000),
('Airbyte', 'tool', 'https://github.com/airbytehq/airbyte', 'Data integration platform for ELT pipelines.', ARRAY['etl','data'], 'intermediate', 'data-engineering', 'en', TRUE, 18000),
('dbt Core', 'tool', 'https://github.com/dbt-labs/dbt-core', 'Transformation workflow for analytics engineering.', ARRAY['analytics','sql'], 'intermediate', 'data-engineering', 'en', TRUE, 11000),
('Apache Superset', 'tool', 'https://github.com/apache/superset', 'Data exploration and visualization platform.', ARRAY['bi','dashboard'], 'intermediate', 'analytics', 'en', TRUE, 68000),
('Streamlit', 'tool', 'https://github.com/streamlit/streamlit', 'Fast data app framework for Python.', ARRAY['ui','data-app'], 'beginner', 'frontend', 'en', TRUE, 41000),
('Gradio', 'tool', 'https://github.com/gradio-app/gradio', 'Build and share ML demos quickly.', ARRAY['demo','ml'], 'beginner', 'frontend', 'en', TRUE, 48000),
('SvelteKit', 'framework', 'https://github.com/sveltejs/kit', 'Application framework for Svelte.', ARRAY['frontend','web'], 'intermediate', 'frontend', 'en', TRUE, 20000),
('Next.js', 'framework', 'https://github.com/vercel/next.js', 'React framework for production web apps.', ARRAY['frontend','react'], 'intermediate', 'frontend', 'en', TRUE, 130000),
('Nuxt', 'framework', 'https://github.com/nuxt/nuxt', 'Vue framework for full-stack applications.', ARRAY['frontend','vue'], 'intermediate', 'frontend', 'en', TRUE, 57000),
('Kubernetes Docs', 'resource', 'https://kubernetes.io/docs/home/', 'Official Kubernetes documentation.', ARRAY['k8s','devops'], 'advanced', 'deployment', 'en', TRUE, 10000),
('Docker Docs', 'resource', 'https://docs.docker.com/', 'Official Docker documentation and guides.', ARRAY['docker','devops'], 'beginner', 'deployment', 'en', TRUE, 10000),
('Terraform', 'tool', 'https://github.com/hashicorp/terraform', 'Infrastructure as code for cloud provisioning.', ARRAY['iac','devops'], 'intermediate', 'deployment', 'en', TRUE, 46000),
('Pulumi', 'tool', 'https://github.com/pulumi/pulumi', 'Modern infrastructure as code platform.', ARRAY['iac','cloud'], 'intermediate', 'deployment', 'en', TRUE, 22000),
('DVC', 'tool', 'https://github.com/iterative/dvc', 'Data version control for ML projects.', ARRAY['mlops','data-versioning'], 'intermediate', 'mlops', 'en', TRUE, 14000),
('MLflow', 'tool', 'https://github.com/mlflow/mlflow', 'ML lifecycle platform for experiments and models.', ARRAY['mlops','tracking'], 'intermediate', 'mlops', 'en', TRUE, 22000),
('Weights & Biases', 'tool', 'https://wandb.ai/site', 'Experiment tracking and model monitoring platform.', ARRAY['tracking','mlops'], 'beginner', 'mlops', 'en', TRUE, 18000),
('Pytorch', 'framework', 'https://github.com/pytorch/pytorch', 'Deep learning framework.', ARRAY['dl','training'], 'intermediate', 'modeling', 'en', TRUE, 90000),
('JAX', 'framework', 'https://github.com/jax-ml/jax', 'High-performance numerical computing and autodiff.', ARRAY['dl','autodiff'], 'advanced', 'modeling', 'en', TRUE, 32000),
('DeepSpeed', 'tool', 'https://github.com/microsoft/DeepSpeed', 'Deep learning optimization library.', ARRAY['training','optimization'], 'advanced', 'modeling', 'en', TRUE, 39000),
('PEFT', 'tool', 'https://github.com/huggingface/peft', 'Parameter-efficient fine-tuning methods.', ARRAY['finetune','llm'], 'intermediate', 'modeling', 'en', TRUE, 19000),
('OpenRouter', 'tool', 'https://openrouter.ai/', 'Unified API for multiple LLM providers.', ARRAY['api','routing'], 'beginner', 'llm-api', 'en', TRUE, 7000),
('LiteLLM', 'tool', 'https://github.com/BerriAI/litellm', 'Proxy and SDK for many model providers.', ARRAY['proxy','llm'], 'intermediate', 'llm-api', 'en', TRUE, 20000),
('Model Context Protocol', 'resource', 'https://modelcontextprotocol.io/', 'Open protocol for LLM tool interoperability.', ARRAY['mcp','protocol'], 'intermediate', 'agent-framework', 'en', TRUE, 4000),
('Browser Use', 'tool', 'https://github.com/browser-use/browser-use', 'Automate browsers with LLM agents.', ARRAY['browser','automation'], 'intermediate', 'agents', 'en', TRUE, 39000),
('Playwright', 'tool', 'https://github.com/microsoft/playwright', 'Reliable browser automation framework.', ARRAY['browser','testing'], 'beginner', 'automation', 'en', TRUE, 76000),
('Selenium', 'tool', 'https://github.com/SeleniumHQ/selenium', 'Classic web automation framework.', ARRAY['browser','automation'], 'beginner', 'automation', 'en', TRUE, 32000),
('Scrapy', 'tool', 'https://github.com/scrapy/scrapy', 'Python framework for web crawling.', ARRAY['crawler','data'], 'intermediate', 'automation', 'en', TRUE, 56000),
('Pandas', 'tool', 'https://github.com/pandas-dev/pandas', 'Data analysis and manipulation library.', ARRAY['data','python'], 'beginner', 'data-engineering', 'en', TRUE, 46000),
('Polars', 'tool', 'https://github.com/pola-rs/polars', 'Fast DataFrame library for Rust/Python.', ARRAY['dataframe','performance'], 'intermediate', 'data-engineering', 'en', TRUE, 33000),
('Apache Arrow', 'tool', 'https://github.com/apache/arrow', 'Columnar in-memory analytics format.', ARRAY['columnar','data'], 'advanced', 'data-engineering', 'en', TRUE, 16000),
('Great Expectations', 'tool', 'https://github.com/great-expectations/great_expectations', 'Data quality framework.', ARRAY['data-quality','testing'], 'intermediate', 'data-engineering', 'en', TRUE, 9500),
('Feast', 'tool', 'https://github.com/feast-dev/feast', 'Open-source feature store for ML.', ARRAY['feature-store','mlops'], 'advanced', 'mlops', 'en', TRUE, 6200),
('Evidently', 'tool', 'https://github.com/evidentlyai/evidently', 'Open-source ML monitoring and eval toolkit.', ARRAY['monitoring','evaluation'], 'intermediate', 'mlops', 'en', TRUE, 5800),
('Awesome LLM Apps', 'resource', 'https://github.com/Shubhamsaboo/awesome-llm-apps', 'Curated list of practical LLM apps.', ARRAY['awesome-list','apps'], 'beginner', 'agents', 'en', TRUE, 30000)
ON CONFLICT (url) DO NOTHING;
