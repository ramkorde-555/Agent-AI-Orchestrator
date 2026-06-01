from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Annotated with add_messages to append the new message to the existing history.
    messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # Stores the UUID of the agent currently executing.
    # Passed as a string to avoid UUID serialization issues within the LangGraph runtime.
    current_agent_id: str
    
    # Ties the live runtime memory back to the PostgreSQL persistence layer.
    session_id: str
    
    # Identifies what node or entity last mutated the state (e.g., 'human', 'system', 'agent')
    sender: str