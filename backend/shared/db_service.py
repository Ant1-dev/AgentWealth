# db_service.py
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_DB_PATH = os.path.join(_SCRIPT_DIR, '..', 'financial_literacy.db')


class DatabaseService:
    """Shared database service for all financial literacy agents"""

    def __init__(self, db_path: str = _DB_PATH): 
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize all required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ADK Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS adk_sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT,
                data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Financial assessments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                topic TEXT,
                user_response TEXT,
                knowledge_level TEXT,
                risk_tolerance TEXT,
                learning_style TEXT,
                confidence_score REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Learning paths table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                path_data TEXT,
                created_by_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Learning progress table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                module_id TEXT,
                step_number INTEGER,
                score INTEGER,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Agent communications table (for A2A handoffs)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agent_communications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                from_agent TEXT,
                to_agent TEXT,
                message_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized: {self.db_path}")
    
    # User management
    def create_user(self, user_id: str) -> bool:
        """Create a new user if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('INSERT OR IGNORE INTO users (id) VALUES (?)', (user_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    # Assessment methods
    def save_assessment(self, user_id: str, topic: str, user_response: str, 
                       knowledge_level: str, risk_tolerance: str = None, 
                       learning_style: str = None, confidence_score: float = 0.8) -> bool:
        """Save a financial assessment"""
        try:
            self.create_user(user_id)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO assessments 
                (user_id, topic, user_response, knowledge_level, risk_tolerance, learning_style, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, topic, user_response, knowledge_level, risk_tolerance, learning_style, confidence_score))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving assessment: {e}")
            return False
    
    def get_user_assessments(self, user_id: str) -> List[Tuple]:
        """Get all assessments for a user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT topic, knowledge_level, risk_tolerance, learning_style, confidence_score, created_at
                FROM assessments
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,))
            results = cursor.fetchall()
            conn.close()
            return results
        except Exception as e:
            print(f"Error getting assessments: {e}")
            return []
    
    def get_topic_assessment(self, user_id: str, topic: str) -> Optional[Tuple]:
        """Get specific topic assessment for user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT knowledge_level, risk_tolerance, learning_style, confidence_score, created_at
                FROM assessments
                WHERE user_id = ? AND topic = ?
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id, topic))
            result = cursor.fetchone()
            conn.close()
            return result
        except Exception as e:
            print(f"Error getting topic assessment: {e}")
            return None
    
    # Learning path methods
    def save_learning_path(self, user_id: str, path_data: Dict[str, Any], created_by_agent: str) -> bool:
        """Save a learning path created by an agent"""
        try:
            self.create_user(user_id)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO learning_paths (user_id, path_data, created_by_agent)
                VALUES (?, ?, ?)
            ''', (user_id, json.dumps(path_data), created_by_agent))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving learning path: {e}")
            return False
    
    def get_user_learning_path(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest learning path for a user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT path_data, created_by_agent, created_at
                FROM learning_paths
                WHERE user_id = ?
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    "path_data": json.loads(result[0]),
                    "created_by_agent": result[1],
                    "created_at": result[2]
                }
            return None
        except Exception as e:
            print(f"Error getting learning path: {e}")
            return None
    
    # Progress tracking methods
    def save_progress(self, user_id: str, module_id: str, step_number: int, score: int = 0) -> bool:
        """Save learning progress"""
        try:
            self.create_user(user_id)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO learning_progress 
                (user_id, module_id, step_number, score)
                VALUES (?, ?, ?, ?)
            ''', (user_id, module_id, step_number, score))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving progress: {e}")
            return False
    
    def get_user_progress(self, user_id: str) -> List[Tuple]:
        """Get user's learning progress"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT module_id, step_number, score, completed_at
                FROM learning_progress
                WHERE user_id = ?
                ORDER BY completed_at DESC
            ''', (user_id,))
            results = cursor.fetchall()
            conn.close()
            return results
        except Exception as e:
            print(f"Error getting progress: {e}")
            return []
    
    # Agent communication methods (for A2A handoffs)
    def save_agent_communication(self, user_id: str, from_agent: str, to_agent: str, message_data: Dict[str, Any]) -> bool:
        """Save agent-to-agent communication"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO agent_communications (user_id, from_agent, to_agent, message_data)
                VALUES (?, ?, ?, ?)
            ''', (user_id, from_agent, to_agent, json.dumps(message_data)))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving agent communication: {e}")
            return False
    
    def get_latest_handoff(self, user_id: str, to_agent: str) -> Optional[Dict[str, Any]]:
        """Get the latest handoff message to a specific agent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT from_agent, message_data, created_at
                FROM agent_communications
                WHERE user_id = ? AND to_agent = ?
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id, to_agent))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    "from_agent": result[0],
                    "message_data": json.loads(result[1]),
                    "created_at": result[2]
                }
            return None
        except Exception as e:
            print(f"Error getting handoff: {e}")
            return None
    
    # Statistics and debugging
    def get_database_stats(self) -> Dict[str, int]:
        """Get database statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Count assessments
            cursor.execute('SELECT COUNT(*) FROM assessments')
            assessment_count = cursor.fetchone()[0]
            
            # Count unique users
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            
            # Count learning paths
            cursor.execute('SELECT COUNT(*) FROM learning_paths')
            path_count = cursor.fetchone()[0]
            
            # Count progress entries
            cursor.execute('SELECT COUNT(*) FROM learning_progress')
            progress_count = cursor.fetchone()[0]
            
            # Count agent communications
            cursor.execute('SELECT COUNT(*) FROM agent_communications')
            comm_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_users': user_count,
                'total_assessments': assessment_count,
                'total_learning_paths': path_count,
                'total_progress_entries': progress_count,
                'total_agent_communications': comm_count
            }
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}

# Global database instance
db = DatabaseService()