import os
import uuid
import httpx
from fastapi import APIRouter, BackgroundTasks
from database import get_session
from schemas import TelegramUpdate
from engine.factory import build_dynamic_graph

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

async def execute_and_reply(workflow_id: str, chat_id: int, text: str):
    """Background task to run the graph and text the user back."""
    print(f"\n--- [TELEGRAM TASK START] Chat ID: {chat_id} ---")
    final_message = "System Error: The AI engine failed to process your request."
    
    # 1. Run the Graph
    try:
        # We manually open a fresh database connection specifically for this background task
        async for db in get_session():
            print("1. DB Session Acquired. Compiling Graph...")
            workflow_uuid = uuid.UUID(workflow_id)
            graph_app = await build_dynamic_graph(workflow_uuid, db)
            
            # Create a unique thread ID for this specific Telegram user
            session_id = f"tg_{chat_id}"
            config = {
                "configurable": {
                    "thread_id": session_id,
                    "db_session": db 
                }
            }
            
            print(f"2. Executing LangGraph for session: {session_id}...")
            input_state = {"messages": [("human", text)]}
            output = await graph_app.ainvoke(input_state, config=config)
            
            # Extract the raw content from LangChain's response
            raw_content = output["messages"][-1].content
            
            # Safely parse LangChain's complex message content format
            if isinstance(raw_content, list):
                # If Gemini returned a list of blocks, extract only the text portions
                final_message = "".join([block.get("text", "") for block in raw_content if isinstance(block, dict) and "text" in block])
            else:
                # If it's already a string, just ensure it's cast properly
                final_message = str(raw_content)
                
            print(f"3. Graph Success! Clean text: '{final_message[:50]}...'")
            
            # Break the loop so it only runs once and properly closes the db session
            break 

    except Exception as e:
        print(f"!!! GRAPH ERROR: {e}")

    # 2. Send the Reply back to Telegram
    try:
        print("4. Attempting to text the phone via Telegram API...")
        
        # 4a. Strict Token Validation
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            print("!!! ERROR: TELEGRAM_BOT_TOKEN is missing or None! Check your .env file.")
            return
            
        api_url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
        
        # 4b. Print a masked version of the URL to ensure it built correctly
        masked_url = f"https://api.telegram.org/bot{bot_token[:5]}.../sendMessage"
        print(f" -> Hitting URL: {masked_url}")
        
        # 4c. Force a strict 10-second timeout so it cannot hang forever
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                api_url,
                json={
                    "chat_id": chat_id,
                    "text": final_message
                }
            )
            
            print(f"5. Telegram API Response Code: {response.status_code}")
            if response.status_code != 200:
                print(f"!!! TELEGRAM REJECTION REASON: {response.text}")
            else:
                print("--- [TELEGRAM TASK COMPLETE] Message Delivered! ---\n")
                
    except httpx.ReadTimeout:
        print("!!! HTTP ERROR: The request to Telegram timed out. (Docker DNS issue?)")
    except Exception as e:
        print(f"!!! HTTP REQUEST ERROR: {e}")


@router.post("/telegram/{workflow_id}")
async def telegram_webhook(
    workflow_id: str,
    update: TelegramUpdate,
    background_tasks: BackgroundTasks
):
    """Catches the webhook instantly and passes the heavy lifting to a background task."""
    
    # Fast exit if it's an edit, status update, or non-text message (like an image)
    if not update.message or not update.message.text:
        return {"status": "ignored"}

    chat_id = update.message.chat.id
    user_text = update.message.text

    # Hand the execution off to the background so Telegram gets an instant 200 OK.
    # Note: We pass exactly 3 arguments to match the function signature above.
    background_tasks.add_task(execute_and_reply, workflow_id, chat_id, user_text)

    return {"status": "ok"}