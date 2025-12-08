"""Base handler interface for different deployment types."""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List

from fastapi import Request

from ...auth.strategies import AuthStrategy


class BaseDeploymentHandler(ABC):
  """Abstract base class for deployment handlers.

  Each deployment type (databricks-endpoint, openai-compatible, local, etc.)
  should implement this interface to handle invocation and streaming.

  The handler focuses on:
  - Request payload formatting
  - Response parsing
  - Streaming implementation
  - Authentication (via injected strategy)

  The handler does NOT:
  - Log to MLflow (that stays in the router)
  - Handle feedback (that's centralized)
  """

  def __init__(self, agent_config: Dict[str, Any], auth_strategy: AuthStrategy):
    """Initialize handler with agent configuration and auth strategy.

    Args:
      agent_config: The agent configuration dict from agents.json
      auth_strategy: Authentication strategy for this deployment type
    """
    self.agent_config = agent_config
    self.auth_strategy = auth_strategy

  @abstractmethod
  async def invoke_stream(
    self, messages: List[Dict[str, str]], client_request_id: str, request: Request
  ) -> AsyncGenerator[str, None]:
    """Stream response from the endpoint.

    Args:
      messages: List of messages with 'role' and 'content' keys
      client_request_id: Unique ID for trace linking (e.g., 'req-abc123')
      request: FastAPI Request object (for auth headers)

    Yields:
      Server-Sent Events (SSE) formatted strings with JSON data
    """
    pass

  @abstractmethod
  def invoke(
    self, messages: List[Dict[str, str]], client_request_id: str, request: Request
  ) -> Dict[str, Any]:
    """Non-streaming invocation.

    Args:
      messages: List of messages with 'role' and 'content' keys
      client_request_id: Unique ID for trace linking (e.g., 'req-abc123')
      request: FastAPI Request object (for auth headers)

    Returns:
      Response dict (format may vary by handler type)
    """
    pass
