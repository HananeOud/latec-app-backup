"""Handler for Databricks Genie spaces.

Uses the Databricks SDK to interact with Genie spaces via their API.
Genie spaces allow natural language queries over structured data.

Flow:
1. User sends a message
2. Handler calls start_conversation_and_wait / create_message_and_wait
3. SDK handles polling internally until the message is completed
4. Returns the text response and any query results as markdown tables
"""

import asyncio
import json
import logging
from datetime import timedelta
from typing import Any, AsyncGenerator, Dict, List, Optional

from databricks.sdk import WorkspaceClient

from .base import BaseDeploymentHandler

logger = logging.getLogger(__name__)

# Store Genie conversation IDs mapped to our chat IDs
_genie_conversations: Dict[str, str] = {}


def _format_query_result_as_markdown(columns: List[str], rows: List[List[Any]]) -> str:
  """Format SQL query results as a markdown table."""
  if not columns or not rows:
    return ''

  # Header
  header = '| ' + ' | '.join(str(c) for c in columns) + ' |'
  separator = '| ' + ' | '.join('---' for _ in columns) + ' |'

  # Rows (limit to 100 for readability)
  display_rows = rows[:100]
  row_lines = []
  for row in display_rows:
    row_lines.append('| ' + ' | '.join(str(v) if v is not None else '' for v in row) + ' |')

  table = '\n'.join([header, separator] + row_lines)

  if len(rows) > 100:
    table += f'\n\n*Showing 100 of {len(rows)} rows*'

  return table


def _safe_get_attr(obj: Any, attr: str, default: Any = None) -> Any:
  """Safely get an attribute from an object."""
  try:
    val = getattr(obj, attr, default)
    return val if val is not None else default
  except Exception:
    return default


