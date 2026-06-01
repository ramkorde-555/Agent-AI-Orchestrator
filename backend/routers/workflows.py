from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_session
from models import Workflow
from schemas import WorkflowCreate
from sqlmodel import select
from typing import List
import httpx
import os

router = APIRouter(prefix="/workflows", tags=["Workflows"])

@router.post("/", response_model=Workflow)
async def create_workflow(payload: WorkflowCreate, db: AsyncSession = Depends(get_session)):
    try:
        db_workflow = Workflow(
            name=payload.name,
            description=payload.description,
            graph_config=payload.graph_config
        )
        db.add(db_workflow)
        await db.commit()
        await db.refresh(db_workflow)
        return db_workflow
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/", response_model=List[Workflow])
async def list_workflows(db: AsyncSession = Depends(get_session)):
    try:
        # Fetch all workflows from the database
        result = await db.execute(select(Workflow))
        workflows = result.scalars().all()
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/{workflow_id}/activate-telegram")
async def activate_telegram(workflow_id: str, bot_token: str):
    # In production, pull your live domain from environment variables
    # For local testing, this would be your current ngrok URL
    base_url = os.getenv("PUBLIC_APP_URL", "https://juniper-reorder-dislodge.ngrok-free.dev")
    webhook_url = f"{base_url}/webhooks/telegram/{workflow_id}"
    
    telegram_api_url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(telegram_api_url, json={"url": webhook_url})
        res_data = response.json()
        
        if not res_data.get("ok"):
            raise HTTPException(
                status_code=400, 
                detail=f"Telegram failed to set webhook: {res_data.get('description')}"
            )
            
    return {"status": "success", "message": "Telegram webhook registered automatically!"}