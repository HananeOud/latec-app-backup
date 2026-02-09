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
| `No Agents Configured` | Check `config/app.json` — each agent needs `endpoint_name` or `genie_space_id` |
| `Agent not found` / `403` | Grant `CAN_QUERY` permission to the app's service principal on the endpoint |
| Dashboard shows blank | Check `dashboardId` and grant dashboard access to the service principal |
| `Maximum number of apps reached` | Delete unused apps in Compute > Apps |
| Fonts not loading | Ensure fonts are imported in `client/src/styles/globals.css` |
| `.env.local` not working | Make sure `.env.local` is NOT uploaded to the workspace (it's for local dev only) |

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
