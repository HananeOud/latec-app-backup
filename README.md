# Databricks GenAI App Template

A production-ready template for building AI agent applications on Databricks. Features a React chat interface, FastAPI backend, support for Serving Endpoints, Multi-Agent Systems, and Genie Spaces, and one-command deployment to Databricks Apps.

---

## What You Get

- **Multi-Agent Chat UI** — connect Knowledge Agents, custom MAS endpoints, and Genie Spaces
- **Streaming Responses** — real-time SSE streaming with tool call notifications
- **Genie Space Integration** — natural language data queries via Databricks Genie API
- **Dashboard Embedding** — embed Lakeview dashboards directly in the app
- **Theme Customization** — colors, fonts, and branding via config
- **MAS Notebooks** — ready-to-run notebooks to build and deploy your own Multi-Agent System
- **UC2 Impact Analysis** — document impact scanner notebook with `ai_parse_document` support

---

## What You Need to Change

All customer-specific values are marked with `<PLACEHOLDER>` tags. Here is the complete list:

### 1. Environment: `.env.local`

| Placeholder | Replace with | Where to find it |
|-------------|-------------|-----------------|
| `<YOUR_WORKSPACE>` | Your Databricks workspace hostname | Browser URL bar (e.g. `adb-123456789.azuredatabricks.net`) |
| `dapi_your_token_here` | Your Personal Access Token | Workspace > Settings > Developer > Access Tokens |
| `my-company-app` | Your app name (lowercase, dashes) | Choose any name |
| `your.email@company.com` | Your Databricks email | Your login email |

### 2. App Config: `config/app.json`

| Placeholder | Replace with | Where to find it |
|-------------|-------------|-----------------|
| `<YOUR_KA_ENDPOINT_NAME>` | Knowledge Agent endpoint name | Workspace > Serving > Endpoints > copy **Name** |
| `<YOUR_GENIE_SPACE_ID>` | Genie space UUID | Workspace > Genie > open space > ID in URL: `/genie/rooms/<ID>` |
| `<YOUR_LAKEVIEW_DASHBOARD_ID>` | Dashboard UUID (or `""` to disable) | Dashboard URL: `/sql/dashboardsv3/<ID>` |
| `your-logo.png` | Your company logo filename | Place file in `client/public/logos/` |

### 3. MAS Notebooks: `notebooks/multi_agent_simple.py` and `notebooks/multi_agent_system.py`

| Placeholder | Replace with | Where to find it |
|-------------|-------------|-----------------|
| `<YOUR_GENIE_SPACE_ID>` | Genie space UUID | Same as above |
| `<YOUR_KA_ENDPOINT_NAME>` | KA endpoint name | Same as above |
| `<YOUR_CATALOG>.<YOUR_SCHEMA>` | Unity Catalog path | Workspace > Catalog > pick a catalog.schema you own |
| `<YOUR_MAS_ENDPOINT_NAME>` | Name for the new MAS endpoint | Choose any name (e.g. `my-mas-endpoint`) |
| `<YOUR_WORKSPACE>` | Your workspace hostname | Same as `.env.local` |

### 4. UC2 Impact Analysis: `notebooks/uc2_impact_analysis.py`

| Placeholder | Replace with | Where to find it |
|-------------|-------------|-----------------|
| `<YOUR_KA_ENDPOINT_NAME>` | KA endpoint name | Same as above |
| `<YOUR_CATALOG>/<YOUR_SCHEMA>/<YOUR_VOLUME>` | UC Volume path to your document | Workspace > Catalog > Volumes |

---

## Quick Start (5 minutes)

```bash
# 1. Install tools (one-time)
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh

# 2. Install dependencies
uv sync
cd client && bun install && cd ..

# 3. Configure environment
cp .env.template .env.local
# Edit .env.local → fill in your workspace URL, token, app name, path

# 4. Configure agents
# Edit config/app.json → replace <PLACEHOLDERS> with your IDs

# 5. (Optional) Replace branding
# Put your logo in client/public/logos/
# Update logo path in config/app.json

# 6. Test locally
./scripts/start_dev.sh

# 7. Create app (first time only)
source .env.local
databricks apps create $DATABRICKS_APP_NAME --description "My AI Portal"

# 8. Deploy
./scripts/deploy.sh
```

---

## Included Notebooks

### `notebooks/multi_agent_simple.py` — Simple Multi-Agent System

