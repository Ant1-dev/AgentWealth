from typing import Dict, Any
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.db_service import db
def evaluate_financial_knowledge(user_response: str, topic: str) -> Dict[str, Any]:
    """
    Args: 
        Users response and the topic they are on

    Analyze user response and determine financial knowledge level
    Returns structured data about the assessment
    """
    response_lower = user_response.lower()

    beginner_keywords = ["never", "don't know", "what is", "confused", "no idea", "help", "scared", "afraid", "new to", "beginner"]
    intermediate_keywords = ["sometimes", "a little", "basic", "okay", "decent", "some", "heard of", "somewhat"]
    advanced_keywords = ["comfortable", "know how", "familiar", "experienced", "expert", "confident", "understand", "regularly"]

    # Determine knowledge level
    if any(word in response_lower for word in beginner_keywords):
        knowledge_level = "beginner"
        confidence = 0.9
    elif any(word in response_lower for word in advanced_keywords):
        knowledge_level = "advanced"
        confidence = 0.8
    elif any(word in response_lower for word in intermediate_keywords):
        knowledge_level = "intermediate"
        confidence = 0.7
    else:
        knowledge_level = "intermediate"
        confidence = 0.5

    # Determine risk tolerance
    risk_tolerance = "moderate"
    if any(phrase in response_lower for phrase in ["scared", "afraid", "safe", "conservative", "worried", "nervous", "careful"]):
        risk_tolerance = "conservative"
    elif any(phrase in response_lower for phrase in ["aggressive", "high risk", "willing to lose", "big returns", "risky"]):
        risk_tolerance = "aggressive"
    
    # Determine learning style
    learning_style = "analytical"
    if any(phrase in response_lower for phrase in ["show me", "visual", "charts", "graphs", "see", "pictures"]):
        learning_style = "visual"
    elif any(phrase in response_lower for phrase in ["hands-on", "practice", "try it", "do it myself", "interactive"]):
        learning_style = "hands-on"

    return {
        "topic": topic,
        "knowledge_level": knowledge_level,
        "risk_tolerance": risk_tolerance,
        "learning_style": learning_style,
        "confidence": confidence,
        "needs_training": knowledge_level in ["beginner", "intermediate"],
        "response_text": user_response
    }

def save_user_assessment(user_id: str, topic: str, user_response: str) -> str:
    """
    Args:
        user id, topic they are on, users response

    Save user assessment to database
    This is what the agent will call
    """
    # Get evaluation
    evaluation = evaluate_financial_knowledge(user_response, topic)
    
    # Save to database
    success = db.save_assessment(
        user_id=user_id,
        topic=evaluation["topic"],
        user_response=user_response,
        knowledge_level=evaluation["knowledge_level"],
        risk_tolerance=evaluation["risk_tolerance"],
        learning_style=evaluation["learning_style"],
        confidence_score=evaluation["confidence"]
    )
    
    if success:
        topic_display = topic.replace('_', ' ').title()
        return f"""Assessment saved successfully! 
        
📊 Your {topic_display} knowledge level: {evaluation['knowledge_level'].upper()}
💰 Risk tolerance: {evaluation['risk_tolerance'].title()}
📚 Learning style: {evaluation['learning_style'].title()}
🎯 Confidence: {evaluation['confidence']:.0%}
{'🎓 Recommendation: Training recommended' if evaluation['needs_training'] else '✅ You seem comfortable with this!'}"""
    else:
        return "Sorry, there was an error saving your assessment. Please try again."
    
def get_user_history(user_id: str) -> str:
    """
    Get user's assessment history
    """
    assessments = db.get_user_assessments(user_id)
    
    if not assessments:
        return """📋 No previous financial assessments found. Welcome! This is your first financial literacy evaluation.

I'm here to help assess your current financial knowledge and create a personalized learning path just for you.

We'll cover topics like:
• 💰 Investment Basics (stocks, bonds, ETFs)
• 🎯 Risk Management & Portfolio Building  
• 🏦 Retirement Planning (401k, IRA)
• 📊 Budgeting & Financial Goals

Ready to get started?"""
    
    history = f"📚 Your Financial Assessment History ({len(assessments)} assessments):\n\n"
    
    for topic, knowledge_level, risk_tolerance, learning_style, confidence_score, created_at in assessments:
        date_str = created_at[:10]  # Extract just the date part
        confidence_pct = int(confidence_score * 100)
        topic_display = topic.replace('_', ' ').title()
        history += f"• {topic_display}: {knowledge_level} knowledge, {risk_tolerance} risk tolerance ({confidence_pct}% confidence) - {date_str}\n"
    
    history += "\n🎯 Ready to continue your financial learning journey!"
    return history

