"""Compare endpoints for document diff analysis and impact assessment.

Provides two streaming SSE endpoints:
1. /compare/analyze — Upload two PDFs, send pages as images to a vision-capable
   LLM (e.g. databricks-claude-haiku-4-5) and stream a markdown diff.
2. /compare/impact — Send the diff text to a RAG endpoint for impact analysis.

Configuration is read from config/app.json under the "compare" key.
"""

import asyncio
import base64
import json
import logging
import os
from typing import Any, AsyncGenerator, Dict, List, Tuple

import fitz  # type: ignore[import-untyped]  # pymupdf
import httpx
from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import StreamingResponse
from mlflow.deployments import get_deploy_client
from pydantic import BaseModel

from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()

# Maximum pages per PDF to send as images (Claude allows up to 100 images total)
MAX_PAGES_PER_PDF = 20


# =============================================================================
# Configuration
# =============================================================================


def _get_compare_config() -> Dict[str, Any]:
  """Read the compare section from app config."""
  cfg = config_loader.app_config.get('compare', {})
  if not cfg.get('enabled', False):
    raise ValueError('Compare feature is not enabled in config/app.json')
  return cfg


# =============================================================================
# Auth
# =============================================================================


def _get_databricks_credentials(request: Request) -> Tuple[str, str]:
  """Get Databricks host and token for direct HTTP calls.

  Dev:  DATABRICKS_HOST + DATABRICKS_TOKEN from env (.env.local).
  Prod: DATABRICKS_HOST from env (app.yaml), token from x-forwarded-access-token header.
  """
  host = os.environ.get('DATABRICKS_HOST', '').rstrip('/')
  token = (
    request.headers.get('x-forwarded-access-token')
    or os.environ.get('DATABRICKS_TOKEN', '')
  )
  return host, token


# =============================================================================
# PDF Processing
# =============================================================================


def _pdf_pages_to_base64_images(pdf_bytes: bytes, dpi: int = 150) -> List[str]:
  """Render each PDF page as a PNG and return base64-encoded strings.

  Args:
    pdf_bytes: Raw PDF file content.
    dpi: Resolution for rendering. 150 is a good balance of quality vs size.

  Returns:
    List of base64-encoded PNG strings (one per page, capped at MAX_PAGES_PER_PDF).
  """
  doc = fitz.open(stream=pdf_bytes, filetype='pdf')
  images: List[str] = []
  zoom = dpi / 72  # fitz default is 72 dpi
  matrix = fitz.Matrix(zoom, zoom)

  for i, page in enumerate(doc):
    if i >= MAX_PAGES_PER_PDF:
      logger.warning(
        f'PDF has {len(doc)} pages, capping at {MAX_PAGES_PER_PDF} for the API call'
      )
      break
    pixmap = page.get_pixmap(matrix=matrix)
    png_bytes = pixmap.tobytes('png')
    images.append(base64.b64encode(png_bytes).decode('ascii'))

  doc.close()
  return images


def _extract_pdf_text(pdf_bytes: bytes) -> str:
  """Extract all text from a PDF using pymupdf (fallback context)."""
  doc = fitz.open(stream=pdf_bytes, filetype='pdf')
  pages: List[str] = []
  for page in doc:
    pages.append(page.get_text())
  doc.close()
  return '\n\n'.join(pages)


# =============================================================================
# Mojibake fix (reused by both streaming paths)
# =============================================================================


def _fix_mojibake(text: str) -> str:
  """Fix UTF-8 content that was incorrectly decoded as Latin-1."""
  if not text:
    return text
  try:
    return text.encode('latin-1').decode('utf-8')
  except (UnicodeDecodeError, UnicodeEncodeError):
    pass
  import re

  def fix_segment(match):
    segment = match.group(0)
    try:
      return segment.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
      return segment

  return re.sub(r'[\u0080-\u00ff]+', fix_segment, text)


# =============================================================================
# Analysis streaming (httpx — multimodal, for vision-capable endpoints)
# =============================================================================


