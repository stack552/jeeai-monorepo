# crud.py
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import Conversation, Message


def _generate_title(text: str, max_len: int = 40) -> str:
    """Build a short conversation title from the first user message."""
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip() + "..."


def create_conversation(db: Session, user_id: int, first_message: str) -> Conversation:
    """Create a new conversation for a user, titled from their first message."""
    conversation = Conversation(
        user_id=user_id,
        title=_generate_title(first_message),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def add_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    extra_data: dict | None = None,
) -> Message:
    """Append a message to a conversation and bump the conversation's updated_at."""
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        extra_data=extra_data,
    )
    db.add(message)

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(message)
    return message


def get_conversation(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
    """Fetch a conversation with its messages, only if it belongs to this user."""
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )


def list_conversations(db: Session, user_id: int) -> list[Conversation]:
    """List a user's conversations, most recently active first."""
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


def delete_conversation(db: Session, conversation_id: int, user_id: int) -> bool:
    """Delete a conversation (and its messages, via cascade) if it belongs to this user."""
    conversation = get_conversation(db, conversation_id, user_id)
    if not conversation:
        return False
    db.delete(conversation)
    db.commit()
    return True