A lightweight MAS using **ChatDatabricks with tool-calling** as the supervisor. The LLM decides which tool (Genie or Knowledge Agent) to call based on the user's question.

**When to use:** Quick setup, fewer dependencies, full control over routing logic.

### `notebooks/multi_agent_system.py` — Full LangGraph Supervisor

A more advanced MAS using **LangGraph Supervisor** pattern. Each agent runs as a separate node in a graph, with a supervisor LLM orchestrating the flow.

**When to use:** Complex multi-step workflows, need for agent handoffs, production-grade orchestration.

### `notebooks/uc2_impact_analysis.py` — Document Impact Scanner

Takes a new requirements document (PDF or text), extracts requirements, searches your Knowledge Base for matches, and generates a gap analysis report.

**Supports:** PDF via `ai_parse_document`, DOCX, plain text. Documents are read from UC Volumes.

**When to use:** Analyzing new client requirements against your existing knowledge base.

---

## Agent Types

The app supports three types of agents in `config/app.json`:

| Type | Config Key | Description |
|------|-----------|-------------|
| **Serving Endpoint** | `endpoint_name` | Any model or agent deployed to Databricks Model Serving |
| **Multi-Agent System** | `endpoint_name` | A custom MAS deployed via the included notebooks |
| **Genie Space** | `genie_space_id` | Databricks Genie for natural language SQL queries |

You can configure as many agents as you want. Users switch between them in the chat UI.

---

## Post-Deployment Checklist

After deploying to Databricks Apps, the app runs as a **service principal**. You must grant it access:

- [ ] **Serving Endpoints**: Go to Serving > your endpoint > Permissions > add the app's service principal with `CAN_QUERY`
- [ ] **Genie Spaces**: Share the Genie space with the app's service principal
- [ ] **Dashboards**: Share the Lakeview dashboard with the app's service principal
- [ ] **MLflow Experiments**: Grant access if using feedback logging

> **Tip:** Find the service principal name in Compute > Apps > your app > it shows as `app-xxxxx <app-name>`.

---

## Customization

| What | File | Details |
|------|------|---------|
| Agents & branding | `config/app.json` | Agent endpoints, logo, titles, dashboard |
| Brand colors | `client/src/lib/themes.ts` | `accentPrimary`, `animatedBgColor`, etc. |
| Custom fonts | `client/src/styles/globals.css` | Add `@import url(...)` for Google Fonts |
| Top bar color | `client/src/components/layout/TopBar.tsx` | Search for `bg-[#0C1C3E]` |
| About page | `client/src/components/about/AboutView.tsx` | Section titles, descriptions, images |
| Logo | `client/public/logos/` | Place your `.png` or `.svg` file here |
| Images | `client/public/images/` | Replace with your own images |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `No Agents Configured` | Check `config/app.json` — each agent needs `endpoint_name` or `genie_space_id` |
| `Agent not found` / `403` | Grant `CAN_QUERY` permission to the app's service principal on the endpoint |
| Dashboard shows blank | Check `dashboardId` and grant dashboard access to the service principal |
| `Maximum number of apps reached` | Delete unused apps in Compute > Apps |
| Fonts not loading | Ensure fonts are imported in `client/src/styles/globals.css` |
| `.env.local` not working | Make sure `.env.local` is NOT uploaded to the workspace (it's for local dev only) |

---

## Project Structure

```
├── config/app.json               # <-- EDIT THIS: agents, branding, dashboard
├── .env.local                    # <-- EDIT THIS: workspace URL, token, app name
├── notebooks/
│   ├── multi_agent_simple.py     # <-- EDIT THIS: MAS notebook (simple version)
│   ├── multi_agent_system.py     # <-- EDIT THIS: MAS notebook (LangGraph version)
│   └── uc2_impact_analysis.py    # <-- EDIT THIS: Document impact analysis
├── server/                       # FastAPI backend (no changes needed)
├── client/                       # React frontend
│   ├── public/logos/             # <-- PUT YOUR LOGO HERE
│   ├── public/images/            # <-- PUT YOUR IMAGES HERE
│   └── src/lib/themes.ts        # <-- OPTIONAL: brand colors
├── scripts/
│   ├── start_dev.sh              # Local development
│   └── deploy.sh                 # Deploy to Databricks Apps
├── app.yaml                      # Databricks Apps runtime config (no changes needed)
└── SETUP_GUIDE.md                # Detailed step-by-step setup guide
```

---

For the detailed step-by-step guide, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.
