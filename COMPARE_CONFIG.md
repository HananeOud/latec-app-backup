# Compare Tab Configuration

The Compare tab uses the `compare` section in [`config/app.json`](config/app.json) for all its settings.

## Configuration Parameters

All parameters are in the `compare` object:

```json
{
  "compare": {
    "enabled": true,
    "analysis_endpoint": "databricks-claude-haiku-4-5",
    "analysis_system_prompt": "Your prompt here...",
    "impact_endpoint": "agents_thales-ags_mro-ags-mro-agent-4",
    "impact_system_prompt": "Your prompt here..."
  }
}
```

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `enabled` | Enable/disable the compare feature | `true` |
| `analysis_endpoint` | Databricks endpoint name for document comparison (must support vision/multimodal) | `databricks-claude-haiku-4-5` |
| `analysis_system_prompt` | Instructions for the comparison analysis | See below |
| `impact_endpoint` | Databricks endpoint name for finding impacted documents (your RAG/KA agent) | `agents_thales-ags_mro-ags-mro-agent-4` |
| `impact_system_prompt` | Instructions for the impact analysis | See below |

## Endpoint Requirements

### Analysis Endpoint
- Must support **multimodal/vision** (receives PDF pages as images)
- Recommended: `databricks-claude-haiku-4-5`, `databricks-claude-sonnet-4-5`, or any Claude/GPT model with vision support
- Do NOT use `databricks-gpt-5-1-codex-max` (it only supports the Responses API)

### Impact Endpoint
- Your existing RAG/knowledge assistant endpoint
- Receives plain text (the analysis output)

## Example System Prompts

### Analysis System Prompt
```
You are a document comparison expert. You will receive two versions of a document: an OLD version and a NEW version. Analyze the NEW version compared to the OLD version. Provide a detailed, well-structured markdown report of ALL changes in the new version. Only show the new content/passages, do not reproduce old content. Use clear headings, bullet points, and highlight important changes.
```

### Impact System Prompt
```
Based on the following document changes, provide a comprehensive list of all documents from our knowledge base that are impacted or affected by these changes. For each impacted document, explain why it is affected.
```

## Hot Reload

In development mode, changes to `config/app.json` are automatically reloaded on each request. In production, restart the app after config changes.

## Authentication

- **Local dev**: Uses `DATABRICKS_HOST` and `DATABRICKS_TOKEN` from `.env.local`
- **Production**: Uses `DATABRICKS_HOST` from `app.yaml` env vars + OAuth token from Databricks Apps runtime
