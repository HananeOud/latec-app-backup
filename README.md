# Databricks GenAI App Template

A production-ready template for building AI agent applications on Databricks. Features a modern React chat interface with streaming responses, FastAPI backend, support for Serving Endpoints, Multi-Agent Supervisors, and Genie Spaces, optional PostgreSQL persistence, and one-command deployment to Databricks Apps.

![Chat Interface](docs/images/chat-ui.png)

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Key Features

- **Multi-Agent Chat** — connect Serving Endpoints, Multi-Agent Supervisors (MAS), and Genie Spaces
- **Streaming Responses** — real-time SSE streaming with function call notifications
- **Genie Space Integration** — natural language data queries via the Databricks Genie API
- **MLflow Tracing** — view agent traces, tool calls, and token usage in the UI
- **User Feedback** — thumbs up/down logged to MLflow for evaluation
- **Dashboard Embedding** — embed Lakeview dashboards directly in the app
- **Theme Customization** — in-app editor for colors, fonts, and animated backgrounds
- **Chart Rendering** — automatic visualization of tabular data from agent responses
- **Persistent Chat History** — optional PostgreSQL storage via Databricks Lakebase

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite, React 18, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | FastAPI, Python 3.11+, async SQLAlchemy |
| **Database** | In-memory (default) or PostgreSQL via Databricks Lakebase |
| **AI/ML** | Databricks Model Serving, Genie API, MLflow |
| **Deployment** | Databricks Apps with OAuth authentication |

---

## Installation

### Step 1: Install Required Tools

| Tool | Purpose | Install |
|------|---------|---------|
| **uv** | Python package manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **bun** | JavaScript runtime & bundler | `curl -fsSL https://bun.sh/install \| bash` |
| **Databricks CLI** | Deployment to workspace | `curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh \| sh` |

### Step 2: Clone and Install Dependencies

```bash
git clone https://github.com/HananeOud/databricks-genai-app-template.git
cd databricks-genai-app-template

# Install Python dependencies
uv sync

# Install frontend dependencies
cd client && bun install && cd ..
```

### Step 3: Create Your Environment File

```bash
cp .env.template .env.local
```

Edit `.env.local` with your Databricks workspace details:

```env
# REQUIRED — Your Databricks workspace URL
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com

# REQUIRED — Personal Access Token (for local dev only; not needed in production)
# Generate from: Workspace > Settings > Developer > Access Tokens
DATABRICKS_TOKEN=dapi_your_token_here

# REQUIRED FOR DEPLOYMENT — App name (lowercase, numbers, dashes only)
DATABRICKS_APP_NAME=my-company-app

# REQUIRED FOR DEPLOYMENT — Where code is synced in your workspace
WORKSPACE_SOURCE_PATH=/Workspace/Users/your.email@company.com/my-company-app

# OPTIONAL — Persistent chat history via Databricks Lakebase
LAKEBASE_PG_URL=postgresql://user:pass@host/databricks_postgres?sslmode=require
LAKEBASE_PROJECT_ID=your-project-id
```

| Variable | Where to find it |
|----------|-----------------|
| `DATABRICKS_HOST` | Your workspace URL in the browser (e.g. `https://adb-123456789.azuredatabricks.net`) |
| `DATABRICKS_TOKEN` | Workspace > Profile (top-right) > **Settings** > **Developer** > **Access tokens** > Generate new token |
| `DATABRICKS_APP_NAME` | Choose any name: lowercase, numbers, dashes (e.g. `sales-ai-portal`) |
| `WORKSPACE_SOURCE_PATH` | `/Workspace/Users/<your-databricks-email>/<app-name>` |
| `LAKEBASE_PG_URL` | Workspace > **Lakebase** > your project > **Connection** tab |
| `LAKEBASE_PROJECT_ID` | From the Lakebase project URL: `.../lakebase/projects/<this-id>` |

### Step 4: Configure Your Agents

Edit `config/app.json` and replace the `agents` array with your own. The app supports three agent types:

