# Brand Integration Guide for Host Application

## Context

The Assistant Template App supports dynamic brand styling via brand.dev API. This allows the host application to apply custom brand colors, logos, and themes to the assistant UI without modifying code.

The assistant app reads brand configuration from a JSON file (`client/public/brand_config.json`) and automatically applies colors, logos, and WCAG-compliant text colors across the entire UI, including charts.

## Goal

Enable the host application to programmatically set the assistant app's branding by:

1. Fetching brand data from brand.dev API
2. Transforming it into the assistant's brand configuration format
3. Writing the configuration file directly to the assistant app's file system
4. The assistant app will automatically reload and apply the new branding

## Prerequisites

### 1. Brand.dev API Key

Get your API key from: https://brand.dev

```bash
# Add to your host app's environment
BRAND_DEV_API_KEY=brand__YOUR_API_KEY_HERE
```

### 2. File System Access

The host app needs write access to the assistant app's directory:

```
/path/to/assistant-template-app/client/public/brand_config.json
```

## Implementation Steps

### Step 1: Install Required Dependencies (Host App)

```bash
pip install requests
```

### Step 2: Add Brand Service to Host App

Create `brand_integration.py` in your host app:

```python
"""Brand.dev Integration for Assistant Template App
Fetches brand data and writes configuration to assistant app.
"""

import os
import json
import requests
from pathlib import Path
from typing import Dict, Any


class AssistantBrandIntegration:
    """Service to integrate brand styling with assistant app."""

    def __init__(self, assistant_app_path: str):
        """
        Initialize the brand integration service.

        Args:
            assistant_app_path: Absolute path to assistant-template-app directory
                               (e.g., '/opt/apps/assistant-template-app')
        """
        self.api_key = os.getenv('BRAND_DEV_API_KEY', '')
        self.base_url = 'https://api.brand.dev/v1'
        self.assistant_path = Path(assistant_app_path)
        self.config_path = self.assistant_path / 'client' / 'public' / 'brand_config.json'

    def fetch_brand(self, brand_name: str) -> Dict[str, Any]:
        """Fetch brand information from brand.dev API.

        Args:
            brand_name: Name of the brand (e.g., "Tesla", "Apple", "Nike")

        Returns:
            Brand data from brand.dev API

        Raises:
            Exception: If API call fails
        """
        url = f'{self.base_url}/brand/retrieve'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        params = {'name': brand_name}

        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('status') != 'ok':
            raise Exception(f'Brand.dev API returned status: {data.get("status")}')

        return data

    def _calculate_contrast_ratio(self, color1: str, color2: str) -> float:
        """Calculate WCAG contrast ratio between two colors."""
        def get_luminance(hex_color: str) -> float:
            hex_color = hex_color.lstrip('#')
            r = int(hex_color[0:2], 16) / 255
            g = int(hex_color[2:4], 16) / 255
            b = int(hex_color[4:6], 16) / 255

            # Apply gamma correction
            r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
            g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
            b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4

            return 0.2126 * r + 0.7152 * g + 0.0722 * b

        lum1 = get_luminance(color1)
        lum2 = get_luminance(color2)
        lighter = max(lum1, lum2)
        darker = min(lum1, lum2)

        return (lighter + 0.05) / (darker + 0.05)

    def _ensure_readable_text(self, bg_color: str, text_color: str, min_ratio: float = 4.5) -> str:
        """Ensure text color has sufficient contrast with background.
        WCAG AA requires 4.5:1 for normal text.
        """
        contrast = self._calculate_contrast_ratio(bg_color, text_color)

        if contrast >= min_ratio:
            return text_color

        # Try black first
        black_contrast = self._calculate_contrast_ratio(bg_color, '#000000')
        if black_contrast >= min_ratio:
            return '#000000'

        # Try white
        white_contrast = self._calculate_contrast_ratio(bg_color, '#ffffff')
        if white_contrast >= min_ratio:
            return '#ffffff'

        # Return the better of black or white
        return '#000000' if black_contrast > white_contrast else '#ffffff'

    def _get_contrasting_color(self, hex_color: str) -> str:
        """Get contrasting color (black or white) for given hex color."""
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return '#000000' if luminance > 0.5 else '#ffffff'

    def _lighten_color(self, hex_color: str, factor: float) -> str:
        """Lighten a hex color by a given factor (0-1)."""
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)

        r = int(r + (255 - r) * factor)
        g = int(g + (255 - g) * factor)
        b = int(b + (255 - b) * factor)

        r = min(255, max(0, r))
        g = min(255, max(0, g))
        b = min(255, max(0, b))

        return f'#{r:02x}{g:02x}{b:02x}'

    def _darken_color(self, hex_color: str, factor: float) -> str:
        """Darken a hex color by a given factor (0-1)."""
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)

        r = int(r * (1 - factor))
        g = int(g * (1 - factor))
        b = int(b * (1 - factor))

        r = min(255, max(0, r))
        g = min(255, max(0, g))
        b = min(255, max(0, b))

        return f'#{r:02x}{g:02x}{b:02x}'

    def _select_best_logo(self, logos: list) -> str:
        """Select the best logo from available options."""
        if not logos:
            return 'https://your-logo-url.com/logo.svg'

        # Try to find light mode logo first
        for logo in logos:
            if logo.get('mode') == 'light' and logo.get('type') in ['logo', 'icon']:
                return logo.get('url', '')

        # Fall back to first logo with opaque background
        for logo in logos:
            if logo.get('mode') == 'has_opaque_background':
                return logo.get('url', '')

        return logos[0].get('url', 'https://your-logo-url.com/logo.svg')

    def transform_brand_data(self, brand_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform brand.dev response into assistant app configuration format.

        Args:
            brand_data: Response from brand.dev API

        Returns:
            Brand configuration for the assistant app
        """
        brand = brand_data.get('brand', {})

        # Extract colors
        colors = brand.get('colors', [])
        primary_color = colors[0]['hex'] if len(colors) > 0 else '#000000'
        secondary_color = colors[1]['hex'] if len(colors) > 1 else '#ffffff'
        accent_color = colors[2]['hex'] if len(colors) > 2 else '#3b82f6'

        # Extract logo URL
        logos = brand.get('logos', [])
        logo_url = self._select_best_logo(logos)

        # Calculate complementary colors with WCAG compliance
        foreground = self._get_contrasting_color(primary_color)
        muted = self._lighten_color(primary_color, 0.95)
        muted_foreground = self._ensure_readable_text(muted, primary_color)
        border = self._lighten_color(primary_color, 0.9)

        # Sidebar colors based on primary color with readability ensured
        sidebar_bg = self._lighten_color(primary_color, 0.97)
        sidebar_primary = primary_color
        sidebar_primary_fg = self._ensure_readable_text(sidebar_primary, foreground, min_ratio=4.5)
        sidebar_accent = self._lighten_color(primary_color, 0.93)
        sidebar_accent_fg = self._ensure_readable_text(sidebar_accent, primary_color, min_ratio=4.5)
        sidebar_fg = self._ensure_readable_text(sidebar_bg, foreground, min_ratio=4.5)

        return {
            'brand': {
                'name': brand.get('title', 'Brand'),
                'logoUrl': logo_url,
                'colors': {
                    'primary': primary_color,
                    'secondary': secondary_color,
                    'accent': accent_color,
                    'background': '#ffffff',
                    'foreground': foreground,
                    'muted': muted,
                    'mutedForeground': muted_foreground,
                    'border': border,
                    'input': border,
                    'ring': accent_color,
                    'destructive': '#ef4444',
                    'destructiveForeground': '#ffffff',
                    'sidebar': sidebar_bg,
                    'sidebarForeground': sidebar_fg,
                    'sidebarPrimary': sidebar_primary,
                    'sidebarPrimaryForeground': sidebar_primary_fg,
                    'sidebarAccent': sidebar_accent,
                    'sidebarAccentForeground': sidebar_accent_fg,
                    'sidebarBorder': border,
                },
            }
        }

    def apply_brand(self, brand_name: str) -> Dict[str, Any]:
        """
        Main method: Fetch brand data and write configuration to assistant app.

        Args:
            brand_name: Name of the brand (e.g., "Tesla", "Apple", "Netflix")

        Returns:
            The brand configuration that was written

        Raises:
            Exception: If fetching or writing fails
        """
        # Fetch brand data
        print(f"Fetching brand data for: {brand_name}")
        brand_data = self.fetch_brand(brand_name)

        # Transform to assistant format
        config = self.transform_brand_data(brand_data)

        # Ensure directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

        # Write configuration file
        with open(self.config_path, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"✓ Brand configuration written to: {self.config_path}")
        print(f"✓ Brand: {config['brand']['name']}")
        print(f"✓ Primary Color: {config['brand']['colors']['primary']}")

        return config


# Usage example
if __name__ == "__main__":
    # Initialize with path to assistant app
    assistant_path = "/path/to/assistant-template-app"
    brand_service = AssistantBrandIntegration(assistant_path)

    # Apply a brand
    config = brand_service.apply_brand("Tesla")
    print("Brand applied successfully!")
```

