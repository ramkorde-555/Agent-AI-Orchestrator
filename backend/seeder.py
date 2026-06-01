import json
import os
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from models import Workflow
from database import engine

async def seed_database():
    """Seeds the database with prebuilt workflows if it is empty."""
    
    # Path to your JSON file
    seed_file_path = os.path.join(os.path.dirname(__file__), "seed_workflows.json")
    
    if not os.path.exists(seed_file_path):
        print("SYSTEM: No seed_workflows.json found. Skipping database seed.")
        return

    # Open a fresh database session
    async with AsyncSession(engine) as db:
        # Check if any workflows already exist
        result = await db.execute(select(Workflow).limit(1))
        existing_workflow = result.first()
        
        # Only inject if the database is completely empty
        if not existing_workflow:
            print("SYSTEM: Empty database detected. Injecting prebuilt workflows...")
            
            with open(seed_file_path, "r") as f:
                prebuilt_workflows = json.load(f)
                
                for workflow_data in prebuilt_workflows:
                    # Initialize the SQLModel object directly from the JSON dictionary
                    if "created_at" in workflow_data and isinstance(workflow_data["created_at"], str):
                        # Replace 'Z' with '+00:00' to ensure compatibility with Python's fromisoformat
                        date_str = workflow_data["created_at"].replace("Z", "+00:00")
                        workflow_data["created_at"] = datetime.fromisoformat(date_str)
                        
                    new_workflow = Workflow(**workflow_data)
                    db.add(new_workflow)
            
            await db.commit()
            print("SYSTEM: Prebuilt workflows successfully seeded!")
        else:
            print("SYSTEM: Database already contains data. Skipping seed.")