```json
{
  "agents": [
    {
      "endpoint_name": "your-serving-endpoint-name",
      "display_name": "Knowledge Agent",
      "display_description": "Ask questions about your documents",
      "question_examples": ["What is our return policy?"],
      "mlflow_experiment_id": "123456789"
    },
    {
      "endpoint_name": "your-mas-endpoint-name",
      "display_name": "Multi-Agent Assistant",
      "question_examples": ["What can you help me with?"]
    },
    {
      "genie_space_id": "your-genie-space-id",
      "display_name": "Data Analyst",
      "display_description": "Query your data using natural language"
    }
  ]
}
```

| Agent Type | Config Key | Where to find the ID |
|------------|-----------|----------------------|
| **Serving Endpoint** | `endpoint_name` | Workspace > **Serving** > click endpoint > copy the **Name** |
| **Multi-Agent Supervisor** | `endpoint_name` | Workspace > **Serving** > find the MAS endpoint name |
| **Genie Space** | `genie_space_id` | Workspace > **Genie** > open your space > copy ID from URL: `.../genie/rooms/<this-id>` |

Optional agent fields:

| Field | Description |
|-------|-------------|
| `display_name` | Friendly name shown in the chat UI |
| `display_description` | Description in the agent selector dropdown |
| `question_examples` | Clickable example questions shown below the chat input |
| `mlflow_experiment_id` | Links traces to an MLflow experiment for feedback |

### Step 5: Update Branding

In the same `config/app.json`, update the branding and home page:

```json
{
  "branding": {
    "name": "Your Company",
    "logo": "/logos/your-logo.png"
  },
  "home": {
    "title": "Your Portal Title",
    "description": "A short description for the home page"
  },
  "dashboard": {
    "title": "Dashboard",
    "subtitle": "Your dashboard description",
    "dashboardId": "your-lakeview-dashboard-id",
    "showPadding": true
  }
}
```

- **Logo**: Place your logo file in `client/public/logos/` and reference it in the config
- **Dashboard ID**: Find it in the Lakeview dashboard URL: `.../sql/dashboardsv3/<this-id>`. Set to `""` to disable the dashboard tab.

### Step 6: Customize Theme Colors (Optional)

To match your brand colors, edit `client/src/lib/themes.ts`. The key values to change:

```typescript
colors: {
  accentPrimary: "#0055A4",   // Your brand color (buttons, links, accents)
  textHeading: "#1A1A1A",     // Heading text color
  bgPrimary: "#FFFFFF",       // Main background
  animatedBgColor: "#0C1C3E", // Animated background particles
}
```

To use custom fonts, update the Google Fonts import in `client/src/styles/globals.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=YourFont:wght@400;500;600;700&display=swap");
```

Then set them in `themes.ts`:

```typescript
typography: {
  primaryFont: '"YourHeadingFont", sans-serif',
  secondaryFont: '"YourBodyFont", sans-serif',
}
```

---

## Local Development

Run the app locally to test before deploying:

```bash
./scripts/start_dev.sh
```

This starts:
- **Backend** (FastAPI): http://localhost:8000
- **Frontend** (Vite): http://localhost:3000

Press `Ctrl+C` to stop both servers.

### Verification Checklist

- [ ] Home page loads with your branding and logo
- [ ] Agents appear in the chat input dropdown
- [ ] Sending a message returns a response
- [ ] Dashboard tab shows your embedded dashboard (if configured)

---

## Deployment

### First-time: Create the App

**Option A — Via the Databricks UI:**
1. Go to your workspace > **Compute** > **Apps**
2. Click **Create App**
3. Enter the name matching `DATABRICKS_APP_NAME` in your `.env.local`

**Option B — Via CLI:**
```bash
source .env.local
databricks apps create $DATABRICKS_APP_NAME --description "Your app description"
```

> **Note:** App names must be lowercase letters, numbers, and dashes only.

### Deploy

```bash
./scripts/deploy.sh
```

This automatically:
1. Generates `requirements.txt` from `pyproject.toml`
2. Builds the frontend to `client/out/`
3. Syncs all code to your Databricks workspace
4. Deploys the app via Databricks Apps

### After Deployment

- **Access**: Workspace > **Compute** > **Apps** > click your app
- **URL**: `https://<app-name>-<workspace-id>.aws.databricksapps.com`
- **Logs**: App page > **Logs** tab
- **Health**: `https://<your-app-url>/api/health`
- **Update**: Just re-run `./scripts/deploy.sh` after any changes

