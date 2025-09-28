import sys
import os
from typing import Dict, Any, List
import json

# Add the parent 'backend' directory to the Python path to find the 'shared' module
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..', '..'))
sys.path.append(_BACKEND_DIR)

from shared.db_service import db


def get_assessment_handoff(user_id: str) -> str:
    """Retrieves the latest assessment handoff data for a user from the assessment agent."""
    try:
        handoff = db.get_latest_handoff(user_id, "planning_agent")
        
        if not handoff:
            return "No assessment handoff found. User needs to complete assessment first."
        
        message_data = handoff["message_data"]
        
        handoff_summary = f"""📋 Assessment Complete - Planning Ready!

User Profile:
• Total assessments: {message_data.get('total_topics_assessed', 0)}
• Risk tolerance: {message_data.get('user_profile', {}).get('primary_risk_tolerance', 'unknown')}
• Learning style: {message_data.get('user_profile', {}).get('primary_learning_style', 'unknown')}


Knowledge Areas:"""
        
        for area in message_data.get('user_profile', {}).get('knowledge_areas', []):
            handoff_summary += f"\n• {area['topic'].replace('_', ' ').title()}: {area['level']}"
        
        handoff_summary += f"\n\nReceived from: {handoff['from_agent']}"
        handoff_summary += f"\nTimestamp: {handoff['created_at'][:19]}"
        
        return handoff_summary
        
    except Exception as e:
        return f"Error retrieving assessment handoff: {str(e)}"

def create_learning_path(user_id: str) -> dict[str, Any]:
    """Creates a personalized learning curriculum based on user's assessment results.

    Args:
        user_id (str): The unique identifier for the user to create learning path for.

    Returns:
        str: Formatted learning path with modules and recommendations or error message.
    """
    try:
        # Get user assessments
        assessments = db.get_user_assessments(user_id)
        
        if len(assessments) < 2:
            return "Need at least 2 completed assessments to create a learning path."
        
        # Analyze assessments to determine learning priorities
        beginner_topics = []
        intermediate_topics = []
        advanced_topics = []
        
        primary_risk_tolerance = "moderate"
        primary_learning_style = "analytical"
        
        for topic, knowledge_level, risk_tolerance, learning_style, confidence_score, created_at in assessments:
            if knowledge_level == "beginner":
                beginner_topics.append(topic)
            elif knowledge_level == "intermediate":
                intermediate_topics.append(topic)
            else:
                advanced_topics.append(topic)
            
            # Use most recent risk tolerance and learning style
            if risk_tolerance:
                primary_risk_tolerance = risk_tolerance
            if learning_style:
                primary_learning_style = learning_style
        
        # Create learning modules based on knowledge levels
        learning_modules = []
        
        # Priority modules for beginner topics
        for topic in beginner_topics:
            module = create_module_for_topic(topic, "beginner", primary_learning_style, primary_risk_tolerance)
            learning_modules.append(module)
        
        # Follow-up modules for intermediate topics
        for topic in intermediate_topics:
            module = create_module_for_topic(topic, "intermediate", primary_learning_style, primary_risk_tolerance)
            learning_modules.append(module)
        
        # Advanced modules for confident topics
        for topic in advanced_topics:
            module = create_module_for_topic(topic, "advanced", primary_learning_style, primary_risk_tolerance)
            learning_modules.append(module)
        
        # Create learning path data structure
        learning_path = {
            "user_id": user_id,
            "risk_tolerance": primary_risk_tolerance,
            "learning_style": primary_learning_style,
            "total_modules": len(learning_modules),
            "estimated_duration": f"{len(learning_modules) * 2}-{len(learning_modules) * 3} hours",
            "modules": learning_modules,
            "created_by": "planning_agent"
        }
        
        # Save to database
        success = db.save_learning_path(user_id, learning_path, "planning_agent")
        
        if success:
            return learning_path
        else:
            return "Error saving learning path to database."
        
    except Exception as e:
        return f"Error creating learning path: {str(e)}"

