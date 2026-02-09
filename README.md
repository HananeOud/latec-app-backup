# Latecoere AI Portal

A branded AI portal for Latecoere, built on Databricks. Features a chat interface with Knowledge Agents, Multi-Agent Systems, Genie Spaces, embedded dashboards, and one-command deployment.

---

## Quick Start

### Prerequisites

- A Databricks workspace with **Serverless compute** and **Databricks Apps** enabled
- A **Personal Access Token** (Workspace > Settings > Developer > Access Tokens)
- At least one agent deployed (Knowledge Agent, Genie Space, or MAS)

### Deploy in 3 Steps

```bash
# 1. Configure environment
cp .env.template .env.local
# Edit .env.local → fill in your workspace URL, token, app name, path

# 2. Configure agents
# Edit config/app.json → replace <PLACEHOLDERS> with your agent IDs

# 3. Deploy (installs tools, builds frontend, creates app if needed, deploys)
./scripts/deploy.sh
```

That's it. The deploy script handles everything:
- Installs missing tools (`uv`, `bun`, `databricks CLI`) if needed
- Builds the React frontend
- **Creates the app automatically** if it doesn't exist
- Syncs code to your workspace
- Deploys the app

---

## What You Need to Change

### 1. Environment: `.env.local`

```bash
cp .env.template .env.local
```

Then edit `.env.local`:

| Variable | Replace with | Where to find it |
|----------|-------------|-----------------|
| `DATABRICKS_HOST` | Your workspace URL | Browser URL bar (e.g. `https://adb-123456789.cloud.databricks.com`) |
| `DATABRICKS_TOKEN` | Your Personal Access Token | Workspace > Settings > Developer > Access Tokens |
| `DATABRICKS_APP_NAME` | App name (lowercase, dashes) | Choose any name (e.g. `latec-app`) |
| `WORKSPACE_SOURCE_PATH` | `/Workspace/Users/<your-email>/<app-name>` | Use your Databricks login email |

### 2. App Config: `config/app.json`

Edit `config/app.json` and replace the placeholders in the `agents` array:

| Placeholder | Replace with | Where to find it |
|-------------|-------------|-----------------|
| `<YOUR_KA_ENDPOINT_NAME>` | Knowledge Agent endpoint name | Serving > Endpoints > copy **Name** |
| `<YOUR_GENIE_SPACE_ID>` | Genie space UUID | Genie > open space > ID in URL: `/genie/rooms/<ID>` |
| `<YOUR_LAKEVIEW_DASHBOARD_ID>` | Dashboard UUID (or `""` to disable) | Dashboard URL: `/sql/dashboardsv3/<ID>` |

