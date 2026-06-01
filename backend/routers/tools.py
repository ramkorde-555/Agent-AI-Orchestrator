from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from engine.tools import TOOL_REGISTRY

router = APIRouter(prefix="/tools", tags=["Tools"])

class ToolInfo(BaseModel):
    id: str
    name: str
    description: str

@router.get("/", response_model=List[ToolInfo])
async def list_tools():
    # Dynamically extract details straight from the LangChain tool objects
    return [
        {
            "id": tool_id, 
            "name": tool_id.replace("_", " ").title(), 
            "description": tool_obj.description
        }
        for tool_id, tool_obj in TOOL_REGISTRY.items()
    ]