def _convert_chat_chunk_to_sse(raw_data: str):
  """Parse a single SSE data line from a chat completion stream.

  Returns an SSE string for the frontend, or None if the chunk should be skipped.
  """
  try:
    chunk = json.loads(raw_data)
  except json.JSONDecodeError:
    return None

  if chunk.get('object') != 'chat.completion.chunk':
    return None
  choices = chunk.get('choices', [])
  if not choices:
    return None
  delta = choices[0].get('delta', {})
  content = delta.get('content')
  if not content:
    return None
  # Handle list-style content (some models)
  if isinstance(content, list):
    parts = []
    for item in content:
      if isinstance(item, dict) and item.get('type') == 'text':
        parts.append(item.get('text', ''))
      elif isinstance(item, str):
        parts.append(item)
    content = ''.join(parts)
  if not content:
    return None

  event = {'type': 'response.output_text.delta', 'delta': _fix_mojibake(content)}
  return f'data: {json.dumps(event)}\n\n'


async def _stream_analysis_httpx(
  host: str,
  token: str,
  endpoint_name: str,
  messages: List[Dict[str, Any]],
) -> AsyncGenerator[str, None]:
  """Stream from a Databricks chat-completion endpoint via httpx.

  Uses the /serving-endpoints/{name}/invocations URL with streaming enabled.
  This allows us to send multimodal content blocks (image_url) which the
  MLflow deployments client does not support.
  """
  url = f'{host}/serving-endpoints/{endpoint_name}/invocations'
  payload = {
    'messages': messages,
    'max_tokens': 8192,
    'stream': True,
  }
  headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
  }

  logger.info(f'Streaming analysis from {endpoint_name} via httpx ({len(messages)} messages)')

  try:
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
      async with client.stream('POST', url, json=payload, headers=headers) as response:
        if response.status_code != 200:
          body = await response.aread()
          error_msg = body.decode('utf-8', errors='replace')
          logger.error(f'Endpoint returned {response.status_code}: {error_msg}')
          err = f'Endpoint returned {response.status_code}: {error_msg}'
          yield f'data: {json.dumps({"type": "error", "error": err})}\n\n'
          yield 'data: [DONE]\n\n'
          return

        buffer = ''
        async for raw_chunk in response.aiter_text():
          buffer += raw_chunk
          # Split on double-newline (SSE event boundary) and single newlines
          while '\n' in buffer:
            line, buffer = buffer.split('\n', 1)
            line = line.strip()
            if not line:
              continue
            if line.startswith('data: '):
              data = line[6:].strip()
              if data == '[DONE]':
                yield 'data: [DONE]\n\n'
                return
              sse = _convert_chat_chunk_to_sse(data)
              if sse:
                yield sse

    # If we exit without [DONE], send it now
    yield 'data: [DONE]\n\n'

  except httpx.TimeoutException as e:
    logger.error(f'Timeout calling {endpoint_name}: {e}')
    yield f'data: {json.dumps({"type": "error", "error": f"Request timed out: {e}"})}\n\n'
    yield 'data: [DONE]\n\n'
  except Exception as e:
    logger.error(f'Error streaming from {endpoint_name}: {e}')
    yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'
    yield 'data: [DONE]\n\n'


# =============================================================================
# Impact streaming (MLflow — for agent/RAG endpoints)
# =============================================================================

# Cache endpoint format: endpoint_name -> "agent" | "chat_completion"
_endpoint_format_cache: Dict[str, str] = {}


