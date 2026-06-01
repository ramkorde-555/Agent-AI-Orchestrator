from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

DB_URI = "postgresql://yuno_admin:yuno_secure_password@postgres:5432/yuno_agents"

# We define the pool here, but do NOT instantiate the AsyncPostgresSaver yet.
connection_pool = AsyncConnectionPool(
    conninfo=DB_URI,
    max_size=20,
    # dict_row is strictly required by LangGraph to parse the database columns correctly
    kwargs={"autocommit": True, "row_factory": dict_row},
    open=False
)