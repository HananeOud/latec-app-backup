# Setup & Configuration Guide

A step-by-step guide to configure and deploy this application for your own Databricks environment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Agent Configuration](#4-agent-configuration)
5. [Branding & Theming](#5-branding--theming)
6. [Content Customization](#6-content-customization)
7. [Dashboard Configuration](#7-dashboard-configuration)
8. [Local Development](#8-local-development)
9. [Deploy to Databricks](#9-deploy-to-databricks)
10. [Post-Deployment](#10-post-deployment)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Required Tools

Install the following on your local machine:

| Tool | Purpose | Install Command |
|------|---------|----------------|
| **uv** | Python package manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **bun** | JavaScript runtime & bundler | `curl -fsSL https://bun.sh/install \| bash` |
| **Databricks CLI** | Workspace deployment | `curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh \| sh` |

### Databricks Requirements

Ensure the following are available in your Databricks workspace:

- **Workspace access** with permissions to create Apps (`Compute > Apps`)
- **Personal Access Token (PAT)** for authentication
- At least one of the following agent types deployed:
  - A **Serving Endpoint** (e.g., a Knowledge Agent or custom agent)
  - A **Multi-Agent Supervisor (MAS)** deployment
  - A **Genie Space** for natural language data queries
- (Optional) A **Lakeview Dashboard** ID for the dashboard tab
- (Optional) **Lakebase PostgreSQL** for persistent chat history

---

## 2. Project Setup

Clone or copy the project to your local machine, then install dependencies:

```bash
# Navigate to the project root
cd databricks-genai-app-template

# Install Python dependencies
uv sync

# Install frontend dependencies
cd client && bun install && cd ..
```

---

## 3. Environment Configuration

This is the first and most important step. You need to create a `.env.local` file with your Databricks workspace details.

### Step 3.1: Create your `.env.local`

```bash
cp .env.template .env.local
```

### Step 3.2: Edit `.env.local` with your values

Open `.env.local` and fill in the following:

```env
# ─────────────────────────────────────────────
# REQUIRED: Your Databricks workspace URL
# ─────────────────────────────────────────────
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com

# ─────────────────────────────────────────────
# REQUIRED: Personal Access Token (for local dev)
# Generate from: Workspace > Settings > Developer > Access Tokens
# Note: Not needed in production (Databricks Apps uses OAuth)
# ─────────────────────────────────────────────
DATABRICKS_TOKEN=dapi_your_token_here

# ─────────────────────────────────────────────
# REQUIRED FOR DEPLOYMENT: App name
# Must be lowercase letters, numbers, and dashes only
# Example: my-company-portal
# ─────────────────────────────────────────────
DATABRICKS_APP_NAME=my-company-app

# ─────────────────────────────────────────────
# REQUIRED FOR DEPLOYMENT: Workspace sync path
# Must be under /Workspace/Users/<your-email>/
# ─────────────────────────────────────────────
WORKSPACE_SOURCE_PATH=/Workspace/Users/your.email@company.com/my-company-app

# ─────────────────────────────────────────────
# OPTIONAL: Persistent chat history via Lakebase
# If not set, chat history is stored in memory only
# ─────────────────────────────────────────────
LAKEBASE_PG_URL=
LAKEBASE_PROJECT_ID=
```

### How to get your values

| Variable | Where to find it |
|----------|-----------------|
| `DATABRICKS_HOST` | Your workspace URL in the browser address bar (e.g., `https://adb-123456789.azuredatabricks.net`) |
| `DATABRICKS_TOKEN` | Workspace > click your profile (top-right) > **Settings** > **Developer** > **Access tokens** > **Generate new token** |
| `DATABRICKS_APP_NAME` | Choose any name (lowercase, dashes allowed). Example: `sales-ai-portal` |
| `WORKSPACE_SOURCE_PATH` | `/Workspace/Users/<your-databricks-email>/<app-name>` |
| `LAKEBASE_PG_URL` | Workspace > **Lakebase** > your project > **Connection** tab > copy the PostgreSQL URL |
| `LAKEBASE_PROJECT_ID` | Found in your Lakebase project URL: `https://your-workspace/lakebase/projects/<project-id>` |

---

## 4. Agent Configuration

This is where you connect the app to **your** AI agents. Edit the file:

```
config/app.json
```

### Step 4.1: Understand agent types

The app supports three types of agents:

| Type | Config Key | Description |
|------|-----------|-------------|
| **Serving Endpoint** | `endpoint_name` | A model or agent deployed as a Databricks serving endpoint |
| **Multi-Agent Supervisor** | `mas_id` | A MAS deployment (auto-resolves to its endpoint) |
| **Genie Space** | `genie_space_id` | A Databricks Genie space for natural language data queries |

### Step 4.2: Replace with your agents

Open `config/app.json` and replace the `agents` array with your own:

```json
{
  "agents": [
    {
      "endpoint_name": "your-ka-endpoint-name",
      "display_name": "Knowledge Agent",
      "display_description": "Ask questions about your documents",
      "question_examples": [
        "What is our return policy?",
        "Summarize the Q4 report"
      ],
      "mlflow_experiment_id": "your-mlflow-experiment-id"
    },
    {
      "endpoint_name": "your-mas-endpoint-name",
      "display_name": "Multi-Agent Assistant",
      "display_description": "A multi-agent system that orchestrates specialized tools",
      "question_examples": [
        "What can you help me with?"
      ]
    },
    {
      "genie_space_id": "your-genie-space-id",
      "display_name": "Data Analyst",
      "display_description": "Query your data using natural language"
    }
  ]
}
```

### How to find your agent IDs

| What you need | Where to find it |
|---------------|-----------------|
| `endpoint_name` | Workspace > **Serving** > click your endpoint > copy the **Name** |
| `mas_id` | Workspace > **Playground** > select your MAS > copy the ID from the URL |
| `genie_space_id` | Workspace > **Genie** > open your space > copy the ID from the URL: `https://your-workspace/genie/rooms/<this-id>` |
| `mlflow_experiment_id` | Workspace > **MLflow** > **Experiments** > click your experiment > copy the ID from the URL |

### Agent fields reference

| Field | Required | Description |
|-------|----------|-------------|
| `endpoint_name` | Yes* | Serving endpoint name (*or use `mas_id` or `genie_space_id`) |
| `mas_id` | Yes* | MAS deployment UUID (*alternative to `endpoint_name`) |
| `genie_space_id` | Yes* | Genie space UUID (*alternative to `endpoint_name`) |
| `display_name` | No | Friendly name shown in the UI (auto-detected if omitted) |
| `display_description` | No | Description shown in the agent selector dropdown |
| `question_examples` | No | Array of example questions shown as clickable chips |
| `mlflow_experiment_id` | No | Links traces to an MLflow experiment for feedback logging |

> **Tip:** You can configure as many agents as you want. Users can switch between them in the chat interface.

---

## 5. Branding & Theming

### Step 5.1: Update basic branding in `config/app.json`

```json
{
  "branding": {
    "name": "Your Company Name",
    "logo": "/logos/your-logo.png"
  },
  "home": {
    "title": "Your Portal Title",
    "description": "A short description shown on the home page"
  }
}
```

### Step 5.2: Replace the logo

1. Place your company logo in: `client/public/logos/`
2. Supported formats: `.png`, `.svg`, `.jpg`
3. Recommended: transparent background, ~200px wide
4. Update the `logo` path in `config/app.json` to match your filename

### Step 5.3: Customize the color theme

Edit `client/src/lib/themes.ts` to match your brand colors.

The key colors to change are in the first theme object (the default):

```typescript
// In PREDEFINED_THEMES array, modify the first theme:
{
  id: "default",
  name: "Your Company Light",
  colors: {
    textHeading: "#1A1A1A",     // Dark color for headings
    textPrimary: "#333333",     // Main text color
    textMuted: "#888888",       // Secondary/muted text
    accentPrimary: "#0055A4",   // ← YOUR BRAND COLOR (buttons, links, accents)
    animatedBgColor: "#0C1C3E", // Background animation color
    bgPrimary: "#FFFFFF",       // Main background
    bgSecondary: "#F5F5F5",     // Secondary background (sidebar, panels)
    border: "#E0E0E0",         // Border color
    // Status colors (usually fine to keep as-is)
    success: "#16A34A",
    error: "#DC2626",
    info: "#0055A4",
    warning: "#D97706",
  },
  typography: {
    // Replace with your brand fonts (must be loaded in globals.css)
    primaryFont: '"Your Heading Font", sans-serif',
    secondaryFont: '"Your Body Font", sans-serif',
  }
}
```

### Step 5.4: Load custom fonts (if needed)

If you use custom fonts, update the Google Fonts import at the top of `client/src/styles/globals.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=YourFont:wght@400;500;600;700&display=swap");
```

### Step 5.5: Update the top bar color

The navigation bar uses a fixed color. To change it, edit `client/src/components/layout/TopBar.tsx`:

Search for `bg-[#0C1C3E]` and replace `#0C1C3E` with your brand's dark color.

---

## 6. Content Customization

### About page

The About page content is in `client/src/components/about/AboutView.tsx`. You can:

- Update section titles, descriptions, and feature lists
- Replace images in `client/public/images/` with your own
- Modify the hero section text and call-to-action

### Home page

The home page is in `client/src/components/home/HomeView.tsx`. The title and description are pulled from `config/app.json` (`home.title` and `home.description`).

### Images

Place custom images in `client/public/images/`. Reference them in code as `/images/your-image.png`.

---

## 7. Dashboard Configuration

To embed a Databricks Lakeview Dashboard, update `config/app.json`:

```json
{
  "dashboard": {
    "title": "Your Dashboard Title",
    "subtitle": "A short description",
    "dashboardId": "your-lakeview-dashboard-id",
    "showPadding": true
  }
}
```

### How to find your Dashboard ID

1. Go to Workspace > **SQL** > **Dashboards**
2. Open your Lakeview dashboard
3. Copy the ID from the URL: `https://your-workspace/sql/dashboardsv3/<this-id>`

> **Note:** Set `dashboardId` to an empty string `""` to disable the dashboard tab.

---

## 8. Local Development

Run the app locally for testing before deployment:

```bash
# From the project root
./scripts/start_dev.sh
```

This starts:
- **Backend** (FastAPI): http://localhost:8000
- **Frontend** (Vite): http://localhost:3000

The frontend proxies API calls to the backend automatically. Press `Ctrl+C` to stop.

### Quick verification checklist

- [ ] Home page loads with your branding
- [ ] Agents appear in the chat dropdown
- [ ] Sending a message returns a response from your agent
- [ ] Dashboard tab shows your embedded dashboard (if configured)
- [ ] About page shows your custom content

---

## 9. Deploy to Databricks

### Step 9.1: Create the app in your workspace

Before the first deployment, create the app in Databricks:

**Option A: Via UI**
1. Go to your Databricks workspace
2. Navigate to **Compute** > **Apps**
3. Click **Create App**
4. Enter your app name (must match `DATABRICKS_APP_NAME` in `.env.local`)

**Option B: Via CLI**
```bash
# Load your environment variables
source .env.local

# Create the app
databricks apps create $DATABRICKS_APP_NAME \
  --description "Your app description" \
  --profile DEFAULT
```

> **Important:** The app name must contain only lowercase letters, numbers, and dashes.

### Step 9.2: Deploy

Run the deployment script:

```bash
./scripts/deploy.sh
```

This will automatically:
1. Verify Databricks CLI authentication
2. Generate `requirements.txt` from `pyproject.toml`
3. Build the frontend (`client/out/`)
4. Sync all code to your workspace path
5. Deploy the app

### Step 9.3: Access your app

After deployment:
1. Go to **Compute** > **Apps** in your workspace
2. Find your app and click on it
3. The app URL will be: `https://<app-name>-<workspace-id>.aws.databricksapps.com`

---

## 10. Post-Deployment

### Updating the app

After making changes, simply re-run:

```bash
./scripts/deploy.sh
```

The script handles incremental syncing and redeployment.

### Monitoring

- **App Logs**: In the workspace, go to **Compute** > **Apps** > your app > **Logs** tab
- **Health Check**: Visit `https://<your-app-url>/api/health`
- **MLflow Traces**: If `mlflow_experiment_id` is configured, view traces in the MLflow experiment

### Permissions

When deployed as a Databricks App:
- Authentication is handled automatically via Databricks OAuth (no PAT needed)
- The app runs with the **app service principal's** permissions
- Ensure the service principal has access to:
  - Your serving endpoints
  - Your Genie spaces
  - Your Lakeview dashboards
  - Your MLflow experiments (if using feedback)

---

## 11. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `App name must contain only lowercase letters, numbers, and dashes` | Rename your app in `.env.local` to use only `a-z`, `0-9`, and `-` |
| `WORKSPACE_SOURCE_PATH is not set` | Edit `.env.local` and set the path to `/Workspace/Users/<email>/<app-name>` |
| `unable to create directory... does not have Manage permissions` | Check the casing of your email in `WORKSPACE_SOURCE_PATH` matches your Databricks username exactly |
| `Maximum number of apps reached` | Delete unused apps in **Compute** > **Apps** > select a stopped app > **Delete** |
| `Agent not found` | Verify `endpoint_name` / `genie_space_id` in `config/app.json` matches exactly what's in Databricks |
| `Serving endpoint is not ready` | Check your endpoint status in **Serving** > ensure it shows **Ready** |
| Dashboard shows blank | Verify `dashboardId` is correct and the service principal has access to the dashboard |
| Chat history lost on restart | Configure `LAKEBASE_PG_URL` in `.env.local` for persistent storage |
| Fonts not loading | Ensure fonts are imported in `client/src/styles/globals.css` via `@import url(...)` |

### Redeployment after config changes

| What changed | What to do |
|-------------|------------|
| `config/app.json` | Re-run `./scripts/deploy.sh` |
| `.env.local` | Re-run `./scripts/deploy.sh` |
| Frontend code (React components, styles) | Re-run `./scripts/deploy.sh` (rebuilds frontend) |
| Backend code (Python) | Re-run `./scripts/deploy.sh` |
| Only testing locally | Just restart `./scripts/start_dev.sh` |

---

## Quick Start Summary

For a fast setup, follow these steps in order:

```bash
# 1. Install tools
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh

# 2. Setup environment
cp .env.template .env.local
# Edit .env.local with your workspace URL, token, app name, and path

# 3. Configure your agents
# Edit config/app.json with your endpoint_name, genie_space_id, etc.

# 4. (Optional) Customize branding
# Edit config/app.json branding section
# Replace logo in client/public/logos/
# Edit colors in client/src/lib/themes.ts

# 5. Test locally
./scripts/start_dev.sh

# 6. Create app in Databricks (first time only)
source .env.local
databricks apps create $DATABRICKS_APP_NAME --profile DEFAULT

# 7. Deploy
./scripts/deploy.sh
```

---

## File Reference

| File | Purpose |
|------|---------|
| `.env.local` | Your workspace credentials and deployment config (never committed to git) |
| `config/app.json` | Agents, branding, home page text, and dashboard config |
| `config/app.example.json` | Example configuration with all available options |
| `app.yaml` | Databricks Apps runtime config (usually no changes needed) |
| `client/public/logos/` | Logo files |
| `client/public/images/` | Image assets for the About page |
| `client/src/lib/themes.ts` | Color themes and typography |
| `client/src/styles/globals.css` | Global styles and font imports |
| `client/src/components/layout/TopBar.tsx` | Navigation bar (header color) |
| `client/src/components/about/AboutView.tsx` | About page content |
| `client/src/components/home/HomeView.tsx` | Home page layout |
| `scripts/deploy.sh` | Automated deployment script |
| `scripts/start_dev.sh` | Local development startup script |
