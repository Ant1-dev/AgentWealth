from typing import Dict, Any, List
from shared.db_service import db

def get_content_from_delivery_agent(user_id: str, module_number: int, content_type: str, step_number: int) -> str:
    """Requests content from content delivery agent via A2A communication."""
    try:
        # Map content types
        if content_type in ["reading", "full_module", "content"]:
            request_type = "get_module_content"
        elif content_type == "lesson_step":
            request_type = "get_lesson_step"
        elif content_type == "quiz":
            request_type = "get_quiz_questions"
        else:
            return f"Invalid content_type: {content_type}"
        
        # Prepare A2A request
        request_data = {
            "request_type": request_type,
            "user_id": user_id,
            "module_number": module_number,
            "step_number": step_number,
            "requesting_agent": "progress_agent"
        }
        
        # Save A2A communication request
        success = db.save_agent_communication(
            user_id=user_id,
            from_agent="progress_agent",
            to_agent="content_delivery_agent",
            message_data=request_data
        )
        
        if success:
            return f"Content request sent to delivery agent. Use get_content_response to retrieve the content."
        else:
            return "Error sending content request."
            
    except Exception as e:
        return f"Error: {str(e)}"
    
def get_content_response(user_id: str) -> str:
    """Retrieves content response from content delivery agent."""
    try:
        response = db.get_latest_handoff(user_id, "progress_agent")
        if response and response.get("from_agent") == "content_delivery_agent":
            return response["message_data"].get("content", "No content received")
        else:
            return "No content response available yet."
    except Exception as e:
        return f"Error retrieving content: {str(e)}"

def get_planning_handoff(user_id: str) -> str:
    """Retrieves the latest learning path handoff data from the planning agent.

    Args:
        user_id (str): The unique identifier for the user whose learning path to retrieve.

    Returns:
        str: Formatted learning path summary or error message if no handoff found.
    """
    try:
        handoff = db.get_latest_handoff(user_id, "progress_agent")
        
        if not handoff:
            return "No learning path handoff found. User needs to complete planning phase first."
        
        message_data = handoff["message_data"]
        learning_path = message_data.get("learning_path", {})
        
        handoff_summary = f"""📚 Learning Path Received - Progress Tracking Ready!

Learning Plan Summary:
• Total modules: {learning_path.get('total_modules', 0)}
• Estimated duration: {learning_path.get('estimated_duration', 'unknown')}
• Risk tolerance: {learning_path.get('risk_tolerance', 'unknown')}
• Learning style: {learning_path.get('learning_style', 'unknown')}

Available Modules:"""
        
        for i, module in enumerate(learning_path.get('modules', []), 1):
            handoff_summary += f"\n{i}. {module.get('title', 'Unknown')} ({module.get('difficulty', 'unknown')}) - {module.get('duration', 'unknown')}"
        
        handoff_summary += f"\n\nReceived from: {handoff['from_agent']}"
        handoff_summary += f"\nTimestamp: {handoff['created_at'][:19]}"
        
        return handoff_summary
        
    except Exception as e:
        return f"Error retrieving planning handoff: {str(e)}"

def start_learning_module(user_id: str, module_number: int) -> str:
    """Starts a specific learning module for the user and provides initial content.

    Args:
        user_id (str): The unique identifier for the user starting the module.
        module_number (int): The module number to start (1-based indexing).

    Returns:
        str: Module introduction and content overview or error message.
    """
    try:
        # Get user's learning path
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return "No learning path found. Complete assessment and planning phases first."
        
        modules = learning_path["path_data"].get("modules", [])
        
        if module_number < 1 or module_number > len(modules):
            return f"Invalid module number. Available modules: 1-{len(modules)}"
        
        module = modules[module_number - 1]
        
        # Save progress - starting module
        success = db.save_progress(user_id, f"module_{module_number}", 0, 0)
        
        if success:
            # Format module introduction
            response = f"""🎓 Starting Module {module_number}: {module.get('title', 'Unknown')}

Module Details:
• Topic: {module.get('topic', 'unknown').replace('_', ' ').title()}
• Difficulty: {module.get('difficulty', 'unknown').title()}
• Duration: {module.get('duration', 'unknown')}
• Learning Style: {module.get('learning_style', 'unknown').title()}

Content Areas:"""
            
            for area in module.get('content_areas', []):
                response += f"\n• {area}"
            
            response += f"\n\nLearning Activities:"
            for activity in module.get('activities', []):
                response += f"\n• {activity}"
            
            response += f"\n\nRisk Focus: {module.get('risk_focus', 'Balanced approach')}"
            response += f"\n\n✅ Module started! Progress saved."
            
            return response
        else:
            return "Error saving module start progress."
        
    except Exception as e:
        return f"Error starting learning module: {str(e)}"

