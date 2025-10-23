"""Parse markdown tables and extract structured data for visualization."""

import re
from typing import Any, Dict, List, Optional


def extract_table_from_markdown(text: str) -> Optional[Dict[str, Any]]:
  """Extract the first markdown table from text and return structured data.

  Returns:
    Dictionary with structure:
    {
      'headers': ['Column1', 'Column2', ...],
      'rows': [['value1', 'value2', ...], ...],
      'chart_config': {
        'type': 'bar' | 'line',
        'x_column': 0,  # index of x-axis column
        'y_column': 1   # index of y-axis column
      }
    }
  """
  import logging

  logger = logging.getLogger(__name__)

  # Regex to match markdown table - handle blank lines and spacing
  # Matches:
  # | header | header |
  # (optional blank lines)
  # |--------|--------|
  # | data   | data   |
  # The separator line can have multiple columns: |---|---| (non-capturing group)
  table_pattern = r'\|(.+)\|[\s\n]*\|(?:[\-\s:]+\|)+[\s\n]+((?:\|.+\|[\s\n]*)+)'

  logger.info(f'Searching for table in text (first 500 chars): {text[:500]}')
  match = re.search(table_pattern, text, re.MULTILINE | re.DOTALL)
  if not match:
    logger.warning('Regex did not match - no table found')
    # Try to debug - show what lines start with |
    table_lines = [line for line in text.split('\n') if line.strip().startswith('|')]
    logger.info(f'Lines starting with |: {table_lines[:10]}')
    return None

  logger.info(f'✅ Table match found! Header: {match.group(1)[:50]}...')

  # Extract headers
  header_line = match.group(1)
  headers = [h.strip() for h in header_line.split('|') if h.strip()]

  # Extract rows
  rows_text = match.group(2)
  rows = []
  for line in rows_text.strip().split('\n'):
    if line.strip():
      cells = [c.strip() for c in line.split('|') if c.strip()]
      if cells:
        rows.append(cells)

  if not headers or not rows:
    return None

  # Infer chart configuration
  chart_config = _infer_chart_config(headers, rows)

  return {'headers': headers, 'rows': rows, 'chart_config': chart_config}


def _infer_chart_config(headers: List[str], rows: List[List[str]]) -> Dict[str, Any]:
  """Infer the best chart type and configuration based on data.

  Logic:
  - If first column is categorical (text) and second is numeric -> bar chart
  - If first column looks like dates/months/years -> line chart
  - Default to bar chart with first two columns
  """
  if len(headers) < 2 or not rows:
    return {'type': 'bar', 'x_column': 0, 'y_column': 1}

  # Check if first column contains time-related words
  first_header = headers[0].lower()
  time_keywords = ['month', 'year', 'date', 'time', 'quarter', 'week', 'day']
  is_time_series = any(keyword in first_header for keyword in time_keywords)

  # Check if first row's first column looks like a date/month
  first_value = rows[0][0].lower() if rows else ''
  month_keywords = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]
  looks_like_date = any(keyword in first_value for keyword in month_keywords)

  # Determine chart type
  chart_type = 'line' if (is_time_series or looks_like_date) else 'bar'

  # Find first numeric column (usually second column)
  y_column = 1
  for i, row in enumerate(rows):
    if len(row) > 1:
      try:
        # Try to parse as number
        float(row[1].replace(',', ''))
        y_column = 1
        break
      except ValueError:
        # Try next column
        if len(row) > 2:
          y_column = 2
        break

  return {'type': chart_type, 'x_column': 0, 'y_column': y_column}