async def _stream_from_endpoint(
  endpoint_name: str,
  messages: List[Dict[str, str]],
):
  """Stream SSE from a Databricks endpoint via MLflow deployments client.

  Auto-detects agent vs chat_completion format on first call.
  Used for the impact endpoint (RAG / knowledge agent).
  """
  client = get_deploy_client('databricks')
  queue: asyncio.Queue = asyncio.Queue()
  loop = asyncio.get_event_loop()

  def _build_agent(msgs):
    return {'input': msgs, 'databricks_options': {'return_trace': True}}

  def _build_chat(msgs):
    return {'messages': msgs, 'stream': True}

  def _stream_with_format(inputs, fmt):
    response = client.predict_stream(endpoint=endpoint_name, inputs=inputs)
    for chunk in response:
      loop.call_soon_threadsafe(queue.put_nowait, ('chunk', chunk, fmt))
    loop.call_soon_threadsafe(queue.put_nowait, ('done', None, fmt))

  def _convert_chat_chunk(chunk):
    if chunk.get('object') != 'chat.completion.chunk':
      return None
    choices = chunk.get('choices', [])
    if not choices:
      return None
    delta = choices[0].get('delta', {})
    content = delta.get('content')
    if not content:
      return None
    if isinstance(content, list):
      parts = []
      for item in content:
        if isinstance(item, dict) and item.get('type') == 'text':
          parts.append(item.get('text', ''))
        elif isinstance(item, str):
          parts.append(item)
      content = ''.join(parts)
    if not content:
      return None
    return {'type': 'response.output_text.delta', 'delta': _fix_mojibake(content)}

  def _format_for_sse(chunk, fmt):
    if fmt == 'chat_completion':
      converted = _convert_chat_chunk(chunk)
      return f'data: {json.dumps(converted)}\n\n' if converted else None
    return f'data: {json.dumps(chunk)}\n\n'

  def consume():
    cached = _endpoint_format_cache.get(endpoint_name)
    if cached:
      try:
        inputs = _build_chat(messages) if cached == 'chat_completion' else _build_agent(messages)
        _stream_with_format(inputs, cached)
      except Exception as e:
        logger.error(f'Error calling {endpoint_name}: {e}')
        loop.call_soon_threadsafe(queue.put_nowait, ('error', str(e), cached))
      return

    # Try agent first, fallback to chat_completion
    try:
      _stream_with_format(_build_agent(messages), 'agent')
      _endpoint_format_cache[endpoint_name] = 'agent'
      logger.info(f'Cached format for {endpoint_name}: agent')
    except Exception as e:
      err = str(e)
      needs_chat = (
        "Missing required Chat parameter: 'messages'" in err
        or "Model is missing inputs ['messages']" in err
        or ("extra inputs: ['input']" in err and 'messages' in err)
      )
      if needs_chat:
        logger.info(f'{endpoint_name} needs chat_completion format, retrying...')
        try:
          _stream_with_format(_build_chat(messages), 'chat_completion')
          _endpoint_format_cache[endpoint_name] = 'chat_completion'
          logger.info(f'Cached format for {endpoint_name}: chat_completion')
        except Exception as retry_e:
          logger.error(f'Retry failed for {endpoint_name}: {retry_e}')
          loop.call_soon_threadsafe(queue.put_nowait, ('error', str(retry_e), 'chat_completion'))
      else:
        logger.error(f'Error calling {endpoint_name}: {e}')
        loop.call_soon_threadsafe(queue.put_nowait, ('error', err, 'agent'))

  loop.run_in_executor(None, consume)

  try:
    while True:
      msg_type, data, fmt = await queue.get()
      if msg_type == 'chunk':
        formatted = _format_for_sse(data, fmt)
        if formatted:
          yield formatted
      elif msg_type == 'error':
        yield f'data: {json.dumps({"type": "error", "error": data})}\n\n'
        yield 'data: [DONE]\n\n'
        break
      elif msg_type == 'done':
        yield 'data: [DONE]\n\n'
        break
  except Exception as e:
    logger.error(f'Error in async stream: {e}')
    yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'
    yield 'data: [DONE]\n\n'


# =============================================================================
# Endpoints
# =============================================================================