> **Production auth**: Databricks Apps handles OAuth automatically — no tokens needed.

---

## Customization

### About Page Content

Edit `client/src/components/about/AboutView.tsx` to update section titles, descriptions, and feature lists. Replace images in `client/public/images/`.

### Top Navigation Bar Color

In `client/src/components/layout/TopBar.tsx`, search for `bg-[#0C1C3E]` and replace with your brand's dark color.

### Adding New Pages

1. Create `client/src/pages/YourPage.tsx`
2. Add a route in `client/src/App.tsx`
3. Add a tab in `client/src/components/layout/TopBar.tsx`

### Adding Backend Endpoints

```python
# server/routers/your_router.py
from fastapi import APIRouter
router = APIRouter()

@router.get('/your-endpoint')
async def your_endpoint():
    return {"data": "value"}

# Register in server/app.py
from .routers import your_router
app.include_router(your_router.router, prefix='/api')
```

### Chat Storage

| Mode | Config | Details |
|------|--------|---------|
| **In-Memory** (default) | No config needed | Max 10 chats/user, lost on restart |
| **PostgreSQL** (production) | Set `LAKEBASE_PG_URL` | Persistent, migrations run automatically |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `App name must contain only lowercase letters, numbers, and dashes` | Rename `DATABRICKS_APP_NAME` in `.env.local` to use only `a-z`, `0-9`, `-` |
| `WORKSPACE_SOURCE_PATH is not set` | Set it in `.env.local` to `/Workspace/Users/<your-email>/<app-name>` |
| `does not have Manage permissions` | Check the casing of your email in `WORKSPACE_SOURCE_PATH` — must match your Databricks username exactly |
| `Maximum number of apps reached` | Delete unused apps in **Compute** > **Apps** |
| `Agent not found` | Verify `endpoint_name` or `genie_space_id` in `config/app.json` |
| `Serving endpoint is not ready` | Check endpoint status in **Serving** — must show **Ready** |
| `Genie error: 'id'` | Ensure `genie_space_id` in `config/app.json` is correct |
| Dashboard shows blank | Verify `dashboardId` and that the app service principal has access |
| Auth errors (local) | Check `DATABRICKS_HOST` and `DATABRICKS_TOKEN` in `.env.local` |
| Auth errors (production) | The app service principal needs access to your endpoints and Genie spaces |
| Chat history lost on restart | Set `LAKEBASE_PG_URL` in `.env.local` for persistent storage |
| Build failures | Run `uv sync` and `cd client && bun install`, then retry |

---

## Project Structure

```
databricks-genai-app-template/
├── config/
│   └── app.json                 # Agents, branding, dashboard config
├── server/                       # FastAPI backend
│   ├── app.py                   # Entry point
│   ├── routers/                 # API endpoints (agent, chat, config, health)
│   ├── services/agents/handlers/# Agent handlers (endpoint, genie)
│   ├── services/chat/           # Storage backends (memory, postgres)
│   └── db/                      # SQLAlchemy models & migrations
├── client/                       # React frontend
│   ├── src/components/          # UI components (chat, layout, about, etc.)
│   ├── src/lib/themes.ts        # Color themes and typography
│   ├── src/styles/              # CSS (globals, theme variables)
│   └── public/                  # Static assets (logos, images)
├── scripts/
│   ├── start_dev.sh             # Start local dev servers
│   └── deploy.sh                # Deploy to Databricks Apps
├── .env.template                 # Environment variables template
├── app.yaml                      # Databricks Apps runtime config
├── SETUP_GUIDE.md                # Detailed setup guide
└── pyproject.toml                # Python dependencies
```

## Development Commands

```bash
./scripts/start_dev.sh   # Start backend + frontend locally
./scripts/deploy.sh      # Build and deploy to Databricks Apps
./scripts/fix.sh         # Format code (ruff + prettier)
./scripts/check.sh       # Lint and type check
```

---

## License

 2025 Databricks, Inc. All rights reserved. Subject to the [Databricks License](https://databricks.com/db-license-source).

For the detailed step-by-step guide, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.
