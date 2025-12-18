"""Chat storage service with automatic backend selection.

This module provides a factory function to create chat storage instances.
If LAKEBASE_PG_URL is set, uses PostgreSQL; otherwise falls back to in-memory storage.

Usage:
    from server.services.chat import get_storage, init_storage
    from server.db.models import ChatModel, MessageModel

    # At app startup (e.g., in FastAPI lifespan)
    await init_storage()

    # Then use the storage
    storage = get_storage()
    user_storage = storage.get_storage_for_user("user@example.com")
    chat = await user_storage.create("My Chat")
"""

import logging
from typing import Optional

from server.db import create_tables, init_database, is_postgres_configured

from .base import BaseChatStorage, BaseUserScopedChatStorage
from .memory import MemoryChatStorage, MemoryUserScopedChatStorage

logger = logging.getLogger(__name__)

# Global storage instance
_storage: Optional[BaseUserScopedChatStorage] = None
_initialized: bool = False


async def init_storage(max_chats_per_user: int = 10) -> BaseUserScopedChatStorage:
  """Initialize the global chat storage instance asynchronously.

  Automatically selects the appropriate backend:
  - PostgreSQL if LAKEBASE_PG_URL is set
  - In-memory storage otherwise

  This should be called once at app startup (e.g., in FastAPI lifespan).
  """
  global _storage, _initialized

  if _initialized and _storage is not None:
    return _storage

  if is_postgres_configured():
    logger.info('Initializing PostgreSQL chat storage')
    try:
      from .postgres import PostgresUserScopedChatStorage

      init_database()
      await create_tables()

      _storage = PostgresUserScopedChatStorage(max_chats_per_user=max_chats_per_user)
      logger.info('PostgreSQL chat storage initialized successfully')
    except Exception as e:
      logger.error(f'Failed to initialize PostgreSQL storage: {e}')
      logger.warning('Falling back to in-memory storage')
      _storage = MemoryUserScopedChatStorage(max_chats_per_user=max_chats_per_user)
  else:
    logger.info('Using in-memory chat storage (LAKEBASE_PG_URL not set)')
    _storage = MemoryUserScopedChatStorage(max_chats_per_user=max_chats_per_user)

  _initialized = True
  return _storage


def get_storage() -> BaseUserScopedChatStorage:
  """Get the global chat storage instance.

  Must call init_storage() first (at app startup).
  If init_storage() wasn't called, falls back to in-memory storage.
  """
  global _storage

  if _storage is None:
    logger.warning('get_storage() called before init_storage() - using in-memory storage')
    _storage = MemoryUserScopedChatStorage(max_chats_per_user=10)

  return _storage


def reset_storage():
  """Reset the global storage instance. Useful for testing."""
  global _storage, _initialized
  _storage = None
  _initialized = False


__all__ = [
  'init_storage',
  'get_storage',
  'reset_storage',
  'BaseChatStorage',
  'BaseUserScopedChatStorage',
  'MemoryChatStorage',
  'MemoryUserScopedChatStorage',
]
