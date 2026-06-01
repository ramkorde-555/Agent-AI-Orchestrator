import json
import uuid
from typing import Dict, Any
from langchain_core.messages import SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.config import RunnableConfig

from models import Agent
from .state import AgentState
from .tools import TOOL_REGISTRY
from .utils import calculate_cost

async def call_agent_model(state: AgentState, config: RunnableConfig, agent_config: dict = None) -> Dict[str, Any]:
    """
    The core LangGraph node that dynamically configures and invokes the LLM.
    Now reads its personality and tools directly from the UI's JSON blueprint!
    """

    if not agent_config:
        raise ValueError("Agent configuration missing from graph factory.")
    # Extract the database session injected via RunnableConfig at runtime
    db = config.get("configurable", {}).get("db_session")
    if not db:
        raise ValueError("Database session must be provided in RunnableConfig.")

    # Dynamic Configuration Fetching
    # Convert string back to UUID for the database query
    agent_id_str = state.get("current_agent_id")
    if not agent_id_str:
        raise ValueError("current_agent_id is missing from the state.")
    
    clean_uuid_str = agent_id_str.replace("agent_", "")
        
    agent_name = agent_config.get("name", "Unknown Agent")
    system_prompt = agent_config.get("system_prompt", "")
    tools_list = agent_config.get("tools", [])

    # The LLM Invocation
    # Initialize the specific model engine defined in the database
    model_name = agent_config.get("model", agent_config.get("llm_model", "gpt-4o")).lower()
    if "gpt" in model_name:
        llm = ChatOpenAI(model=model_name, temperature=0.2)
    elif "claude" in model_name:
        llm = ChatAnthropic(model=model_name, temperature=0.2)
    elif "gemini" in model_name:
        llm = ChatGoogleGenerativeAI(model=model_name, temperature=0.2)
    else:
        # Fallback to a default if the string doesn't match known providers
        llm = ChatOpenAI(model="gpt-4o", temperature=0.2)

    # Resolve tool strings to executable functions and bind them to the LLM
    assigned_tools = [
        TOOL_REGISTRY[t_name] for t_name in tools_list 
        if t_name in TOOL_REGISTRY
    ]
    
    if assigned_tools:
        llm = llm.bind_tools(assigned_tools)

    # Inject the system prompt at the very beginning of the context window.
    # We do not append this to the state; it is injected fresh on every call 
    # to guarantee it never gets truncated out of the rolling history.
    messages_for_llm = [SystemMessage(content=system_prompt)] + state["messages"]

    # Execute the asynchronous LLM call
    response = await llm.ainvoke(messages_for_llm)

    input_tokens = 0
    output_tokens = 0
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        input_tokens = response.usage_metadata.get("input_tokens", 0)
        output_tokens = response.usage_metadata.get("output_tokens", 0)
    elif "token_usage" in response.response_metadata:
        # Fallback for older LangChain formats
        input_tokens = response.response_metadata["token_usage"].get("prompt_tokens", 0)
        output_tokens = response.response_metadata["token_usage"].get("completion_tokens", 0)

    
    execution_cost = calculate_cost(model_name, input_tokens, output_tokens)

    # State Mutation
    # Return the AI message wrapped in a dict. 
    # The 'add_messages' reducer defined in state.py automatically appends it.
    # We also update 'sender' so the UI logs know who just spoke.
    return {
        "messages": [response],
        "sender": agent_name,
        "metrics": {
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost": execution_cost
        }
    }

async def execute_tools(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    """
    Intercepts tool requests from the LLM, executes the matched Python functions,
    and wraps the results (or errors) in ToolMessages for the LLM to read on the next turn.
    """
    # Interception & Extraction
    # The AI's output is always the last message in the current state
    last_message = state["messages"][-1]
    
    # Safety check: If there are no tool calls, return empty to avoid crashes
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"messages": []}

    tool_messages = []

    # Loop through every tool the LLM requested in this turn
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_call_id = tool_call["id"]

        # Error Handling
        try:
            # Security check: Ensure the requested tool actually exists in the runtime registry
            if tool_name not in TOOL_REGISTRY:
                raise ValueError(f"Tool '{tool_name}' is not registered in the system.")
            
            tool_instance = TOOL_REGISTRY[tool_name]
            
            # Execution & Wrapping
            # ainvoke executes the LangChain tool asynchronously
            result = await tool_instance.ainvoke(tool_args)
            
            # The LLM expects the content to be a string. 
            # If the tool returns a dict/list, serialize it to JSON.
            content = result if isinstance(result, str) else json.dumps(result)
            
            # Wrap the successful execution
            tool_messages.append(
                ToolMessage(
                    content=content,
                    tool_call_id=tool_call_id,
                    name=tool_name
                )
            )
            
        except Exception as e:
            # If the tool fails (e.g., API timeout, bad arguments), wrap the error string.
            # The LLM reads this as the tool's output and will attempt to self-correct.
            error_msg = f"Error executing tool {tool_name}: {str(e)}"
            tool_messages.append(
                ToolMessage(
                    content=error_msg,
                    tool_call_id=tool_call_id,
                    name=tool_name
                )
            )

    # Return the list of ToolMessages. 
    # The 'add_messages' reducer appends these right below the LLM's original request.
    return {
        "messages": tool_messages,
        "sender": "system" # Tagged as system since the execution happens outside the agent's brain
    }