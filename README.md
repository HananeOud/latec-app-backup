# Databricks GenAI App Template

A production-ready template for building AI agent applications on Databricks. Features a React chat interface, FastAPI backend, support for Serving Endpoints, Multi-Agent Systems, and Genie Spaces, and one-command deployment to Databricks Apps.

---

## What You Get

- **Multi-Agent Chat UI** — connect Knowledge Agents, custom MAS endpoints, and Genie Spaces
- **Streaming Responses** — real-time SSE streaming with tool call notifications
- **Genie Space Integration** — natural language data queries via Databricks Genie API
- **Dashboard Embedding** — embed Lakeview dashboards directly in the app
- **Theme Customization** — colors, fonts, and branding via config

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

### 3. (Optional) MAS Notebooks

The `notebooks/` folder contains optional notebooks to build and deploy your own Multi-Agent System. Each notebook has its own `<PLACEHOLDER>` values to fill in — see the instructions inside each file.

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

## Agent Types

The app supports three types of agents in `config/app.json`:

| Type | Config Key | Description |
|------|-----------|-------------|
| **Serving Endpoint** | `endpoint_name` | Any model or agent deployed to Databricks Model Serving |
| **Native MAS** (Agent Bricks) | `mas_id` | A MAS created in Agent Bricks — auto-discovers sub-agents, doc counts, table counts |
| **Custom MAS** | `endpoint_name` | A custom MAS deployed via the included notebooks |
| **Genie Space** | `genie_space_id` | Databricks Genie for natural language SQL queries |

You can configure as many agents as you want. Users switch between them in the chat UI.

---

## Post-Deployment: Authentication & Access Rights

After deploying to Databricks Apps, the app needs credentials to call your agents, Genie spaces, and dashboards. There are **two approaches**:

---

### Approach A: Service Principal (Production — recommended)

By default, Databricks Apps run as an **auto-created service principal** (SP). No tokens to manage, but you must grant the SP access to every resource the app uses.

> **Find your SP name:** Go to Compute > Apps > your app. The SP is listed as `app-xxxxx <app-name>`.

#### Required Permissions

| Resource | Where to grant | Permission level | Notes |
|----------|---------------|-----------------|-------|
| **Serving Endpoints** (KA, custom MAS) | Serving > endpoint > Permissions | **CAN_QUERY** | Required for each `endpoint_name` in config |
| **Native MAS tile** (Agent Bricks) | Agent Bricks > MAS > Share | **CAN_MANAGE** | Required when using `mas_id` in config. `CAN_QUERY` is **not enough** — the app needs to read tile metadata (sub-agents, descriptions, doc/table counts) |
| **Genie Spaces** | Genie > space > Share | **CAN_RUN** | Required for each `genie_space_id` in config |
| **Lakeview Dashboards** | Dashboard > Share | **CAN_RUN** | Required if `dashboardId` is set in config |
| **MLflow Experiments** | Experiment > Permissions | **CAN_MANAGE** | Required for feedback logging (thumbs up/down) |

#### Common issues with this approach

- `"You do not have read access to the agent"` → The SP needs **CAN_MANAGE** on the MAS tile (not just CAN_QUERY)
- `"No Agents Configured"` with all agents failing → One agent's permission error can crash all agents; check SP access on every resource
- `403 Permission Denied` → SP is missing CAN_QUERY on the serving endpoint

---

### Approach B: Personal Access Token (Demos & Hackathons — quick setup)

Use your own PAT so the app runs with **your identity**. Simpler setup — no per-resource permissions needed since you already have access to everything.

#### How to set it up

Add these environment variables to your `app.yaml`:

```yaml
env:
  - name: DATABRICKS_HOST
    value: "https://your-workspace.cloud.databricks.com"
  - name: DATABRICKS_TOKEN
    value: "dapi_your_token_here"
```

Then redeploy. The app will use your PAT instead of the SP's OAuth token.

#### Trade-offs

| | Service Principal | Personal Access Token |
|---|---|---|
| **Setup** | Grant permissions on each resource | Just add 2 env vars to `app.yaml` |
| **Token expiry** | Never (auto-managed OAuth) | PAT expires (default 90 days) |
| **Identity** | App has its own identity | All actions run as you |
| **Best for** | Production, shared apps | Demos, hackathons, quick testing |
| **MAS native view** | Needs CAN_MANAGE on tile | Works automatically |

> **Important:** If using Approach B, make sure `.env.local` is **NOT** in the deployed workspace — it can override `app.yaml` variables and cause conflicts.

---

## Customization

| What | File | Details |
|------|------|---------|
| Agents & branding | `config/app.json` | Agent endpoints, titles, dashboard (logo already set) |
| Brand colors | `client/src/lib/themes.ts` | `accentPrimary`, `animatedBgColor`, etc. |
| Custom fonts | `client/src/styles/globals.css` | Add `@import url(...)` for Google Fonts |
| Top bar color | `client/src/components/layout/TopBar.tsx` | Search for `bg-[#0C1C3E]` |
| About page | `client/src/components/about/AboutView.tsx` | Section titles, descriptions, images |
| Images | `client/public/images/` | Replace with your own images |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `No Agents Configured` | Check `config/app.json` — each agent needs `endpoint_name`, `mas_id`, or `genie_space_id` |
| `MAS Unavailable` / `no read access` | Grant **CAN_MANAGE** (not CAN_QUERY) on the MAS tile in Agent Bricks > Share |
| `Agent not found` / `403` | Grant `CAN_QUERY` permission to the app's service principal on the serving endpoint |
| All agents fail at once | One agent's unhandled error can cascade — check permissions on every configured resource |
| Dashboard shows blank | Check `dashboardId` and grant **CAN_RUN** on the dashboard to the SP |
| Genie not responding | Share the Genie space with the SP (**CAN_RUN**) |
| `Maximum number of apps reached` | Delete unused apps in Compute > Apps |
| Fonts not loading | Ensure fonts are imported in `client/src/styles/globals.css` |
| `.env.local` not working | Make sure `.env.local` is NOT uploaded to the workspace (it's for local dev only) |
| PAT approach not working | Check that `DATABRICKS_TOKEN` in `app.yaml` is valid and not expired |

---

## Project Structure

```
├── config/app.json               # <-- EDIT THIS: agent endpoints, dashboard ID
├── .env.local                    # <-- EDIT THIS: workspace URL, token, app name
├── notebooks/                    # Optional: MAS and UC2 notebooks
│   ├── multi_agent_simple.py     # Simple MAS (tool-calling supervisor)
│   ├── multi_agent_system.py     # Full LangGraph MAS
│   └── uc2_impact_analysis.py    # Document impact analysis
├── server/                       # FastAPI backend (no changes needed)
├── client/                       # React frontend (branding already configured)
│   ├── public/logos/             # Latecoere logo included
│   ├── public/images/            # Images for about page
│   └── src/lib/themes.ts        # Optional: adjust brand colors
├── scripts/
│   ├── start_dev.sh              # Local development
│   └── deploy.sh                 # Deploy to Databricks Apps
├── app.yaml                      # Databricks Apps runtime config (no changes needed)
└── SETUP_GUIDE.md                # Detailed step-by-step setup guide
```

---

For the detailed step-by-step guide, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.
