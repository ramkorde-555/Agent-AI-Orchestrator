import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_session
from schemas import ExecuteRequest
from models import Workflow
from engine.factory import build_dynamic_graph

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/{session_id}/execute")
async def execute_workflow(
    session_id: str, 
    payload: ExecuteRequest, 
    db: AsyncSession = Depends(get_session)
):
    try:
        workflow_uuid = uuid.UUID(payload.workflow_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workflow_id format.")

    workflow = await db.get(Workflow, workflow_uuid)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found.")

    try:
        graph_app = await build_dynamic_graph(workflow_uuid, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph compilation failed: {str(e)}")

    # Define the async generator for Server-Sent Events (SSE)
    async def event_generator():
        config = {
            "configurable": {
                "thread_id": session_id,
                "db_session": db
            }
        }
        input_state = {"messages": [("human", payload.message)]}
        
        try:
            # version="v2" gives us deep visibility into the graph's execution
            async for event in graph_app.astream_events(input_state, config=config, version="v2"):
                kind = event["event"]
                name = event.get("name", "unknown")
                
                # LangGraph attaches the active node's ID to the metadata of the event
                metadata = event.get("metadata", {})
                sender_node = metadata.get("langgraph_node", "System")

                # We package the event type and name for the Developer Logs
                stream_data = {
                    "event": kind, 
                    "name": name, 
                    "sender": sender_node 
                }
                
                # 1. Handle Agent streaming text for the Chat UI
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    stream_data["type"] = "agent"
                    
                    if hasattr(chunk, "content") and isinstance(chunk.content, str) and chunk.content:
                        stream_data["chunk"] = chunk.content
                    elif isinstance(chunk.content, list):
                        # Extract all text pieces from the array block
                        text = "".join([b.get("text", "") for b in chunk.content if isinstance(b, dict)])
                        if text:
                            stream_data["chunk"] = text
                            
                # 2. Handle Tool outputs for the Chat UI
                elif kind == "on_tool_end":
                    stream_data["type"] = "tool"
                    stream_data["sender"] = name # Override sender with the tool's name (e.g., 'subtract_lists')
                    # Convert the math/tool output to a string so the UI can render it
                    stream_data["chunk"] = str(event["data"].get("output", ""))

                # 3. Final Agent Content / Metrics (Keeping your existing logic)
                elif kind == "on_chain_end" and name.startswith("agent_"):
                    output = event["data"].get("output")
                    if isinstance(output, dict) and "messages" in output and output["messages"]:
                        final_msg = output["messages"][-1]
                        if hasattr(final_msg, "content") and isinstance(final_msg.content, str):
                            stream_data["final_content"] = final_msg.content
                        if "metrics" in output:
                            stream_data["metrics"] = output["metrics"]
                
                # Yield in SSE format
                yield f"data: {json.dumps(stream_data)}\n\n"
                
        except Exception as e:
            print(f"Execution Error: {str(e)}")
            yield f"data: {json.dumps({'event': 'error', 'content': str(e)})}\n\n"

    # Return the stream directly to the client
    return StreamingResponse(event_generator(), media_type="text/event-stream")