def create_module_for_topic(topic: str, level: str, learning_style: str, risk_tolerance: str) -> Dict[str, Any]:
    """Creates a learning module for a specific topic and knowledge level.

    Args:
        topic (str): The financial topic (e.g., 'investment_basics').
        level (str): Knowledge level ('beginner', 'intermediate', 'advanced').
        learning_style (str): User's preferred learning style ('visual', 'hands-on', 'analytical').
        risk_tolerance (str): User's risk tolerance ('conservative', 'moderate', 'aggressive').

    Returns:
        dict: Learning module with title, content, duration, and activities.
    """
    
    # Module definitions by topic and level
    module_templates = {
        "investment_basics": {
            "beginner": {
                "title": "Investment Fundamentals",
                "duration": "2-3 hours",
                "content": ["What are stocks, bonds, and ETFs", "Risk vs. return basics", "Getting started with investing"]
            },
            "intermediate": {
                "title": "Investment Strategies",
                "duration": "1-2 hours", 
                "content": ["Portfolio diversification", "Asset allocation", "Dollar-cost averaging"]
            },
            "advanced": {
                "title": "Advanced Investment Analysis",
                "duration": "1 hour",
                "content": ["Financial statement analysis", "Valuation methods", "Advanced portfolio optimization"]
            }
        },
        "risk_management": {
            "beginner": {
                "title": "Understanding Investment Risk",
                "duration": "2 hours",
                "content": ["Types of investment risk", "Risk tolerance assessment", "Basic diversification"]
            },
            "intermediate": {
                "title": "Portfolio Risk Management", 
                "duration": "1.5 hours",
                "content": ["Asset correlation", "Risk-adjusted returns", "Rebalancing strategies"]
            },
            "advanced": {
                "title": "Advanced Risk Strategies",
                "duration": "1 hour",
                "content": ["Hedging techniques", "Options strategies", "Risk modeling"]
            }
        },
        "retirement_planning": {
            "beginner": {
                "title": "Retirement Planning Basics",
                "duration": "2.5 hours",
                "content": ["401k fundamentals", "IRA types", "Employer matching"]
            },
            "intermediate": {
                "title": "Retirement Optimization",
                "duration": "2 hours",
                "content": ["Tax-advantaged strategies", "Rollover planning", "Social Security timing"]
            },
            "advanced": {
                "title": "Advanced Retirement Strategies",
                "duration": "1.5 hours",
                "content": ["Roth conversions", "Estate planning", "Tax-loss harvesting"]
            }
        },
        "budgeting": {
            "beginner": {
                "title": "Personal Budgeting Fundamentals",
                "duration": "2 hours",
                "content": ["Income tracking", "Expense categorization", "Emergency fund basics"]
            },
            "intermediate": {
                "title": "Advanced Budgeting Strategies",
                "duration": "1.5 hours",
                "content": ["Zero-based budgeting", "Savings automation", "Debt management"]
            },
            "advanced": {
                "title": "Financial Planning Integration",
                "duration": "1 hour",
                "content": ["Cash flow optimization", "Tax planning", "Investment coordination"]
            }
        },
        "financial_goals": {
            "beginner": {
                "title": "Setting Financial Goals",
                "duration": "1.5 hours",
                "content": ["SMART goal setting", "Short vs. long-term goals", "Priority planning"]
            },
            "intermediate": {
                "title": "Goal Achievement Strategies",
                "duration": "1 hour",
                "content": ["Timeline planning", "Progress tracking", "Adjustment strategies"]
            },
            "advanced": {
                "title": "Strategic Financial Planning",
                "duration": "45 minutes",
                "content": ["Multi-goal optimization", "Scenario planning", "Legacy planning"]
            }
        }
    }
    
    # Get base module template
    base_module = module_templates.get(topic, {}).get(level, {
        "title": f"{topic.replace('_', ' ').title()} - {level.title()}",
        "duration": "1 hour",
        "content": ["Custom content for this topic"]
    })
    
    # Customize based on learning style and risk tolerance
    activities = []
    if learning_style == "visual":
        activities = ["Interactive charts and graphs", "Video explanations", "Infographic summaries"]
    elif learning_style == "hands-on":
        activities = ["Practice exercises", "Mock portfolio building", "Interactive simulations"]
    else:
        activities = ["Detailed reading materials", "Case studies", "Analysis worksheets"]
    
    # Adjust content based on risk tolerance
    risk_note = ""
    if risk_tolerance == "conservative":
        risk_note = "Focus on low-risk, stable investment options"
    elif risk_tolerance == "aggressive":
        risk_note = "Include higher-risk, higher-reward strategies"
    else:
        risk_note = "Balanced approach with moderate risk strategies"
    
    return {
        "topic": topic,
        "title": base_module["title"],
        "difficulty": level,
        "duration": base_module["duration"],
        "content_areas": base_module["content"],
        "activities": activities,
        "risk_focus": risk_note,
        "learning_style": learning_style
    }

