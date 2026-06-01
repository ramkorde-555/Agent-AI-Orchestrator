# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import agents, sessions, tools, workflows, webhooks
from database import engine
from sqlmodel import SQLModel
from seeder import seed_database

# Import the checkpointer and its connection pool
from engine.checkpointer import connection_pool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize all SQLModel tables (Agents, Messages, Workflows, etc.)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    # 2. Open the checkpointer connection pool
    await connection_pool.open()
    
    # 3. Setup LangGraph's internal state tables
    checkpointer = AsyncPostgresSaver(connection_pool)
    await checkpointer.setup()
    
    await seed_database()
    
    yield
    
    # 4. Gracefully close the checkpointer pool on server shutdown
    await connection_pool.close()

app = FastAPI(
    title="Yuno AI Orchestrator",
    description="API for managing autonomous AI agents and workflows.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(sessions.router)
app.include_router(tools.router)
app.include_router(workflows.router)
app.include_router(webhooks.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}