def save_progress(user_id: str, module_number: int, step_number: int, score: int) -> str:
    """Saves user's progress within a learning module with performance score.

    Args:
        user_id (str): The unique identifier for the user.
        module_number (int): The module number being completed.
        step_number (int): The step within the module (0-100 for percentage).
        score (int): Performance score for the step (0-100).

    Returns:
        str: Progress confirmation message or error message.
    """
    try:
        # Validate inputs
        if step_number < 0 or step_number > 100:
            return "Step number must be between 0-100 (percentage complete)."
        
        if score < 0 or score > 100:
            return "Score must be between 0-100."
        
        # Save progress to database
        success = db.save_progress(user_id, f"module_{module_number}", step_number, score)
        
        if success:
            # Determine performance level
            if score >= 90:
                performance = "Excellent"
                feedback = "Outstanding work! You've mastered this concept."
            elif score >= 80:
                performance = "Good"
                feedback = "Great job! You have a solid understanding."
            elif score >= 70:
                performance = "Satisfactory"
                feedback = "Good progress! Consider reviewing the key concepts."
            elif score >= 60:
                performance = "Needs Improvement"
                feedback = "You're getting there! Additional practice recommended."
            else:
                performance = "Requires Review"
                feedback = "Let's review this material together before moving forward."
            
            response = f"""📊 Progress Saved!

Module {module_number} Progress:
• Step: {step_number}% complete
• Score: {score}/100
• Performance: {performance}
• Feedback: {feedback}

✅ Progress updated successfully!"""
            
            # Check if module is complete
            if step_number >= 100:
                response += f"\n\n🎉 Module {module_number} completed!"
            
            return response
        else:
            return "Error saving progress to database."
        
    except Exception as e:
        return f"Error saving progress: {str(e)}"

def get_user_progress(user_id: str) -> str:
    """Retrieves and displays the user's current learning progress across all modules.

    Args:
        user_id (str): The unique identifier for the user whose progress to retrieve.

    Returns:
        str: Formatted progress summary showing completion status and scores.
    """
    try:
        # Get progress data
        progress_data = db.get_user_progress(user_id)
        
        if not progress_data:
            return "No learning progress found. Start a learning module first."
        
        # Get learning path for context
        learning_path = db.get_user_learning_path(user_id)
        total_modules = 0
        if learning_path:
            total_modules = learning_path["path_data"].get("total_modules", 0)
        
        # Organize progress by module
        module_progress = {}
        for module_id, step_number, score, completed_at in progress_data:
            if module_id not in module_progress:
                module_progress[module_id] = []
            module_progress[module_id].append({
                "step": step_number,
                "score": score,
                "completed_at": completed_at
            })
        
        # Calculate overall statistics
        completed_modules = sum(1 for module_id, steps in module_progress.items() 
                               if any(step["step"] >= 100 for step in steps))
        
        total_scores = []
        for steps in module_progress.values():
            if steps:
                latest_score = max(steps, key=lambda x: x["completed_at"])["score"]
                total_scores.append(latest_score)
        
        average_score = sum(total_scores) / len(total_scores) if total_scores else 0
        
        # Format response
        response = f"""📈 Your Learning Progress

Overall Summary:
• Modules started: {len(module_progress)}
• Modules completed: {completed_modules}
• Total modules available: {total_modules}
• Average score: {average_score:.1f}%

Module Details:"""
        
        for module_id in sorted(module_progress.keys()):
            steps = module_progress[module_id]
            latest = max(steps, key=lambda x: x["completed_at"])
            
            module_num = module_id.replace("module_", "")
            status = "✅ Completed" if latest["step"] >= 100 else f"🔄 {latest['step']}% complete"
            
            response += f"\nModule {module_num}: {status} (Score: {latest['score']}%)"
        
        return response
        
    except Exception as e:
        return f"Error retrieving progress: {str(e)}"

