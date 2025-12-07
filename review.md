 1. Backend Core (~30 min)

  - server/app.py - Remove legacy endpoints, verify static serving
  - server/routers/agent.py - Clean up comments, verify handler registry extensibility
  - server/routers/chat.py - Check for old code paths
  - server/agents/handlers/databricks_endpoint.py - Remove failed attempt code, verify clean implementation

  Focus: Remove commented code, verify handler pattern is clean

  2. Backend Storage & Config (~15 min)

  - server/chat_storage.py - Verify matches documented behavior
  - server/config_loader.py - Check for hardcoded assumptions about deployment types
  - config/agents.json - Verify structure matches docs

  Focus: No hardcoded "databricks-endpoint" assumptions outside handlers

  3. Frontend Core (~30 min)

  - client/components/chat/ChatView.tsx - Remove debug logs, verify stream handling
  - client/app/page.tsx - Verify alert logic matches session-management.md
  - client/components/modals/TraceModal.tsx - Clean up, verify no MLflow API calls

  Focus: Remove console.logs, verify no dead code from old implementations

  4. Frontend Components (~15 min)

  - client/components/chat/MessageList.tsx - Check for old feedback code
  - client/components/chat/ChatInput.tsx - Verify agent selector works
  - client/components/modals/FeedbackModal.tsx - Verify optimistic UI

  Focus: Quick scan for legacy code

  5. Configuration & Build (~15 min)

  - client/next.config.ts - Verify static export config
  - .env.production - Check environment variables
  - pyproject.toml - Verify dependencies match usage

  Focus: No unused dependencies, correct build settings

  6. Documentation Consistency (~15 min)

  - Cross-check docs/features/*.md against actual code
  - Verify TODO.md matches reality
  - Check README has correct setup instructions

  Focus: Docs match implementation

  7. Security Scan (~15 min)

  - Check for exposed tokens/secrets
  - Verify no unsafe eval/exec
  - Check CORS settings
  - Verify input validation on endpoints

  Focus: Critical security issues only

  ---
  Execution Order

  1. Backend Core (most complex)
  2. Backend Storage (dependencies for frontend)
  3. Frontend Core (most complex)
  4. Frontend Components (quick wins)
  5. Config/Build (environment setup)
  6. Docs (verification)
  7. Security (final check)

  ---
  Output Per Section

  For each section, report:
  - ✅ Clean - No issues
  - ⚠️ Minor - Comments/logs to remove, not breaking
  - ❌ Issue - Breaks extensibility, wrong implementation, security risk

---

## BACKEND ARCHITECTURE & TECHNICAL FLOW

### Application Entry Point

**Main Process:**
```bash
# Production (Databricks Apps) - from app.yaml
uvicorn server.app:app --host 0.0.0.0 --port 8000

# Development (Local)
uvicorn server.app:app --reload --host 0.0.0.0 --port 8000
```

**What happens on startup:**
1. Python imports `server/app.py`
2. **Module-level execution** (runs immediately on import):
   - `server/tracing.py` imported → sets `mlflow.set_tracking_uri('databricks')` globally
   - `dotenv` loads `.env.local` (dev) or uses system env (prod)
   - `config_loader` singleton initialized → loads all JSON configs from `/config`
   - `ChatStorage` singleton initialized → creates empty in-memory storage
3. FastAPI `app` object created
4. Routers registered with `/api` prefix
5. Static file serving mounted (if `client/out/` exists)
6. Uvicorn starts HTTP server on port 8000

---

### Request Flow Diagram

**Development Mode:**
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                   (http://localhost:3000)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS DEV SERVER                            │
│                     (Port 3000)                                  │
│  ├─ Serves React app                                            │
│  └─ Proxies /api/* → http://localhost:8000/api/*               │
└────────────────────────┬────────────────────────────────────────┘
                         │ (Proxied API requests)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UVICORN HTTP SERVER                           │
│                     (Port 8000)                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              FastAPI Application                        │   │
│  │              (server/app.py)                            │   │
│  │                                                          │   │
│  │  Middleware Stack:                                      │   │
│  │  └─ CORSMiddleware (allow_origins=['http://localhost:3000'])│
│  │                                                          │   │
│  │  Route Resolution:                                      │   │
│  │  ├─ /api/health         → health.router                │   │
│  │  ├─ /api/config/*       → config.router                │   │
│  │  ├─ /api/invoke_endpoint → agent.router                │   │
│  │  ├─ /api/log_assessment → agent.router                 │   │
│  │  ├─ /api/chats/*        → chat.router                  │   │
│  │  └─ /* → 404 (no static files in dev)                  │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Production Mode (Databricks Apps):**
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│         (https://my-app-xxxxx.databricksapps.com)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UVICORN HTTP SERVER                           │
│                     (Port 8000)                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              FastAPI Application                        │   │
│  │              (server/app.py)                            │   │
│  │                                                          │   │
│  │  Middleware Stack:                                      │   │
│  │  └─ CORSMiddleware (allow_origins=[])                  │   │
│  │     ↑ Empty = same-origin only (most secure)           │   │
│  │                                                          │   │
│  │  Route Resolution:                                      │   │
│  │  ├─ /api/health         → health.router                │   │
│  │  ├─ /api/config/*       → config.router                │   │
│  │  ├─ /api/invoke_endpoint → agent.router                │   │
│  │  ├─ /api/log_assessment → agent.router                 │   │
│  │  ├─ /api/chats/*        → chat.router                  │   │
│  │  └─ /*                  → StaticFiles(directory='client/out')│
│  │     ↑ Serves Next.js static export (created by 'npm run build')│
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (Example: POST /api/invoke_endpoint)
                         │
┌────────────────────────────────────────────────────────────────┐
│                    AGENT ROUTER                                 │
│              server/routers/agent.py                            │
│                                                                 │
│  @router.post('/invoke_endpoint')                              │
│  async def invoke_endpoint(options: InvokeEndpointRequest)     │
│                                                                 │
│  1. Generate client_request_id (req-xxxxx)                     │
│  2. Look up agent config via config_loader.get_agent_by_id()   │
│  3. Set MLflow experiment ID                                   │
│  4. Create MLflow trace (router trace for feedback linking):   │
│     └─ mlflow.start_span() → creates trace                     │
│     └─ mlflow_client.set_trace_tag('client_request_id', ...)  │
│  5. Get deployment_type from agent config                      │
│  6. Look up handler class from DEPLOYMENT_HANDLERS registry    │
│  7. Instantiate handler (e.g., DatabricksEndpointHandler)      │
│  8. Call handler.invoke_stream() or handler.invoke()           │
│  9. Return StreamingResponse (SSE) or JSON                     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│               DEPLOYMENT HANDLER                                │
│     server/agents/handlers/databricks_endpoint.py              │
│                                                                 │
│  class DatabricksEndpointHandler(BaseDeploymentHandler)        │
│                                                                 │
│  async def invoke_stream():                                    │
│    1. Check ENV variable (development vs production)           │
│    2. Get Databricks credentials:                              │
│       - Development: DATABRICKS_HOST + DATABRICKS_TOKEN (PAT)  │
│       - Production: WorkspaceClient() (OAuth)                  │
│    3. Build request payload (Databricks Agent API format):     │
│       {'input': messages, 'stream': True}                      │
│    4. POST to https://{host}/serving-endpoints/{name}/invocations│
│    5. Stream response via httpx.AsyncClient.stream():          │
│       ├─ Emit client_request_id event first                    │
│       ├─ Forward each SSE line from Databricks                 │
│       └─ Parse and validate JSON events                        │
│    6. Yield SSE-formatted chunks to client                     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│              DATABRICKS MODEL SERVING                           │
│         (External - runs on Databricks infrastructure)         │
│                                                                 │
│  Agent Endpoint (e.g., "databricks-agent-01")                  │
│  ├─ Receives: {'input': [...messages], 'stream': True}        │
│  ├─ Executes: LangChain agent with tools                       │
│  ├─ Creates: MLflow trace (agent trace - separate from router) │
│  └─ Streams: SSE events back to handler                        │
│                                                                 │
│  SSE Events Streamed:                                          │
│  ├─ response.output_text.delta (text chunks)                   │
│  ├─ response.output_item.done (function calls, final text)     │
│  ├─ trace.summary (trace metadata at end)                      │
│  └─ [DONE] (end of stream)                                     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ (SSE stream flows back up the stack)
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                               │
│              client/components/chat/ChatView.tsx                │
│                                                                 │
│  1. fetch('/api/invoke_endpoint')                              │
│  2. Read SSE stream with response.body.getReader()             │
│  3. Parse each 'data:' line as JSON event                      │
│  4. Handle events:                                             │
│     ├─ trace.client_request_id → Store for feedback           │
│     ├─ response.output_text.delta → Append to message         │
│     ├─ response.output_item.done → Collect function calls     │
│     └─ trace.summary → Attach to message                      │
│  5. Save messages to backend: POST /api/chats/{id}/messages   │
└────────────────────────────────────────────────────────────────┘
```

---

### Feedback Flow

```
USER CLICKS THUMBS UP/DOWN
        │
        ▼
┌────────────────────────────────────────┐
│  POST /api/log_assessment              │
│  {                                     │
│    trace_id: "req-xxxxx",             │  ← client_request_id
│    agent_id: "databricks-agent-01",   │
│    assessment_value: true/false       │
│  }                                     │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────┐
│  server/routers/agent.py                                    │
│  @router.post('/log_assessment')                           │
│                                                             │
│  1. Get agent config → mlflow_experiment_id                │
│  2. Call find_trace_for_feedback(client_request_id)        │
│     ├─ Search MLflow for router trace (by tag)             │
│     ├─ Check deployment_type from agent config             │
│     └─ If 'databricks-endpoint':                           │
│         └─ Call _find_databricks_agent_trace()             │
│             └─ Time-proximity search (±2 seconds)           │
│             └─ Find agent's server-side trace               │
│  3. mlflow.log_feedback(trace_id=agent_trace_id, ...)      │
└─────────────────────────────────────────────────────────────┘
```

---

### Configuration Loading (Startup)

```
APPLICATION STARTS
        │
        ▼
server/app.py imports server/config_loader.py
        │
        ▼
┌──────────────────────────────────────────┐
│  ConfigLoader.__init__()                 │
│  (runs on module import - singleton)     │
│                                          │
│  1. Locate config directory:             │
│     /config (relative to project root)   │
│  2. Load JSON files:                     │
│     ├─ app.json → branding, dashboard    │
│     ├─ agents.json → agent definitions   │
│     └─ about.json → about page content   │
│  3. Cache in memory                      │
│  4. Log: "✅ Configuration loaded: N agents"│
└──────────────────────────────────────────┘
        │
        ▼
Global singleton: config_loader
  ├─ .get_agent_by_id(id) → Used by routers
  ├─ .agents_config → All agents
  └─ .app_config → Branding/dashboard
```

---

### Chat Storage (In-Memory)

```
POST /api/chats (Create new chat)
        │
        ▼
┌────────────────────────────────────────┐
│  server/chat_storage.py                │
│  Global singleton: storage             │
│                                        │
│  storage.create(title, agent_id)      │
│  ├─ Check if 10 chats exist           │
│  ├─ If yes: Delete oldest (by updated_at)│
│  ├─ Create Chat object:               │
│  │   {                                │
│  │     id: "chat_xxxxx",              │
│  │     title: "...",                  │
│  │     agent_id: "...",               │
│  │     messages: [],                  │
│  │     created_at: now,               │
│  │     updated_at: now                │
│  │   }                                │
│  └─ Store in self.chats dict          │
└────────────────────────────────────────┘
        │
        ▼
POST /api/chats/{id}/messages (Save messages after streaming)
        │
        ▼
┌────────────────────────────────────────┐
│  storage.add_message(chat_id, msg)    │
│  ├─ Append Message to chat.messages  │
│  ├─ Update chat.updated_at            │
│  └─ Auto-generate title from 1st msg │
└────────────────────────────────────────┘
```

---

### Environment Variable Flow

```
DEPLOYMENT MODE DETECTION
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  ENV variable (set in .env.local or app.yaml)        │
│  ├─ ENV=development → Local dev with PAT             │
│  └─ ENV=production (default) → Databricks Apps OAuth│
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  server/agents/handlers/databricks_endpoint.py       │
│  get_databricks_credentials()                        │
│                                                      │
│  if env == 'development':                           │
│    ├─ Read DATABRICKS_HOST from os.getenv()        │
│    ├─ Read DATABRICKS_TOKEN from os.getenv()       │
│    └─ Log: "🔧 Development mode - using PAT"       │
│  else:                                              │
│    ├─ from databricks.sdk import WorkspaceClient   │
│    ├─ w = WorkspaceClient() (auto OAuth)           │
│    ├─ Get host/token from w.config                 │
│    └─ Log: "🚀 Production mode - using OAuth"      │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  Credentials used for all Databricks API calls:     │
│  └─ POST {host}/serving-endpoints/{name}/invocations│
└──────────────────────────────────────────────────────┘
```

---

### CORS Configuration & Security

**Why CORS is Environment-Dependent:**

```
DEVELOPMENT MODE (ENV=development):
  ├─ Frontend: http://localhost:3000 (Next.js dev server)
  ├─ Backend:  http://localhost:8000 (FastAPI)
  └─ Problem:  Different ports = different origins
      └─ Solution: allow_origins=['http://localhost:3000']

PRODUCTION MODE (ENV=production):
  ├─ Frontend: Served by FastAPI from client/out/
  ├─ Backend:  Same FastAPI server
  └─ Benefit:  Same origin = no CORS needed
      └─ Solution: allow_origins=[] (most secure, same-origin only)
```

**Security Implications:**

| Configuration | Security | Use Case |
|---------------|----------|----------|
| `allow_origins=[]` | ✅ **Most Secure** | Production (same-origin) |
| `allow_origins=['http://localhost:3000']` | ⚠️ Dev Only | Local development |
| `allow_origins=['*.databricksapps.com']` | ❌ **Insecure** | Allows ANY Databricks App to call your API |
| `allow_origins=['*']` | ❌ **Very Insecure** | Never use in production |

**Why wildcards are dangerous:**
- `*.databricksapps.com` would allow `https://malicious-app.databricksapps.com` to call your API
- An attacker could deploy a malicious Databricks App and steal user data via CSRF attacks
- Empty list `[]` means "only accept requests from the same domain", which is what you want

**Current Implementation (server/app.py:40-55):**
```python
env = os.getenv('ENV', 'production')
allowed_origins = ['http://localhost:3000'] if env == 'development' else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Environment-aware
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Static File Serving (Dev vs Production)

**Development Mode:**
```
DEVELOPMENT SETUP:
  ├─ NO client/out/ directory exists (not built yet)
  ├─ Next.js dev server runs separately: cd client && npm run dev
  ├─ User accesses: http://localhost:3000
  └─ FastAPI app.py startup:
      └─ build_path.exists() = False
      └─ Logs warning: "Next.js build directory not found"
      └─ Does NOT mount StaticFiles
      └─ All requests to FastAPI get 404 (except /api/* routes)

Next.js dev server handles:
  ├─ Serving React app with hot reload
  ├─ Proxying /api/* to http://localhost:8000
  └─ Fast refresh for code changes
```

**Production Mode:**
```
PRODUCTION BUILD:
  1. cd client && npm run build
     └─ Creates: client/out/ (Next.js static export)
     └─ Contains: HTML, JS bundles, CSS, assets (all pre-compiled)

  2. FastAPI app.py startup:
     └─ build_path.exists() = True (client/out/ found)
     └─ app.mount('/', StaticFiles(directory='client/out', html=True))
     └─ Logs: "Serving Next.js static files from client/out"

USER REQUEST:
  GET / or GET /chat or GET /about
        │
        ▼
  ┌──────────────────────────────────────┐
  │  FastAPI Route Resolution            │
  │  1. Check /api/* routes first        │
  │  2. If no match: StaticFiles handler │
  │     └─ Serve from client/out/        │
  │        ├─ HTML files (index.html)    │
  │        ├─ JS bundles (pre-compiled)  │
  │        ├─ CSS files                  │
  │        └─ Assets                     │
  └──────────────────────────────────────┘

Key difference: Static files are PRE-BUILT (no hot reload)
  └─ All React code compiled at build time
  └─ FastAPI just serves files (no processing)
```

**Code Implementation (server/app.py:60-68):**
```python
build_path = Path(".") / "client/out"
if build_path.exists():
    logger.info(f"Serving Next.js static files from {build_path}")
    app.mount("/", StaticFiles(directory=str(build_path), html=True), name="static")
else:
    logger.warning(
        f"Next.js build directory {build_path} not found. "
        "In development, run Next.js separately: cd client && npm run dev"
    )
```

---

### Summary: What Makes This Architecture Clean

✅ **Single Entry Point**: `server/app.py` - one main, clear startup
✅ **Router Pattern**: Endpoints organized by domain (agent, chat, config, health)
✅ **Handler Pattern**: Deployment types abstracted, easy to extend
✅ **Singleton Pattern**: config_loader, storage - loaded once, used everywhere
✅ **Side-Effect Imports**: tracing.py - MLflow setup happens on import (intentional)
✅ **ENV-Based Config**: Development vs Production detected cleanly
✅ **CORS Security**: Environment-aware (localhost in dev, same-origin in prod)
✅ **Static Serving**: Conditional mounting based on build directory existence
✅ **No Circular Dependencies**: Clean import hierarchy
✅ **FastAPI Auto-Docs**: Automatic OpenAPI/Swagger at `/docs`