@router.post('/compare/analyze')
async def analyze_documents(
  request: Request,
  old_file: UploadFile = File(..., description='Old version PDF'),
  new_file: UploadFile = File(..., description='New version PDF'),
):
  """Compare two PDF documents and stream a markdown diff analysis.

  Sends PDF pages as images (multimodal content blocks) to a vision-capable
  endpoint (e.g. Claude Haiku) and streams the response back as SSE.
  Also includes extracted text as fallback context.
  """
  try:
    cfg = _get_compare_config()
  except ValueError as e:
    return StreamingResponse(
      _error_stream(str(e)),
      media_type='text/event-stream',
    )

  endpoint = cfg.get('analysis_endpoint', '')
  system_prompt = cfg.get('analysis_system_prompt', '')

  if not endpoint:
    return StreamingResponse(
      _error_stream('analysis_endpoint not configured in config/app.json compare section'),
      media_type='text/event-stream',
    )

  host, token = _get_databricks_credentials(request)
  if not host or not token:
    return StreamingResponse(
      _error_stream('Missing DATABRICKS_HOST or token for analysis endpoint'),
      media_type='text/event-stream',
    )

  # Read PDFs
  try:
    old_bytes = await old_file.read()
    new_bytes = await new_file.read()
  except Exception as e:
    logger.error(f'Failed to read uploaded files: {e}')
    return StreamingResponse(
      _error_stream(f'Failed to read PDF files: {e}'),
      media_type='text/event-stream',
    )

  # Convert pages to images + extract text (for fallback context)
  try:
    old_images = _pdf_pages_to_base64_images(old_bytes)
    new_images = _pdf_pages_to_base64_images(new_bytes)
    old_text = _extract_pdf_text(old_bytes)
    new_text = _extract_pdf_text(new_bytes)
  except Exception as e:
    logger.error(f'PDF processing failed: {e}')
    return StreamingResponse(
      _error_stream(f'Failed to process PDF files: {e}'),
      media_type='text/event-stream',
    )

  logger.info(
    f'Processed PDFs: old={len(old_images)} pages, new={len(new_images)} pages, '
    f'old_text={len(old_text)} chars, new_text={len(new_text)} chars'
  )

  # Build multimodal content blocks
  content_blocks: List[Dict[str, Any]] = []

  # Old version: label + page images
  content_blocks.append({'type': 'text', 'text': f'--- OLD VERSION ({old_file.filename}) ---'})
  for img_b64 in old_images:
    content_blocks.append({
      'type': 'image_url',
      'image_url': {'url': f'data:image/png;base64,{img_b64}'},
    })

  # New version: label + page images
  content_blocks.append({'type': 'text', 'text': f'--- NEW VERSION ({new_file.filename}) ---'})
  for img_b64 in new_images:
    content_blocks.append({
      'type': 'image_url',
      'image_url': {'url': f'data:image/png;base64,{img_b64}'},
    })

  # Also include extracted text as additional context
  content_blocks.append({
    'type': 'text',
    'text': (
      f'\n\n--- EXTRACTED TEXT (for additional context) ---\n\n'
      f'OLD VERSION TEXT:\n{old_text}\n\n'
      f'NEW VERSION TEXT:\n{new_text}'
    ),
  })

  messages: List[Dict[str, Any]] = []
  if system_prompt:
    messages.append({'role': 'system', 'content': system_prompt})
  messages.append({'role': 'user', 'content': content_blocks})

  return StreamingResponse(
    _stream_analysis_httpx(host, token, endpoint, messages),
    media_type='text/event-stream',
    headers={
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  )


class ImpactRequest(BaseModel):
  """Request body for the impact analysis endpoint."""

  changes_text: str


@router.post('/compare/impact')
async def find_impacted_documents(body: ImpactRequest):
  """Find documents impacted by the changes.

  Accepts JSON with changes_text.
  Returns SSE stream with response.output_text.delta events.
  """
  try:
    cfg = _get_compare_config()
  except ValueError as e:
    return StreamingResponse(
      _error_stream(str(e)),
      media_type='text/event-stream',
    )

  endpoint = cfg.get('impact_endpoint', '')
  system_prompt = cfg.get('impact_system_prompt', '')

  if not endpoint:
    return StreamingResponse(
      _error_stream('impact_endpoint not configured in config/app.json compare section'),
      media_type='text/event-stream',
    )

  messages: List[Dict[str, str]] = []
  if system_prompt:
    messages.append({'role': 'system', 'content': system_prompt})
  messages.append({'role': 'user', 'content': body.changes_text})

  return StreamingResponse(
    _stream_from_endpoint(endpoint, messages),
    media_type='text/event-stream',
    headers={
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  )


async def _error_stream(message: str):
  """Yield a single error event then DONE."""
  yield f'data: {json.dumps({"type": "error", "error": message})}\n\n'
  yield 'data: [DONE]\n\n'
