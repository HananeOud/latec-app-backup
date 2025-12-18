"""In-memory chat storage implementation.

This module provides simple in-memory storage for chat sessions.
Uses SQLAlchemy models in detached mode (not connected to any database).
- Max 10 chats per user (oldest deleted when limit reached)
- Chat persistence only during app runtime
- User isolation via email-scoped storage
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from server.db.models import ChatModel, MessageModel

from .base import BaseChatStorage, BaseUserScopedChatStorage


class MemoryChatStorage(BaseChatStorage):
  """In-memory storage for chat sessions for a single user.

  Features:
  - Stores up to max_chats (default 10)
  - Automatically deletes oldest chat when limit reached
  - Simple dictionary-based storage
  - Uses SQLAlchemy models in detached mode
  """

  def __init__(self, user_email: str, max_chats: int = 10):
    """Initialize storage with user email and max chat limit."""
    self.user_email = user_email
    self.chats: Dict[str, ChatModel] = {}
    self.max_chats = max_chats

  async def get_all(self) -> List[ChatModel]:
    """Get all chats sorted by updated_at (newest first)."""
    return sorted(self.chats.values(), key=lambda c: c.updated_at, reverse=True)

  async def get(self, chat_id: str) -> Optional[ChatModel]:
    """Get specific chat by ID."""
    return self.chats.get(chat_id)

  async def create(self, title: str = 'New Chat', agent_id: Optional[str] = None) -> ChatModel:
    """Create new chat.

    If max_chats limit reached, deletes the oldest chat.
    """
    # Enforce max limit - delete oldest chat if needed
    if len(self.chats) >= self.max_chats:
      oldest = min(self.chats.values(), key=lambda c: c.updated_at)
      del self.chats[oldest.id]

    # Create new chat using SQLAlchemy model (detached)
    chat_id = f'chat_{uuid.uuid4().hex[:12]}'
    now = datetime.now()
    new_chat = ChatModel(
      id=chat_id,
      user_email=self.user_email,
      title=title,
      agent_id=agent_id,
      created_at=now,
      updated_at=now,
    )
    # Initialize messages list for detached model
    new_chat.messages = []

    self.chats[chat_id] = new_chat
    return new_chat

  async def add_message(self, chat_id: str, msg: MessageModel) -> bool:
    """Add message to existing chat."""
    chat = self.chats.get(chat_id)
    if not chat:
      return False

    # Set the chat_id on the message
    msg.chat_id = chat_id
    chat.messages.append(msg)
    chat.updated_at = datetime.now()

    # Auto-generate title from first user message
    if len(chat.messages) == 1 and msg.role == 'user':
      chat.title = msg.content[:50] + ('...' if len(msg.content) > 50 else '')

    return True

  async def update_title(self, chat_id: str, title: str) -> bool:
    """Update chat title."""
    chat = self.chats.get(chat_id)
    if not chat:
      return False
    chat.title = title
    chat.updated_at = datetime.now()
    return True

  async def delete(self, chat_id: str) -> bool:
    """Delete chat by ID."""
    if chat_id in self.chats:
      del self.chats[chat_id]
      return True
    return False

  async def clear_all(self) -> int:
    """Delete all chats."""
    count = len(self.chats)
    self.chats.clear()
    return count


class MemoryUserScopedChatStorage(BaseUserScopedChatStorage):
  """User-scoped in-memory chat storage manager.

  Maintains separate MemoryChatStorage instances per user (by email).
  Each user has their own isolated chat history.
  """

  def __init__(self, max_chats_per_user: int = 10):
    """Initialize user-scoped storage."""
    self._user_storages: Dict[str, MemoryChatStorage] = {}
    self._max_chats_per_user = max_chats_per_user

  def get_storage_for_user(self, user_email: str) -> BaseChatStorage:
    """Get or create MemoryChatStorage for a specific user."""
    if user_email not in self._user_storages:
      self._user_storages[user_email] = MemoryChatStorage(
        user_email=user_email,
        max_chats=self._max_chats_per_user,
      )
    return self._user_storages[user_email]

  async def get_all_users(self) -> List[str]:
    """Get list of all users with chat storage."""
    return list(self._user_storages.keys())

  async def clear_user_storage(self, user_email: str) -> bool:
    """Clear all storage for a specific user."""
    if user_email in self._user_storages:
      del self._user_storages[user_email]
      return True
    return False
