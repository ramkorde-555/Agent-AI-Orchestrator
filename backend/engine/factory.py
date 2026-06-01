# backend/engine/factory.py
import uuid
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.config import RunnableConfig
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from models import Workflow
from .state import AgentState
from .nodes import call_agent_model, execute_tools
from .checkpointer import connection_pool

# --- Routing Helpers ---

#DEPRICATED
def should_use_tools(state: AgentState) -> str:
    """Checks the agent's last output to see if it requested a tool."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "next"
#DEPRICATED
def route_after_tools(state: AgentState) -> str:
    """Returns execution to the specific agent that called the tool."""
    return state.get("current_agent_id", END)

def create_tool_router(agents_config: list):
    """Infers which agent called the tool based on the tool's name."""
    def route_after_tools(state) -> str:
        # The second-to-last message is the AI that requested the tool
        last_ai_message = state["messages"][-2]
        
        if hasattr(last_ai_message, "tool_calls") and last_ai_message.tool_calls:
            # Get the exact name of the tool that was just used
            tool_name = last_ai_message.tool_calls[0]["name"]
            
            # Match the tool name back to the agent that owns it
            for agent in agents_config:
                if tool_name in agent.get("tools", []):
                    return agent["id"] # Route back to the agent!
                    
        # Fallback to END only if something goes wrong
        return "__end__"
    return route_after_tools


def create_dynamic_router(agent_id: str, edges: list):
    """A smart router that handles tools, UI text conditions, and pausing."""
    def route(state) -> str:
        last_message = state["messages"][-1]

        # 1. Tool Execution (Highest Priority)
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"

        # 2. UI Text-Based Routing (The Magic Words)
        content = last_message.content if hasattr(last_message, "content") else ""
        if content:
            # Check all edges to see if this agent has a condition to pass the baton
            for edge in edges:
                if edge.get("from") == agent_id:
                    condition = edge.get("condition")
                    # If the AI output the exact system token, route to the target agent!
                    if condition and condition in content:
                        return edge.get("to")

        # 3. Default: Pause and Wait for User Input
        return "__end__"
    return route

# --- The Graph Factory ---

async def build_dynamic_graph(workflow_id: uuid.UUID, db: AsyncSession):
    """
    Reads the UI layout from PostgreSQL and compiles a custom LangGraph on the fly.
    """
    # 1. Fetch the blueprint
    db_workflow = await db.get(Workflow, workflow_id)
    if not db_workflow:
        raise ValueError("Workflow not found")
        
    config = db_workflow.graph_config
    
    # 2. Instantiate the blank canvas
    workflow = StateGraph(AgentState)
    
    # 3. Add the universal Tool Node
    # Every agent shares this single tool execution node
    workflow.add_node("tools", execute_tools)
    
    
    # 4. Dynamically Add Agent Nodes
    for node_data in config.get("agents", []):
        agent_id = node_data["id"]
        
        # We use a closure with a default argument (a_id=agent_id) to prevent 
        # Python's late-binding loop bug, ensuring each node remembers its own unique ID.
        async def dynamic_agent_node(state: AgentState, config: RunnableConfig, a_id=agent_id, a_data=node_data):
            # Inject the current ID into the state so the core node knows who it is
            state["current_agent_id"] = a_id
            return await call_agent_model(state, config, agent_config=a_data)
            
        workflow.add_node(agent_id, dynamic_agent_node)

        if node_data.get("is_entry") is True:
            workflow.set_entry_point(agent_id)
        
    # 5. Map the UI Edges
    # Convert the JSON array into a quick lookup dictionary: { "from_id": "to_id" }
    ui_edges = {edge["from"]: edge["to"] for edge in config.get("edges", [])}

    # Create a list of every agent that HAS an outgoing line
    nodes_with_outgoing_edges = [edge["from"] for edge in config["edges"]]
    
    # 6. Wire the Conditional Logic
    # Build a master routing map of all possible destinations in the graph
    routing_map = {
        "tools": "tools", 
        "__end__": END
    }
    # Add every agent's ID to the routing map so LangGraph knows they exist
    for agent in config.get("agents", []):
        routing_map[agent["id"]] = agent["id"]

    # Apply the Smart Router to every agent
    for node_data in config.get("agents", []):
        agent_id = node_data["id"]
        
        workflow.add_conditional_edges(
            agent_id,
            create_dynamic_router(agent_id, config.get("edges", [])),
            routing_map
        )
        
    # 7. Wire the Tool Return Path
    # The tools node needs to know all possible agents it might need to return to.
    all_agent_ids = [n["id"] for n in config.get("agents", [])]
    tools_return_map = {a_id: a_id for a_id in all_agent_ids}
    tools_return_map["__end__"] = "__end__"
    
    workflow.add_conditional_edges(
        "tools",
        create_tool_router(config.get("agents", [])),
        tools_return_map
    )
    
    
    checkpointer = AsyncPostgresSaver(connection_pool)
    return workflow.compile(checkpointer=checkpointer)