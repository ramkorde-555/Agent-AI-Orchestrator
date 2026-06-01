import uuid
from datetime import datetime
from typing import List, Dict, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB

class Agent(SQLModel, table=True):
    # The table name for PostgreSQL
    __tablename__ = "agents"

    # UUID primary key
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    # Standard string fields for identity
    name: str = Field(index=True, max_length=255)
    role: str = Field(max_length=255)
    
    # sa_column=Column(Text) ensures Postgres allocates enough space for massive prompts
    system_prompt: str = Field(sa_column=Column(Text))
    
    # Defines the specific engine this agent relies on (e.g., 'gpt-4o', 'claude-3.5-sonnet')
    llm_model: str = Field(max_length=100)
    
    # Postgres JSON columns for arbitrary configurations.
    # Defaulting to empty structures prevents null reference errors during execution.
    tools: List[str] = Field(default=[], sa_column=Column(JSON))
    limits: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

class Workflow(SQLModel, table=True):
    __tablename__ = "workflows"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    name: str = Field(index=True, max_length=255)
    description: str = Field(default="")
    
    # Stores the serialized React Flow state (nodes, edges, viewports).
    graph_config: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )


class Session(SQLModel, table=True):
    __tablename__ = "sessions"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    # Foreign key establishing the relationship to the workflows table
    workflow_id: uuid.UUID = Field(foreign_key="workflows.id", index=True)
    
    # Tracks the state of the execution (e.g., 'active', 'paused', 'completed', 'failed')
    status: str = Field(default="active", max_length=50)
    
    # Using func.now() pushes timestamp generation down to PostgreSQL, 
    # ensuring timezone consistency across all containers.
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now(), 
            nullable=False
        )
    )

class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    # Foreign key linking the message to a specific task execution/conversation thread
    session_id: uuid.UUID = Field(foreign_key="sessions.id", index=True)
    
    # Categorizes the source: 'human', 'agent', or 'system' (for tool outputs/errors)
    sender_type: str = Field(max_length=50)
    
    # Stored as a string rather than a strict UUID foreign key. 
    # If the sender is an agent, this holds the Agent UUID. 
    # If the sender is a human via Telegram/WhatsApp/Slack, this holds their external user ID or phone number.
    sender_id: str = Field(max_length=255, index=True)
    
    # sa_column=Column(Text) ensures unlimited length for massive LLM responses or document contexts
    content: str = Field(sa_column=Column(Text))
    
    # Metrics for the live monitoring and cost tracking requirements
    tokens_used: int = Field(default=0)
    cost: float = Field(default=0.0)
    
    # Crucial for conversation reconstruction: ensuring messages are retrieved in exact chronological order
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            nullable=False
        )
    )

class ChannelIntegration(SQLModel, table=True):
    __tablename__ = "channel_integrations"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    # Foreign key establishing which agent owns this integration
    agent_id: uuid.UUID = Field(foreign_key="agents.id", index=True)
    
    # Identifies the platform (e.g., 'telegram', 'whatsapp', 'slack')
    # Indexed for faster webhook routing based on the incoming channel
    channel_type: str = Field(max_length=50, index=True)
    
    # The unique identifier for the agent on the external platform.
    # Depending on the platform, this could be a Bot Token, a phone number ID, or a Slack App ID.
    external_identifier: str = Field(max_length=255, index=True)