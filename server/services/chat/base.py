"""Abstract base class for chat storage implementations.

This module defines the async interface that all chat storage backends must implement.
Uses SQLAlchemy models directly for both memory and PostgreSQL storage.
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
  from server.db.models import ChatModel

# Import models - they work both attached (PostgreSQL) and detached (memory)
from server.db.models import ChatModel, MessageModel


class BaseChatStorage(ABC):
  """Abstract base class for chat storage backends.

  All storage implementations (memory, PostgreSQL, etc.) must implement this interface.
  All methods are async to support non-blocking database operations.
  """

  @abstractmethod
  async def get_all(self) -> List[ChatModel]:
    """Get all chats sorted by updated_at (newest first).

    Returns:
        List of ChatModel objects
    """
    pass

  @abstractmethod
  async def get(self, chat_id: str) -> Optional[ChatModel]:
    """Get specific chat by ID.

    Args:
        chat_id: Chat ID to retrieve

    Returns:
        ChatModel if found, None otherwise
    """
    pass

  @abstractmethod
  async def create(self, title: str = 'New Chat', agent_id: Optional[str] = None) -> ChatModel:
    """Create new chat.

    Args:
        title: Chat title (default: "New Chat")
        agent_id: Selected agent ID (optional)

    Returns:
        Newly created ChatModel object
    """
    pass

  @abstractmethod
  async def add_message(self, chat_id: str, msg: MessageModel) -> bool:
    """Add message to existing chat.

    Args:
        chat_id: Chat ID to add message to
        msg: MessageModel object to add

    Returns:
        True if successful, False if chat not found
    """
    pass

  @abstractmethod
  async def update_title(self, chat_id: str, title: str) -> bool:
    """Update chat title.

    Args:
        chat_id: Chat ID to update
        title: New title

    Returns:
        True if successful, False if chat not found
    """
    pass

  @abstractmethod
  async def delete(self, chat_id: str) -> bool:
    """Delete chat by ID.

    Args:
        chat_id: Chat ID to delete

    Returns:
        True if deleted, False if not found
    """
    pass

  @abstractmethod
  async def clear_all(self) -> int:
    """Delete all chats.

    Returns:
        Number of chats deleted
    """
    pass


class BaseUserScopedChatStorage(ABC):
  """Abstract base class for user-scoped chat storage.

  Manages separate storage for each user (by email).
  """

  @abstractmethod
  def get_storage_for_user(self, user_email: str) -> BaseChatStorage:
    """Get or create ChatStorage for a specific user.

    Args:
        user_email: User's email address

    Returns:
        BaseChatStorage instance for the user
    """
    pass

  @abstractmethod
  async def get_all_users(self) -> List[str]:
    """Get list of all users with chat storage.

    Returns:
        List of user email addresses
    """
    pass

  @abstractmethod
  async def clear_user_storage(self, user_email: str) -> bool:
    """Clear all storage for a specific user.

    Args:
        user_email: User's email address

    Returns:
        True if user existed and was cleared, False otherwise
    """
    pass
