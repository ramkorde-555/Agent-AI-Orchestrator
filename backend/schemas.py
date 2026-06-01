import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

# Base schema containing the common attributes across all agent requests
class AgentBase(BaseModel):
    name: str = Field(..., max_length=255, description="The display name of the agent")
    role: str = Field(..., max_length=255, description="The operational role or title of the agent")
    system_prompt: str = Field(..., description="The core instructions defining agent behavior")
    llm_model: str = Field(..., max_length=100, description="The underlying LLM engine, e.g., 'gpt-4o'")
    tools: List[str] = Field(default_factory=list, description="List of tool names the agent can access")
    limits: Dict[str, Any] = Field(default_factory=dict, description="Execution limits (e.g., max_tokens)")

# Schema for incoming POST requests
class AgentCreate(AgentBase):
    # Inherits everything exactly as-is from AgentBase.
    # No ID is present here because the database generates it.
    pass

# Schema for outgoing GET/POST responses
class AgentRead(AgentBase):
    id: uuid.UUID
    
    # model_config allows Pydantic to read data directly from the SQLAlchemy model instances
    model_config = ConfigDict(from_attributes=True)

# Schema for incoming PATCH requests
class AgentUpdate(BaseModel):
    # All fields are optional so the client can update only what they need
    name: Optional[str] = Field(default=None, max_length=255)
    role: Optional[str] = Field(default=None, max_length=255)
    system_prompt: Optional[str] = Field(default=None)
    llm_model: Optional[str] = Field(default=None, max_length=100)
    tools: Optional[List[str]] = Field(default=None)
    limits: Optional[Dict[str, Any]] = Field(default=None)



class SessionCreate(BaseModel):
    workflow_id: uuid.UUID = Field(..., description="The ID of the workflow this session executes")
    # Status defaults to 'active' on the database level, so it is not required in the create payload

class SessionRead(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# (Message creation is typically handled internally by the agent runtime, 
# but a schema is useful if external webhooks inject messages directly).

class MessageCreate(BaseModel):
    sender_type: str = Field(..., description="'human', 'agent', or 'system'")
    sender_id: str = Field(..., description="UUID of the agent, or external ID of the human")
    content: str
    tokens_used: int = 0
    cost: float = 0.0

class MessageRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    sender_type: str
    sender_id: str
    content: str
    tokens_used: int
    cost: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SessionExecute(BaseModel):
    content: str = Field(..., description="The text message from the user")
    sender_id: str = Field(..., description="The external ID of the user (e.g., Telegram ID or UI User ID)")

class WorkflowCreate(BaseModel):
    name: str = Field(..., description="Name of the workflow")
    description: str = Field(default="")
    graph_config: Dict[str, Any] = Field(..., description="The JSON mapping of nodes and edges")

class ExecuteRequest(BaseModel):
    workflow_id: str = Field(..., description="The UUID of the database workflow to compile")
    message: str = Field(..., description="The user's chat message")

class TelegramChat(BaseModel):
    id: int

class TelegramMessage(BaseModel):
    chat: TelegramChat
    text: Optional[str] = None # Optional because users might send stickers/images

class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[TelegramMessage] = None