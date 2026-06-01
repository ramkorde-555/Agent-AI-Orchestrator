from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# The connection string using the asyncpg driver
# Resolving to the database container within the internal Docker network.
DATABASE_URL = "postgresql+asyncpg://yuno_admin:yuno_secure_password@postgres:5432/yuno_agents"

# Initialize the asynchronous engine with echo for loggig
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async def get_session() -> AsyncSession:
    # Define the async session factory.
    # expire_on_commit=False prevents issues where attributes are unavailable after a commit.
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    # Yield the session for FastAPI's dependency injection system.
    # This ensures connections are properly closed/returned to the pool after the request finishes.
    async with async_session() as session:
        yield session