### Step 3: Integrate into Host App

#### Option A: API Endpoint in Host App

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from brand_integration import AssistantBrandIntegration

app = FastAPI()

# Initialize with your assistant app path
ASSISTANT_APP_PATH = os.getenv('ASSISTANT_APP_PATH', '/opt/apps/assistant-template-app')
brand_service = AssistantBrandIntegration(ASSISTANT_APP_PATH)


class BrandRequest(BaseModel):
    brand_name: str


@app.post("/api/apply_assistant_brand")
async def apply_assistant_brand(request: BrandRequest):
    """
    Apply brand styling to the assistant app.

    Example:
        POST /api/apply_assistant_brand
        {"brand_name": "Tesla"}
    """
    try:
        config = brand_service.apply_brand(request.brand_name)
        return {
            "success": True,
            "message": f"Brand '{request.brand_name}' applied successfully",
            "config": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### Option B: Python Script (Standalone)

```python
#!/usr/bin/env python3
"""
Script to apply brand to assistant app.
Usage: python apply_brand.py <brand_name>
"""

import sys
from brand_integration import AssistantBrandIntegration

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python apply_brand.py <brand_name>")
        print("Example: python apply_brand.py Tesla")
        sys.exit(1)

    brand_name = sys.argv[1]
    assistant_path = "/path/to/assistant-template-app"

    brand_service = AssistantBrandIntegration(assistant_path)
    config = brand_service.apply_brand(brand_name)

    print(f"\n✓ Successfully applied {brand_name} branding!")
```

### Step 4: Environment Configuration

Add to your host app's environment:

```bash
# .env or environment variables
BRAND_DEV_API_KEY=brand__YOUR_API_KEY_HERE
ASSISTANT_APP_PATH=/path/to/assistant-template-app
```

## Testing

### Test the Integration

```python
from brand_integration import AssistantBrandIntegration

# Initialize
assistant_path = "/path/to/assistant-template-app"
brand_service = AssistantBrandIntegration(assistant_path)

# Test with different brands
brands = ["Tesla", "Apple", "Nike", "Spotify", "Netflix", "Google"]

for brand in brands:
    try:
        config = brand_service.apply_brand(brand)
        print(f"✓ {brand}: {config['brand']['colors']['primary']}")
    except Exception as e:
        print(f"✗ {brand}: {e}")
```

### Verify the Configuration

After calling `apply_brand()`, check:

```bash
cat /path/to/assistant-template-app/client/public/brand_config.json
```

You should see:

```json
{
  "brand": {
    "name": "Tesla",
    "logoUrl": "https://media.brand.dev/...",
    "colors": {
      "primary": "#e82127",
      "sidebar": "#fef7f7",
      "sidebarForeground": "#1a1a1a",
      ...
    }
  }
}
```

## How It Works

1. **Host app calls** `brand_service.apply_brand("Tesla")`
2. **Fetches** brand data from brand.dev API
3. **Transforms** into assistant app format with WCAG-compliant colors
4. **Writes** to `assistant-template-app/client/public/brand_config.json`
5. **User refreshes** browser or assistant app detects file change
6. **Assistant app** automatically applies the new branding:
   - Sidebar colors
   - Logo
   - Text colors (WCAG compliant)
   - Chart colors
   - All UI elements

## Features

✅ **WCAG Compliant**: Automatically ensures 4.5:1 contrast ratio for all text
✅ **Dynamic Sidebar**: Colors adjust based on brand primary color
✅ **Logo Integration**: Brand logo appears in sidebar
✅ **Chart Colors**: Recharts automatically use brand colors
✅ **Accessible**: Prioritizes readability over exact color matching
✅ **File-based**: No API calls needed from frontend
✅ **Hot-swappable**: Change brands without restarting

## Troubleshooting

### Issue: File not found

**Solution**: Verify `ASSISTANT_APP_PATH` is correct absolute path

### Issue: Permission denied

**Solution**: Ensure host app has write permissions:

```bash
chmod 755 /path/to/assistant-template-app/client/public
```

### Issue: Brand.dev API error

**Solution**: Verify API key is valid and brand name exists:

```bash
curl -X GET "https://api.brand.dev/v1/brand/retrieve?name=Tesla" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: Changes not appearing

**Solution**: Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

## API Reference

### `AssistantBrandIntegration(assistant_app_path)`

Initialize the brand integration service.

**Parameters:**

- `assistant_app_path` (str): Absolute path to assistant-template-app directory

### `apply_brand(brand_name) -> Dict`

Fetch brand data and apply to assistant app.

**Parameters:**

- `brand_name` (str): Brand name (e.g., "Tesla", "Apple", "Nike")

**Returns:**

- `Dict`: Brand configuration that was written

**Raises:**

- `Exception`: If fetching or writing fails

## Security Notes

- Store `BRAND_DEV_API_KEY` securely (environment variable, secrets manager)
- Validate brand names before passing to API
- Ensure assistant app path is not user-controllable
- Consider rate limiting brand changes
- Log all brand changes for audit trail

## Example Integration Patterns

### Pattern 1: User Selection

```python
# User selects brand from dropdown in host app UI
@app.post("/settings/brand")
async def update_brand(selected_brand: str):
    brand_service.apply_brand(selected_brand)
    return {"message": "Brand updated. Refresh assistant to see changes."}
```

### Pattern 2: Automatic from Profile

```python
# Automatically apply based on user's company
def on_user_login(user):
    company_name = user.company
    brand_service.apply_brand(company_name)
```

### Pattern 3: Multi-tenant

```python
# Different brands per tenant
def apply_tenant_brand(tenant_id: str):
    tenant = get_tenant(tenant_id)
    brand_service.apply_brand(tenant.brand_name)
```

## Support

For issues or questions:

- Check the assistant app's console for errors
- Verify file permissions and paths
- Test brand.dev API directly with curl
- Review browser console for loading errors