def get_recommended_topics(user_id: str) -> str:
    """
    Get recommended topics based on user's current assessments
    """
    assessments = db.get_user_assessments(user_id)
    
    # Define all possible financial topics
    all_topics = ["investment_basics", "risk_management", "retirement_planning", "budgeting", "financial_goals"]
    
    # Find assessed topics
    assessed_topics = [topic for topic, _, _, _, _, _ in assessments]
    
    # Find beginner-level topics (need improvement)
    beginner_topics = [topic.replace('_', ' ').title() for topic, knowledge_level, _, _, _, _ in assessments if knowledge_level == "beginner"]
    
    # Find unassessed topics
    unassessed_topics = [topic.replace('_', ' ').title() for topic in all_topics if topic not in assessed_topics]
    
    recommendations = []
    
    if beginner_topics:
        recommendations.append(f"🎯 Focus on improving: {', '.join(beginner_topics)}")
    
    if unassessed_topics:
        recommendations.append(f"📝 Not yet assessed: {', '.join(unassessed_topics)}")
    
    if not recommendations:
        return "🌟 Great! You've assessed all main financial topics and show good knowledge!"
    
    return "📚 Recommendations:\n" + "\n".join(recommendations)

def get_database_info(user_id: str) -> str:
    """
    Get database statistics (for debugging/demo purposes)
    """
    stats = db.get_database_stats()
    
    user_assessments = db.get_user_assessments(user_id)
    user_count = len(user_assessments)
    
    return f"""📊 Database Info:
🔹 Your assessments: {user_count}
🔹 Total assessments: {stats['total_assessments']}
🔹 Total users: {stats['total_users']}
🔹 Total learning paths: {stats['total_learning_paths']}
🔹 Total progress entries: {stats['total_progress_entries']}"""

def get_topic_assessment(user_id: str, topic: str) -> str:
    """
    Get user's assessment for a specific topic
    """
    assessment = db.get_topic_assessment(user_id, topic)
    
    if not assessment:
        topic_display = topic.replace('_', ' ').title()
        return f"📝 No assessment found for {topic_display}. Ready to assess this topic?"
    
    knowledge_level, risk_tolerance, learning_style, confidence_score, created_at = assessment
    date_str = created_at[:10]
    confidence_pct = int(confidence_score * 100)
    topic_display = topic.replace('_', ' ').title()
    
    return f"📋 Your {topic_display} assessment: {knowledge_level} level, {risk_tolerance} risk tolerance ({confidence_pct}% confidence) from {date_str}"

def complete_assessment_and_handoff(user_id: str, summary: str) -> str:
    """
    Complete assessment and prepare handoff to planning agent
    """
    assessments = db.get_user_assessments(user_id)
    
    if len(assessments) < 3:
        return f"🔄 Need at least 3 topic assessments before creating your complete learning plan. You currently have {len(assessments)} assessments. Let's assess a few more areas!"
    
    # Prepare handoff data
    handoff_data = {
        "user_id": user_id,
        "assessment_complete": True,
        "total_topics_assessed": len(assessments),
        "assessment_summary": summary,
        "user_profile": {
            "primary_risk_tolerance": assessments[0][2] if assessments else "moderate",
            "primary_learning_style": assessments[0][3] if assessments else "analytical",
            "knowledge_areas": [
                {"topic": a[0], "level": a[1]} for a in assessments
            ]
        },
        "next_agent": "planning_agent"
    }
    
    # Save handoff communication
    success = db.save_agent_communication(
        user_id=user_id,
        from_agent="assessment_agent",
        to_agent="planning_agent", 
        message_data=handoff_data
    )
    
    if success:
        handoff_summary = f"""🎯 FINANCIAL ASSESSMENT COMPLETE! 

📊 Summary for {user_id}:
• Total topics assessed: {len(assessments)}
• Primary risk tolerance: {assessments[0][2] if assessments else 'moderate'}
• Learning style: {assessments[0][3] if assessments else 'analytical'}

📚 Knowledge Areas:
"""
        
        for topic, knowledge_level, _, _, _, _ in assessments:
            topic_display = topic.replace('_', ' ').title()
            handoff_summary += f"• {topic_display}: {knowledge_level}\n"
        
        handoff_summary += f"""
🚀 Ready to transfer to Planning Agent for personalized curriculum creation!

{summary}"""
        
        return handoff_summary
    else:
        return "❌ Error preparing handoff to planning agent. Please try again."