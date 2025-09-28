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
from .tools.content_tools import (
    get_module_content,
    get_lesson_step,
    get_quiz_questions,
    get_database_info,
    process_content_requests,
    send_content_response
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
    name="content_delivery_agent",
    model="gemini-2.0-flash",
    description=(
        "Agent that delivers personalized financial literacy learning content and materials"
    ),
    instruction=(
        """You are an intelligent Financial Learning Content Delivery Agent with extensive educational resources.
        Your job is to provide specific learning materials when requested. Use your tools to fetch module content,
        lesson steps, or quiz questions based on the user's learning path."""
    ),
    tools=[
        get_module_content,
        get_lesson_step,
        get_quiz_questions,
        get_database_info,
        process_content_requests,
        send_content_response
    ]
)

# --- The Runner ---
# This is the "engine" that manages the agent and its sessions.
runner = Runner(
    agent=root_agent,
    app_name="content_delivery_app",
    session_service=session_service
)
