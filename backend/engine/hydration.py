import uuid
from typing import List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage

from models import Message, Session
from .state import AgentState

def map_db_to_langchain_message(db_msg: Message) -> BaseMessage:
    """
    Translates a database Message row into its corresponding LangChain object.
    Preserves the message ID and sender identity across the boundaries.
    """
    if db_msg.sender_type == "human":
        return HumanMessage(
            content=db_msg.content, 
            id=str(db_msg.id)
        )
    elif db_msg.sender_type == "agent":
        return AIMessage(
            content=db_msg.content, 
            id=str(db_msg.id), 
            name=db_msg.sender_id  # Contains the specific Agent UUID string
        )
    elif db_msg.sender_type == "system":
        return SystemMessage(
            content=db_msg.content, 
            id=str(db_msg.id)
        )
    else:
        # Fallback for unknown or unhandled sender types
        return HumanMessage(
            content=db_msg.content, 
            id=str(db_msg.id)
        )

async def hydrate_agent_state(session_id: uuid.UUID, db: AsyncSession) -> AgentState:
    """
    Queries the database for a session's complete history, reconstructs 
    the LangChain message timeline, and packages it into an initialized AgentState.
    """
    # 1. Verify the session exists and fetch its current metadata
    db_session = await db.get(Session, session_id)
    if not db_session:
        raise ValueError(f"Session with ID {session_id} does not exist.")

    # 2. Retrieve all messages for this session ordered chronologically
    statement = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(statement)
    db_messages = result.scalars().all()

    # 3. Map database rows to LangChain message instances
    langchain_messages: List[BaseMessage] = [
        map_db_to_langchain_message(msg) for msg in db_messages
    ]

    # 4. Construct and return the state payload matching our AgentState TypedDict
    return AgentState(
        messages=langchain_messages,
        current_agent_id="",  # Will be populated by the orchestrator router or entry node
        session_id=str(session_id),
        sender="system"       # Indicates the state was assembled by the system hydrator
    )