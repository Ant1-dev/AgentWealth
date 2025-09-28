import sys
import os

# Add the parent 'backend' directory to the Python path
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..'))
sys.path.append(_BACKEND_DIR)

from google.adk.agents import Agent
from google.adk.sessions import DatabaseSessionService
from google.adk.runners import Runner
import google.generativeai as genai

# Import tools and configuration
from .tools.progress_tools import (
    get_planning_handoff,
    start_learning_module,
    save_progress,
    get_user_progress,
    complete_module,
    get_database_info,
    get_content_from_delivery_agent,
    get_content_response,
    get_learning_modules
)
from config import GOOGLE_API_KEY, USER_SESSIONS_DB_PATH

# --- Setup: Authorization and Session Management ---
# Configure the API key for the Gemini model
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# This service tells the agent how to store and retrieve session history.
session_service = DatabaseSessionService(
    db_url=f"sqlite:///{USER_SESSIONS_DB_PATH}",
)

# --- Agent Definition ---
# This defines the agent's identity, instructions, and tools.
root_agent = Agent(
    name="progress_agent",
    model="gemini-2.0-flash",
    description=(
        "Agent that tracks user progress through financial literacy learning modules and adapts content based on performance"
    ),
    instruction=(
        """You are an intelligent Financial Learning Progress Tracking Agent.
        Your primary role is to guide a user through their learning path after receiving a handoff from the planning agent.
        Use the get_planning_handoff tool to retrieve the user's curriculum, then use tools like start_learning_module and save_progress to track their journey.
                You do not hold conversations, only provide content as requested.

        
        """
    ),
    tools=[
        get_planning_handoff,
        start_learning_module,
        save_progress,
        get_user_progress,
        complete_module,
        get_database_info,
        get_content_from_delivery_agent,
        get_content_response,
        get_learning_modules,
    ]
)

# --- The Runner ---
# This is the "engine" that manages the agent and its sessions.
runner = Runner(
    agent=root_agent,
    app_name="progress_app",
    session_service=session_service
)
