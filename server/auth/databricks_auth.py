"""Core Databricks authentication utilities.

Provides environment-agnostic utilities for authenticating with Databricks.
No deployment-type-specific logic - that belongs in strategies.
"""

import logging
import os

from fastapi import Request

logger = logging.getLogger(__name__)


def is_local_development() -> bool:
  """Detect if running in local development mode.

  Uses ENV environment variable to determine context:
  - ENV=development → Local development
  - ENV=production → Databricks Apps (default)

  Returns:
    True if running locally, False if in Databricks Apps
  """
  env = os.getenv('ENV', 'production')
  return env == 'development'


def get_databricks_host() -> str:
  """Get Databricks workspace host URL from environment.

  Reads DATABRICKS_HOST environment variable and ensures proper formatting.

  Returns:
    Databricks host URL with https:// prefix

  Raises:
    ValueError: If DATABRICKS_HOST is not set
  """
  host = os.getenv('DATABRICKS_HOST', '')

  if not host:
    raise ValueError(
      'DATABRICKS_HOST environment variable must be set. '
      'Add it to .env.local (dev) or app.yaml (production).'
    )

  # Ensure https:// prefix
  if not host.startswith('https://'):
    host = f'https://{host}'

  return host


def get_user_token_from_request(request: Request) -> str:
  """Extract user's access token from Databricks Apps request headers.

  In Databricks Apps, the platform automatically injects the authenticated
  user's access token in the X-Forwarded-Access-Token header.

  Args:
    request: FastAPI Request object

  Returns:
    User's access token

  Raises:
    ValueError: If X-Forwarded-Access-Token header is missing
  """
  user_token = request.headers.get('x-forwarded-access-token')

  if not user_token:
    raise ValueError(
      'No X-Forwarded-Access-Token header found. '
      'This app must run in Databricks Apps environment with user authentication enabled.'
    )

  return user_token


def get_dev_token() -> str:
  """Get personal access token (PAT) for local development.

  Reads DATABRICKS_TOKEN from environment (.env.local).

  Returns:
    Personal access token

  Raises:
    ValueError: If DATABRICKS_TOKEN is not set in development mode
  """
  token = os.getenv('DATABRICKS_TOKEN', '')

  if not token:
    raise ValueError(
      'DATABRICKS_TOKEN environment variable must be set for local development. '
      'Add it to .env.local file.'
    )

  return token
