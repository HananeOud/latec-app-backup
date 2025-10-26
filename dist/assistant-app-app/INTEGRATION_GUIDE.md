# Assistant Template App - Integration Guide

This directory contains the built Assistant Template App, ready for integration into a host React application.

## Contents

- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, and other static assets
- `app_config.json.template` - Template for runtime configuration

## Integration Steps

### 1. Copy Files to Host App

Copy the contents of this directory to your host app's public directory or appropriate location.

For example, if integrating into `dbdemos-genai`:
```bash
cp -r ./* /path/to/dbdemos-genai/public/assistant-app/
```

### 2. Configure Endpoints

Create `app_config.json` from the template:

```bash
cp app_config.json.template app_config.json
```

Edit `app_config.json` with your actual Databricks endpoints:

```json
{
  "endpoints": [
    {
      "displayName": "My Agent",
      "endpointName": "my-agent-endpoint-id",
      "type": "databricks-agent"
    }
  ],
  "apiBaseUrl": "/api"
}
```

### 3. Endpoint Types

The app supports two endpoint types:

- **`databricks-agent`**: For Databricks Agent endpoints (uses `input` field format)
- **`openai-chat`**: For OpenAI-compatible endpoints (uses standard chat format)

### 4. Runtime Configuration

The app loads `app_config.json` at runtime from the same directory as `index.html`.
This allows you to:

- Deploy the same build to multiple environments
- Update endpoints without rebuilding
- Generate configuration dynamically from your host app

### 5. Host App Integration Example

#### Static Integration
If you're serving the app as a static route in your host app:

```javascript
// In your host app's router
app.get('/assistant-app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/assistant-app/index.html'));
});
```

#### Dynamic Configuration
If you want to generate `app_config.json` dynamically:

```python
# In your host app's backend (Python example)
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/assistant-app/app_config.json")
async def get_app_config():
    # Generate config based on user's available endpoints
    endpoints = get_user_endpoints()  # Your logic here
    return JSONResponse({
        "endpoints": endpoints,
        "apiBaseUrl": "/api"
    })
```

### 6. Backend API Proxy

The app expects certain API endpoints to be available. Make sure your host app proxies these:

- `POST /api/invoke_endpoint` - Invoke an agent/model endpoint
- `GET /api/tracing_experiment` - Get MLflow experiment info
- `POST /api/log_feedback` - Log user feedback

Example FastAPI integration:

```python
@app.post("/api/invoke_endpoint")
async def invoke_endpoint(request: EndpointRequest):
    # Your existing endpoint invocation logic
    pass
```

## Development Testing

To test the integration locally:

1. Start your host app's backend
2. Configure `app_config.json` with your test endpoints
3. Serve the built app from a web server
4. Open in browser and verify endpoints appear in dropdown

## Troubleshooting

### Endpoints not appearing
- Check browser console for `app_config.json` loading errors
- Verify `app_config.json` is in the same directory as `index.html`
- Check CORS settings if serving from different domains

### API calls failing
- Verify `apiBaseUrl` in `app_config.json` is correct
- Check that backend API endpoints are properly proxied
- Inspect network requests in browser DevTools

### Chart not rendering
- Ensure the agent response includes a markdown table
- Check browser console for any rendering errors
- Verify `recharts` library is properly bundled

## Support

For issues or questions, refer to the main project documentation or open an issue in the repository.
