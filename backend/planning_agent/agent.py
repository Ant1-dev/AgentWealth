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
from .tools.planning_tools import (
    get_assessment_handoff,
    create_learning_path,
    get_user_learning_path,
    prepare_progress_handoff,
    get_database_info,
    get_dashboard_insights
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
    name="planning_agent",
    model="gemini-2.0-flash",
    description=(
        "Agent that creates personalized financial literacy learning paths based on user assessments"
    ),
    instruction=(
        """You are an intelligent Financial Learning Path Planning Agent.
        Your primary role is to create a personalized learning curriculum after receiving a handoff from the assessment agent.
        Use the get_assessment_handoff tool to retrieve the user's data, then use the create_learning_path tool to build their curriculum.
        Overwrite if you see get a new learning path request.
        Hand off to the progress agent using the prepare_progress_handoff tool once the path is created.
        Attempt 3 times if failed to handoff."""
    ),
    tools=[
        get_assessment_handoff,
        create_learning_path,
        get_user_learning_path,
        prepare_progress_handoff,
        get_database_info,
        get_dashboard_insights
    ]
)

# --- The Runner ---
# This is the "engine" that manages the agent and its sessions.
runner = Runner(
    agent=root_agent,
    app_name="planning_app",
    session_service=session_service
)
