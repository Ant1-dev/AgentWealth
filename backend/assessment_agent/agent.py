import sys
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..'))
sys.path.append(_BACKEND_DIR)

from google.adk.agents import Agent
from google.adk.sessions import DatabaseSessionService
from .tools.assessment_tools import (
    save_user_assessment,
    get_user_history,
    get_topic_assessment,
    get_recommended_topics,
    get_database_info,
    complete_assessment_and_handoff
)
from config import USER_SESSIONS_DB_PATH
# CHANGE 1: Import the base 'Runner' instead of 'InMemoryRunner'
from google.adk.runners import Runner

# This service tells the agent how to store and retrieve session history.
session_service = DatabaseSessionService(
    db_url=f"sqlite:///{USER_SESSIONS_DB_PATH}",
)

# This is the definition of your agent's identity, instructions, and tools.
root_agent = Agent(
    name="assessment_agent",
    model="gemini-2.0-flash",
    description=(
        "Agent to assess a person's financial literacy and investment knowledge"
    ),
    instruction=(
        """You are an intelligent Financial Literacy Assessment Agent with persistent memory.
        Your primary role is to assess a user's financial knowledge and determine their learning preferences.
        Always use the provided tools to save assessments and check user history.
        Start by greeting the user and checking if they are new or returning using the get_user_history tool."""
    ),
    tools=[
        save_user_assessment, 
        get_user_history, 
        get_topic_assessment, 
        get_recommended_topics, 
        get_database_info,
        complete_assessment_and_handoff
    ],
)

# CHANGE 2: Use the base 'Runner' class here. It is designed to accept a session_service.
runner = Runner(
    agent=root_agent,
    app_name="assessment_app",
    session_service=session_service
)