def adapt_difficulty(user_id: str, module_number: int, current_score: int) -> str:
    """Adapts learning difficulty based on user performance in current module.

    Args:
        user_id (str): The unique identifier for the user.
        module_number (int): The module number to adapt.
        current_score (int): User's current performance score (0-100).

    Returns:
        str: Difficulty adaptation recommendations and next steps.
    """
    try:
        # Get user's learning style and risk tolerance
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return "No learning path found for difficulty adaptation."
        
        learning_style = learning_path["path_data"].get("learning_style", "analytical")
        risk_tolerance = learning_path["path_data"].get("risk_tolerance", "moderate")
        
        # Determine adaptation strategy based on score
        if current_score >= 90:
            difficulty_change = "increase"
            recommendation = "Excellent performance! Let's challenge you with advanced concepts."
            next_action = "Add bonus advanced materials and accelerated learning path."
            
        elif current_score >= 80:
            difficulty_change = "maintain"
            recommendation = "Great work! Continue at current difficulty level."
            next_action = "Proceed with standard curriculum progression."
            
        elif current_score >= 60:
            difficulty_change = "slight_decrease"
            recommendation = "Good effort! Let's reinforce concepts with additional practice."
            next_action = "Add supplementary exercises and review materials."
            
        else:
            difficulty_change = "decrease"
            recommendation = "Let's slow down and focus on fundamentals."
            next_action = "Switch to basic explanations and guided practice."
        
        # Customize adaptation based on learning style
        style_adaptations = []
        if learning_style == "visual":
            if difficulty_change == "increase":
                style_adaptations.append("Add complex charts and advanced visualizations")
            elif difficulty_change == "decrease":
                style_adaptations.append("Use simpler diagrams and step-by-step visual guides")
            else:
                style_adaptations.append("Continue with current visual approach")
                
        elif learning_style == "hands-on":
            if difficulty_change == "increase":
                style_adaptations.append("Introduce advanced simulations and real-world scenarios")
            elif difficulty_change == "decrease":
                style_adaptations.append("Provide more guided practice and simplified exercises")
            else:
                style_adaptations.append("Maintain current interactive approach")
                
        else:  # analytical
            if difficulty_change == "increase":
                style_adaptations.append("Add detailed case studies and complex analysis")
            elif difficulty_change == "decrease":
                style_adaptations.append("Break down concepts into smaller analytical steps")
            else:
                style_adaptations.append("Continue with current analytical depth")
        
        response = f"""🎯 Difficulty Adaptation for Module {module_number}

Performance Analysis:
• Current score: {current_score}%
• Difficulty change: {difficulty_change.replace('_', ' ').title()}
• Learning style: {learning_style.title()}

Recommendation: {recommendation}

Adaptations:
• Next action: {next_action}
• Style adaptation: {style_adaptations[0]}

✅ Difficulty adapted based on performance!"""
        
        return response
        
    except Exception as e:
        return f"Error adapting difficulty: {str(e)}"

def complete_module(user_id: str, module_number: int, final_score: int) -> str:
    """Marks a learning module as completed and provides completion summary.

    Args:
        user_id (str): The unique identifier for the user completing the module.
        module_number (int): The module number being completed.
        final_score (int): Final performance score for the module (0-100).

    Returns:
        str: Module completion summary and next steps recommendation.
    """
    try:
        # Save final progress as 100% complete
        success = db.save_progress(user_id, f"module_{module_number}", 100, final_score)
        
        if not success:
            return "Error saving module completion."
        
        # Get learning path for context
        learning_path = db.get_user_learning_path(user_id)
        total_modules = 0
        module_title = f"Module {module_number}"
        
        if learning_path:
            modules = learning_path["path_data"].get("modules", [])
            total_modules = len(modules)
            if module_number <= len(modules):
                module_title = modules[module_number - 1].get("title", f"Module {module_number}")
        
        # Determine performance level and certificate status
        if final_score >= 90:
            performance = "Outstanding"
            certificate = "Gold Certificate"
        elif final_score >= 80:
            performance = "Excellent"
            certificate = "Silver Certificate"
        elif final_score >= 70:
            performance = "Good"
            certificate = "Bronze Certificate"
        else:
            performance = "Completed"
            certificate = "Completion Certificate"
        
        # Check overall progress
        progress_data = db.get_user_progress(user_id)
        completed_modules = len(set(module_id for module_id, step, score, date in progress_data 
                                   if step >= 100))
        
        response = f"""🎉 Module Completed!

{module_title}:
• Final Score: {final_score}%
• Performance: {performance}
• Certificate Earned: {certificate}

Progress Summary:
• Modules completed: {completed_modules}/{total_modules}
• Overall progress: {(completed_modules/total_modules*100):.1f}%"""
        
        # Provide next steps
        if completed_modules < total_modules:
            response += f"\n\nNext Steps:\n• Continue to Module {module_number + 1}"
            response += f"\n• {total_modules - completed_modules} modules remaining"
        else:
            response += f"\n\n🏆 Congratulations! All modules completed!"
            response += f"\n• Ready for final assessment"
            response += f"\n• Consider advanced topics or practical application"
        
        response += f"\n\n"
        
        return response
        
    except Exception as e:
        return f"Error completing module: {str(e)}"

def get_database_info(user_id: str) -> str:
    """Retrieves database statistics and progress agent specific information for debugging.

    Args:
        user_id (str): The unique identifier for the user requesting database information.

    Returns:
        str: Formatted database statistics and progress-specific data.
    """
    try:
        stats = db.get_database_stats()
        
        # Get user-specific data
        progress_data = db.get_user_progress(user_id)
        learning_path = db.get_user_learning_path(user_id)
        
        return f"""📊 Progress Agent Database Info:

System Statistics:
• Total users: {stats.get('total_users', 0)}
• Total progress entries: {stats.get('total_progress_entries', 0)}
• Total learning paths: {stats.get('total_learning_paths', 0)}
• Agent communications: {stats.get('total_agent_communications', 0)}

User Progress Data:
• Your progress entries: {len(progress_data)}
• Learning path exists: {'Yes' if learning_path else 'No'}
• Database: financial_literacy.db"""
        
    except Exception as e:
        return f"Error retrieving database info: {str(e)}"