from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Import the session generator from the local database module
from database import get_session

# Creating an Annotated type alias for modern FastAPI dependency injection.
# This prevents boilerplate. Instead of writing `session: AsyncSession = Depends(get_session)`
# in every single route, endpoints can simply require `session: DbSession`.
DbSession = Annotated[AsyncSession, Depends(get_session)]