class DatabricksGenieHandler(BaseDeploymentHandler):
  """Handler for Databricks Genie space interactions.

  Uses the Genie API to send natural language queries and retrieve results.
  The SDK's _and_wait methods handle polling automatically.
  """

  def __init__(self, agent_config: Dict[str, Any]):
    """Initialize handler with agent configuration."""
    super().__init__(agent_config)
    self.genie_space_id = agent_config.get('genie_space_id')

    if not self.genie_space_id:
      raise ValueError(f'Agent {agent_config.get("id")} has no genie_space_id configured')

  def _start_conversation_sync(self, client: WorkspaceClient, content: str) -> Dict[str, Any]:
    """Start a new Genie conversation. SDK handles polling."""
    logger.info(f'Starting Genie conversation in space {self.genie_space_id}')

    # start_conversation_and_wait handles all polling and returns the final GenieMessage
    msg = client.genie.start_conversation_and_wait(
      space_id=self.genie_space_id,
      content=content,
      timeout=timedelta(minutes=3),
    )

    conversation_id = _safe_get_attr(msg, 'conversation_id', '')
    message_id = _safe_get_attr(msg, 'message_id', '')
    logger.info(f'Genie conversation completed: conv={conversation_id}, msg={message_id}')

    return self._extract_result(client, msg, conversation_id, message_id)

  def _send_followup_sync(self, client: WorkspaceClient, conversation_id: str, content: str) -> Dict[str, Any]:
    """Send a follow-up message in an existing Genie conversation."""
    logger.info(f'Sending follow-up in Genie conversation {conversation_id}')

    # create_message_and_wait handles all polling and returns the final GenieMessage
    msg = client.genie.create_message_and_wait(
      space_id=self.genie_space_id,
      conversation_id=conversation_id,
      content=content,
      timeout=timedelta(minutes=3),
    )

    message_id = _safe_get_attr(msg, 'message_id', '')
    logger.info(f'Genie follow-up completed: conv={conversation_id}, msg={message_id}')

    return self._extract_result(client, msg, conversation_id, message_id)

  def _extract_result(self, client: WorkspaceClient, msg: Any, conversation_id: str, message_id: str) -> Dict[str, Any]:
    """Extract text, SQL, and table data from a Genie message response."""
    text_parts = []
    sql_query = None
    table_data = None
    query_attachment_id = None

    # Log the full message object for debugging
    logger.debug(f'Genie message object type: {type(msg).__name__}')
    logger.debug(f'Genie message attrs: {[a for a in dir(msg) if not a.startswith("_")]}')

    # Get status
    status_val = _safe_get_attr(msg, 'status', None)
    status = status_val.value if status_val and hasattr(status_val, 'value') else str(status_val or 'UNKNOWN')
    logger.info(f'Genie message status: {status}')

    if status == 'FAILED':
      error_msg = 'The query could not be completed.'
      msg_error = _safe_get_attr(msg, 'error', None)
      if msg_error:
        error_msg = str(msg_error)
      return {
        'conversation_id': conversation_id,
        'text': f'Sorry, {error_msg}',
        'sql': None,
        'table': None,
        'status': status,
      }

    # Extract attachments (text, query, results)
    attachments = _safe_get_attr(msg, 'attachments', None)
    if attachments:
      for attachment in attachments:
        logger.debug(f'Attachment type: {type(attachment).__name__}, attrs: {[a for a in dir(attachment) if not a.startswith("_")]}')

        # Text attachment
        text_obj = _safe_get_attr(attachment, 'text', None)
        if text_obj:
          text_content = _safe_get_attr(text_obj, 'content', None)
          if text_content:
            text_parts.append(str(text_content))

        # Query attachment (contains SQL)
        query_obj = _safe_get_attr(attachment, 'query', None)
        if query_obj:
          # Get the SQL query string
          sql = _safe_get_attr(query_obj, 'query', None)
          if sql:
            sql_query = str(sql)

          # Get query description
          desc = _safe_get_attr(query_obj, 'description', None)
          if desc:
            text_parts.append(str(desc))

          # Get the attachment ID for fetching query results
          att_id = _safe_get_attr(attachment, 'id', None)
          if att_id:
            query_attachment_id = str(att_id)
            logger.debug(f'Found query attachment ID: {query_attachment_id}')

    # Build final text
    final_text = '\n\n'.join(text_parts) if text_parts else ''

    # Try to get query results if we have a SQL query
    if sql_query and message_id:
      try:
        # Try the newer attachment-based API first
        if query_attachment_id:
          logger.info(f'Fetching query results via attachment API: attachment={query_attachment_id}')
          query_result = client.genie.get_message_attachment_query_result(
            space_id=self.genie_space_id,
            conversation_id=conversation_id,
            message_id=message_id,
            attachment_id=query_attachment_id,
          )
        else:
          # Fallback to deprecated API
          logger.info('Fetching query results via legacy API')
          query_result = client.genie.get_message_query_result(
            space_id=self.genie_space_id,
            conversation_id=conversation_id,
            message_id=message_id,
          )

        logger.debug(f'Query result type: {type(query_result).__name__}')

        # Extract statement_response
        stmt = _safe_get_attr(query_result, 'statement_response', None)
        if stmt:
          # Extract columns from manifest > schema > columns
          columns = []
          manifest = _safe_get_attr(stmt, 'manifest', None)
          if manifest:
            schema = _safe_get_attr(manifest, 'schema', None)
            if schema:
              schema_columns = _safe_get_attr(schema, 'columns', None)
              if schema_columns:
                columns = [_safe_get_attr(col, 'name', f'col_{i}') for i, col in enumerate(schema_columns)]

          # Extract rows from result > data_array
          rows = []
          result_obj = _safe_get_attr(stmt, 'result', None)
          if result_obj:
            data_array = _safe_get_attr(result_obj, 'data_array', None)
            if data_array:
              rows = [list(row) for row in data_array]

          if columns and rows:
            table_data = {'columns': columns, 'rows': rows}
            logger.info(f'Extracted {len(rows)} rows x {len(columns)} columns from query result')

      except Exception as e:
        logger.warning(f'Could not fetch Genie query results: {e}')
        import traceback
        logger.debug(traceback.format_exc())

    # If no text was extracted, provide a default response
    if not final_text and not table_data:
      final_text = 'I processed your request but could not generate a response. Please try rephrasing your question.'

    return {
      'conversation_id': conversation_id,
      'text': final_text,
      'sql': sql_query,
      'table': table_data,
      'status': status,
    }

  async def predict_stream(
    self, messages: List[Dict[str, str]], endpoint_name: str = ''
  ) -> AsyncGenerator[str, None]:
    """Stream response from Genie space.

    Since the Genie API is request/response (not streaming), we simulate
    streaming by sending progress events followed by the final response.

    Args:
      messages: List of messages with 'role' and 'content' keys
      endpoint_name: chat_id passed for conversation tracking

    Yields:
      SSE-formatted strings with JSON data
    """
    # Extract the last user message
    user_message = ''
    for msg in reversed(messages):
      if msg.get('role') == 'user':
        user_message = msg.get('content', '')
        break

    if not user_message:
      yield f'data: {json.dumps({"type": "error", "error": "No user message found"})}\n\n'
      yield 'data: [DONE]\n\n'
      return

    # Send a "thinking" indicator
    yield f'data: {json.dumps({"type": "response.output_text.delta", "delta": ""})}\n\n'

    try:
      client = WorkspaceClient()

      # Check if we have an existing conversation for this chat
      chat_id = endpoint_name  # chat_id is passed through endpoint_name for Genie
      existing_conversation_id = _genie_conversations.get(chat_id) if chat_id else None

      # Run the sync Genie call in a thread pool
      if existing_conversation_id:
        try:
          result = await asyncio.to_thread(
            self._send_followup_sync, client, existing_conversation_id, user_message
          )
        except Exception as followup_err:
          # If follow-up fails, try starting a new conversation
          logger.warning(f'Follow-up failed, starting new conversation: {followup_err}')
          result = await asyncio.to_thread(
            self._start_conversation_sync, client, user_message
          )
      else:
        result = await asyncio.to_thread(
          self._start_conversation_sync, client, user_message
        )

      # Store conversation ID for follow-ups
      if chat_id and result.get('conversation_id'):
        _genie_conversations[chat_id] = result['conversation_id']

      # Build the response text
      response_parts = []

      # Add text response
      if result.get('text'):
        response_parts.append(result['text'])

      # Add SQL query if present
      if result.get('sql'):
        response_parts.append(f'\n**SQL Query:**\n```sql\n{result["sql"]}\n```')

      # Add table results if present
      if result.get('table'):
        table = result['table']
        markdown_table = _format_query_result_as_markdown(
          table.get('columns', []),
          table.get('rows', []),
        )
        if markdown_table:
          response_parts.append(f'\n**Results:**\n{markdown_table}')

      full_response = '\n'.join(response_parts)

      if not full_response:
        full_response = 'I was unable to process your request. Please try a different question.'

      # Stream the response as a single delta (since Genie is not truly streaming)
      yield f'data: {json.dumps({"type": "response.output_text.delta", "delta": full_response})}\n\n'

      # Send completion event
      done_event = {
        'type': 'response.output_item.done',
        'item': {
          'id': f'genie_{result.get("conversation_id", "unknown")}',
          'type': 'message',
          'role': 'assistant',
          'content': [{'type': 'output_text', 'text': full_response}],
        },
      }
      yield f'data: {json.dumps(done_event)}\n\n'
      yield 'data: [DONE]\n\n'

    except Exception as e:
      logger.error(f'Genie handler error: {e}')
      import traceback
      logger.error(traceback.format_exc())
      yield f'data: {json.dumps({"type": "error", "error": f"Genie error: {str(e)}"})}\n\n'
      yield 'data: [DONE]\n\n'
