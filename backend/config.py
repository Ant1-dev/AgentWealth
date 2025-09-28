import os
from dotenv import load_dotenv

# Load environment variables from a .env file at the project root
load_dotenv()

# Get the absolute path to the backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Define absolute paths for the database files
FINANCIAL_LITERACY_DB_PATH = os.path.join(BACKEND_DIR, 'financial_literacy.db')
USER_SESSIONS_DB_PATH = os.path.join(BACKEND_DIR, 'user_sessions.db')

# Get the Google API Key from the environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