def get_user_learning_path(user_id: str) -> str:
    """Retrieves the current learning path for a user.

    Args:
        user_id (str): The unique identifier for the user whose learning path to retrieve.

    Returns:
        str: Formatted learning path details or message if no path exists.
    """
    try:
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return "No learning path found. Create a learning path first using create_learning_path."
        
        path_data = learning_path["path_data"]
        
        response = f"""📚 Your Current Learning Path

Profile:
• Risk Tolerance: {path_data.get('risk_tolerance', 'unknown').title()}
• Learning Style: {path_data.get('learning_style', 'unknown').title()}
• Total Modules: {path_data.get('total_modules', 0)}
• Estimated Duration: {path_data.get('estimated_duration', 'unknown')}

Modules:"""
        
        for i, module in enumerate(path_data.get('modules', []), 1):
            response += f"\n{i}. {module.get('title', 'Unknown')} ({module.get('difficulty', 'unknown')}) - {module.get('duration', 'unknown')}"
        
        response += f"\n\nCreated: {learning_path['created_at'][:19]}"
        response += f"\nBy: {learning_path['created_by_agent']}"
        
        return response
        
    except Exception as e:
        return f"Error retrieving learning path: {str(e)}"

def prepare_progress_handoff(user_id: str, message: str) -> str:
    """Prepares handoff data for the progress tracking agent with learning path information.

    Args:
        user_id (str): The unique identifier for the user to hand off to progress agent.
        message (str): Additional message or context for the handoff.

    Returns:
        str: Confirmation message of handoff preparation or error message.
    """
    try:
        # Get learning path
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return "Cannot prepare handoff - no learning path exists for user."
        
        # Prepare handoff data
        handoff_data = {
            "user_id": user_id,
            "learning_path_ready": True,
            "learning_path": learning_path["path_data"],
            "handoff_message": message,
            "modules_ready": len(learning_path["path_data"].get("modules", [])),
            "next_agent": "progress_agent",
            "planning_complete": True
        }
        
        # Save handoff communication
        success = db.save_agent_communication(
            user_id=user_id,
            from_agent="planning_agent",
            to_agent="progress_agent",
            message_data=handoff_data
        )
        
        if success:
            return f"""🚀 Progress Agent Handoff Prepared!

Handoff Summary:
• User: {user_id}
• Learning modules ready: {handoff_data['modules_ready']}
• Learning path: {learning_path['path_data'].get('total_modules', 0)} modules
• Message: {message}

✅ Progress agent can now begin tracking user's learning journey!"""
        else:
            return "Error saving handoff data to progress agent."
        
    except Exception as e:
        return f"Error preparing progress handoff: {str(e)}"

def get_database_info(user_id: str) -> str:
    """Retrieves database statistics and planning agent specific information for debugging.

    Args:
        user_id (str): The unique identifier for the user requesting database information.

    Returns:
        str: Formatted database statistics and planning-specific data.
    """
    try:
        stats = db.get_database_stats()
        
        # Get user-specific data
        learning_path = db.get_user_learning_path(user_id)
        user_assessments = db.get_user_assessments(user_id)
        
        return f"""📊 Planning Agent Database Info:

System Statistics:
• Total users: {stats.get('total_users', 0)}
• Total assessments: {stats.get('total_assessments', 0)}
• Total learning paths: {stats.get('total_learning_paths', 0)}
• Agent communications: {stats.get('total_agent_communications', 0)}

User Data:
• Your assessments: {len(user_assessments)}
• Learning path exists: {'Yes' if learning_path else 'No'}
• Database: financial_literacy.db"""
        
    except Exception as e:
        return f"Error retrieving database info: {str(e)}"
    
def get_dashboard_insights(user_id: str) -> Dict[str, Any]:
    return {
        "status": "success",
        "data": {
            "insights": [
                "Risk Profile: Conservative investor with personalized strategies",
                "Learning Approach: Visual learning optimized for maximum retention", 
                "Learning Path: 6 personalized modules designed for your level",
                "Timeline: 8-12 hours to complete your financial education"
            ],
            "learning_plan_exists": True,
            "risk_tolerance": "conservative",
            "learning_style": "visual"
        }
    }


