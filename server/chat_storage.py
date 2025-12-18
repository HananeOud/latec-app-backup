"""Chat storage with automatic backend selection.

This module provides chat storage with automatic backend selection:
- If LAKEBASE_PG_URL is set, uses PostgreSQL for persistent storage
- Otherwise, uses in-memory storage (data lost on restart)

Usage:
    from server.chat_storage import storage, ChatModel, MessageModel

    user_storage = storage.get_storage_for_user("user@example.com")
    chat = await user_storage.create("My Chat")
    await user_storage.add_message(chat.id, MessageModel(id="msg1", role="user", content="Hello"))

Note: All storage operations are now async.
"""

from server.db.models import ChatModel, MessageModel
from server.services.chat import BaseChatStorage, BaseUserScopedChatStorage, get_storage

__all__ = ['ChatModel', 'MessageModel', 'storage', 'BaseChatStorage', 'BaseUserScopedChatStorage']


class _StorageProxy:
  """Lazy proxy for storage to handle async initialization.

  This ensures storage is fetched when accessed, not at module import.
  """

  def get_storage_for_user(self, user_email: str):
    """Get storage for a specific user."""
    return get_storage().get_storage_for_user(user_email)

  def __getattr__(self, name):
    """Forward attribute access to the real storage."""
    return getattr(get_storage(), name)


# Global singleton proxy - automatically selects backend based on LAKEBASE_PG_URL
storage = _StorageProxy()
