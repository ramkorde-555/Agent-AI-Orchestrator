import uuid
from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select

# Import the core components built in previous steps
from models import Agent
from schemas import AgentCreate, AgentRead, AgentUpdate
from dependencies import DbSession

# Initialize the router with a standard prefix and tag for Swagger UI organization
router = APIRouter(prefix="/agents", tags=["Agents"])

@router.post("/", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
async def create_agent(agent_in: AgentCreate, session: DbSession):
    # Convert the Pydantic schema into a SQLModel database instance
    db_agent = Agent.model_validate(agent_in)
    
    session.add(db_agent)
    await session.commit()
    # Refresh retrieves the database-generated fields (like the UUID) back into the python object
    await session.refresh(db_agent)
    
    return db_agent

@router.get("/", response_model=List[AgentRead])
async def list_agents(
    session: DbSession,
    offset: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, le=100, description="Maximum number of records to return")
):
    # Execute a paginated select query
    statement = select(Agent).offset(offset).limit(limit)
    result = await session.execute(statement)
    agents = result.scalars().all()
    
    return agents

@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: uuid.UUID, session: DbSession):
    db_agent = await session.get(Agent, agent_id)
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return db_agent

@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(agent_id: uuid.UUID, agent_update: AgentUpdate, session: DbSession):
    db_agent = await session.get(Agent, agent_id)
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # exclude_unset=True ensures only the fields explicitly provided in the request are updated
    update_data = agent_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_agent, key, value)
        
    session.add(db_agent)
    await session.commit()
    await session.refresh(db_agent)
    
    return db_agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: uuid.UUID, session: DbSession):
    db_agent = await session.get(Agent, agent_id)
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    await session.delete(db_agent)
    await session.commit()