You can also add a native MAS using `mas_id` or a custom MAS using `endpoint_name` — see [Agent Types](#agent-types) below.

### 3. (Optional) Notebooks

The `notebooks/` folder contains optional notebooks for advanced use cases. Each has its own `<PLACEHOLDER>` values — see instructions inside each file.

| Notebook | Use Case |
|----------|----------|
| `multi_agent_simple.py` | Simple Multi-Agent System (tool-calling supervisor) |
| `multi_agent_system.py` | Full LangGraph MAS with streaming |
| `uc2_impact_analysis.py` | UC2: Document impact analysis |
| `uc2_parse_and_prompt.py` | UC2: Parse PDF + generate KA prompt |
| `uc3_compliance_matrix.py` | UC3: Compliance matrix generator |

---

## Agent Types

The app supports these agent types in `config/app.json`:

| Type | Config Key | Description |
|------|-----------|-------------|
| **Serving Endpoint** | `endpoint_name` | Any model or agent deployed to Databricks Model Serving |
| **Native MAS** (Agent Bricks) | `mas_id` | A MAS created in Agent Bricks — auto-discovers sub-agents |
| **Custom MAS** | `endpoint_name` | A custom MAS deployed via the included notebooks |
| **Genie Space** | `genie_space_id` | Databricks Genie for natural language SQL queries |

Example `config/app.json` agents array:

```json
{
  "agents": [
    {
      "endpoint_name": "ka-xxxxxxxx-endpoint",
      "display_name": "Latecoere KA",
      "display_description": "Ask questions about your documents and knowledge base",
      "question_examples": ["How long does the rust protection last?"]
    },
    {
      "mas_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "display_name": "Latecoere MAS",
      "question_examples": ["What can you help me with?"]
    },
    {
      "genie_space_id": "01fxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "display_name": "Latecoere Genie",
      "display_description": "Query your data using natural language"
    }
  ]
}
```

---

## Post-Deployment: Authentication & Access Rights

After deployment, the app needs credentials to call your agents. There are **two approaches**:

### Approach A: Service Principal (Production)

By default, Databricks Apps run as an **auto-created service principal** (SP). You must grant it access to every resource:

> **Find your SP:** Compute > Apps > your app. The SP is listed as `app-xxxxx <app-name>`.

| Resource | Where to grant | Permission |
|----------|---------------|------------|
| **Serving Endpoints** (KA, custom MAS) | Serving > endpoint > Permissions | **CAN_QUERY** |
| **Native MAS tile** (Agent Bricks) | Agent Bricks > MAS > Share | **CAN_MANAGE** |
| **Genie Spaces** | Genie > space > Share | **CAN_RUN** |
| **Lakeview Dashboards** | Dashboard > Share | **CAN_RUN** |
| **MLflow Experiments** | Experiment > Permissions | **CAN_MANAGE** |

> **Important:** Native MAS tiles need **CAN_MANAGE**, not just CAN_QUERY.

### Approach B: Personal Access Token (Demos — recommended for hackathons)

Use your own PAT so the app runs with **your identity**. No per-resource permissions needed.

Add these to your `app.yaml`:

```yaml
env:
  - name: DATABRICKS_HOST
    value: "https://your-workspace.cloud.databricks.com"
  - name: DATABRICKS_TOKEN
    value: "dapi_your_token_here"
```

Then redeploy with `./scripts/deploy.sh`.

| | Service Principal | Personal Access Token |
|---|---|---|
| **Setup** | Grant permissions on each resource | Add 2 env vars to `app.yaml` |
| **Token expiry** | Never (auto-managed) | PAT expires (default 90 days) |
| **Best for** | Production | Demos, hackathons |

> **Warning:** Make sure `.env.local` is **NOT** uploaded to the workspace — it's for local dev only.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `No Agents Configured` | Check `config/app.json` — each agent needs `endpoint_name`, `mas_id`, or `genie_space_id` |
| `MAS Unavailable` / `no read access` | Grant **CAN_MANAGE** on the MAS tile (not CAN_QUERY) |
| `Agent not found` / `403` | Grant **CAN_QUERY** to the SP on the serving endpoint |
| All agents fail at once | One agent's permission error can cascade — check all resources |
| Dashboard blank | Check `dashboardId` + grant **CAN_RUN** to the SP |
| Genie not responding | Share the Genie space with the SP (**CAN_RUN**) |
| `Maximum number of apps` | Delete unused apps in Compute > Apps |
| `.env.local` not working | Ensure it's NOT in the deployed workspace |

---

## Project Structure

```
├── config/app.json               # <-- EDIT: agent endpoints, Genie ID, dashboard ID
├── .env.local                    # <-- EDIT: workspace URL, token, app name
├── notebooks/                    # Optional: MAS, UC2, UC3 notebooks
│   ├── multi_agent_simple.py     # Simple MAS (tool-calling supervisor)
│   ├── multi_agent_system.py     # Full LangGraph MAS
│   ├── uc2_impact_analysis.py    # UC2: Document impact analysis
│   ├── uc2_parse_and_prompt.py   # UC2: Parse PDF + generate KA prompt
│   ├── uc3_compliance_matrix.py  # UC3: Compliance matrix generator
│   └── sample_data/              # Sample documents for testing UC3
├── server/                       # FastAPI backend (no changes needed)
├── client/                       # React frontend (Latecoere branding included)
│   ├── public/logos/             # Latecoere logo
│   └── src/lib/themes.ts        # Brand colors (already configured)
├── scripts/
│   ├── start_dev.sh              # Local development
│   └── deploy.sh                 # One-command deploy (creates app + builds + deploys)
├── app.yaml                      # Databricks Apps runtime config
└── SETUP_GUIDE.md                # Detailed step-by-step setup guide
```

---

For the detailed step-by-step guide, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.
