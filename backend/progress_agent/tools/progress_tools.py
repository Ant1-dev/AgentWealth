import sys
import os
from typing import Dict, Any, List
import json

# Add the parent 'backend' directory to the Python path to find the 'shared' module
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..', '..'))
sys.path.append(_BACKEND_DIR)

from shared.db_service import db

def get_learning_modules(user_id: str) -> str:
    """Returns structured learning modules data with progress and status."""
    try:
        # Get user's learning path
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return json.dumps({
                "status": "error",
                "message": "No learning path found. Complete assessment first.",
                "data": None
            })
        
        # Get user's progress data
        progress_data = db.get_user_progress(user_id)
        
        # Create progress lookup
        progress_lookup = {}
        if progress_data:
            for module_id, step_number, score, completed_at in progress_data:
                module_num = int(module_id.replace("module_", ""))
                progress_lookup[module_num] = {
                    "step": step_number,
                    "score": score,
                    "completed_at": completed_at
                }
        
        # Build modules array
        modules = []
        path_modules = learning_path["path_data"].get("modules", [])
        
        for i, module_data in enumerate(path_modules, 1):
            progress_info = progress_lookup.get(i, {"step": 0, "score": 0})
            
            # Determine status and progress
            if progress_info["step"] >= 100:
                status = "completed"
                progress = 100
            elif progress_info["step"] > 0:
                status = "in-progress"
                progress = progress_info["step"]
            else:
                status = "upcoming"
                progress = 0
            
            module = {
                "name": module_data.get("title", f"Module {i}"),
                "progress": progress,
                "status": status,
                "topic": module_data.get("topic", "financial_literacy"),
                "difficulty": module_data.get("difficulty", "beginner"),
                "duration": module_data.get("duration", "2-3 hours"),
                "module_number": i,
                "last_score": progress_info["score"],
                "last_accessed": progress_info.get("completed_at", ""),
                "description": f"Learn essential {module_data.get('topic', 'financial').replace('_', ' ')} concepts"
            }
            modules.append(module)
        
        # Calculate overall statistics
        completed_count = sum(1 for m in modules if m["status"] == "completed")
        in_progress_count = sum(1 for m in modules if m["status"] == "in-progress")
        total_modules = len(modules)
        overall_progress = round((completed_count / total_modules * 100)) if total_modules > 0 else 0
        
        response_data = {
            "status": "success",
            "data": {
                "modules": modules,
                "total_modules": total_modules,
                "completed_count": completed_count,
                "in_progress_count": in_progress_count,
                "upcoming_count": total_modules - completed_count - in_progress_count,
                "overall_progress": overall_progress,
                "user_id": user_id,
                "learning_style": learning_path["path_data"].get("learning_style", "analytical"),
                "risk_tolerance": learning_path["path_data"].get("risk_tolerance", "moderate")
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving learning modules: {str(e)}",
            "data": None
        })

def get_dashboard_stats(user_id: str) -> str:
    """Returns comprehensive dashboard statistics as JSON."""
    try:
        # Get learning modules data first
        modules_response = get_learning_modules(user_id)
        modules_data = json.loads(modules_response)
        
        if modules_data["status"] != "success":
            return json.dumps({
                "status": "error",
                "message": "Cannot generate stats without learning modules",
                "data": None
            })
        
        module_stats = modules_data["data"]
        
        # Get additional stats
        progress_data = db.get_user_progress(user_id)
        learning_path = db.get_user_learning_path(user_id)
        
        # Calculate learning streak
        learning_streak = 0
        if progress_data:
            # Simple streak calculation based on recent activity
            recent_entries = sorted(progress_data, key=lambda x: x[3], reverse=True)[:7]
            learning_streak = len(recent_entries)
        
        # Calculate time spent (estimated)
        estimated_time_spent = 0
        for module in module_stats["modules"]:
            if module["status"] == "completed":
                estimated_time_spent += 2.5  # Average 2.5 hours per completed module
            elif module["status"] == "in-progress":
                estimated_time_spent += (module["progress"] / 100) * 2.5
        
        # Get next module recommendation
        next_module = None
        for module in module_stats["modules"]:
            if module["status"] == "in-progress":
                next_module = {
                    "name": module["name"],
                    "module_number": module["module_number"],
                    "progress": module["progress"]
                }
                break
            elif module["status"] == "upcoming":
                next_module = {
                    "name": module["name"],
                    "module_number": module["module_number"],
                    "progress": 0
                }
                break
        
        response_data = {
            "status": "success",
            "data": {
                "active_agents": 4,
                "overall_progress": module_stats["overall_progress"],
                "completed_modules": module_stats["completed_count"],
                "total_modules": module_stats["total_modules"],
                "in_progress_modules": module_stats["in_progress_count"],
                "learning_streak": learning_streak,
                "estimated_time_spent": round(estimated_time_spent, 1),
                "next_module": next_module,
                "learning_style": module_stats["learning_style"],
                "risk_tolerance": module_stats["risk_tolerance"],
                "last_activity": progress_data[-1][3] if progress_data else None
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error generating dashboard stats: {str(e)}",
            "data": None
        })

def start_learning_module(user_id: str, module_number: int) -> str:
    """Starts a learning module and returns structured response."""
    try:
        # Get user's learning path
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return json.dumps({
                "status": "error",
                "message": "No learning path found. Complete assessment first.",
                "data": None
            })
        
        modules = learning_path["path_data"].get("modules", [])
        
        if module_number < 1 or module_number > len(modules):
            return json.dumps({
                "status": "error",
                "message": f"Invalid module number. Available modules: 1-{len(modules)}",
                "data": None
            })
        
        module = modules[module_number - 1]
        
        # Save progress - starting module (1% to indicate started)
        success = db.save_progress(user_id, f"module_{module_number}", 1, 0)
        
        if success:
            response_data = {
                "status": "success",
                "message": f"Module {module_number} started successfully",
                "data": {
                    "module_number": module_number,
                    "module_title": module.get('title', 'Unknown'),
                    "topic": module.get('topic', 'unknown'),
                    "difficulty": module.get('difficulty', 'beginner'),
                    "duration": module.get('duration', '2-3 hours'),
                    "progress": 1,
                    "status": "in-progress",
                    "content_areas": module.get('content_areas', []),
                    "activities": module.get('activities', []),
                    "learning_style": module.get('learning_style', 'analytical'),
                    "started_at": "now"
                }
            }
            
            return json.dumps(response_data)
        else:
            return json.dumps({
                "status": "error",
                "message": "Error saving module start progress",
                "data": None
            })
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error starting learning module: {str(e)}",
            "data": None
        })

def save_progress(user_id: str, module_number: int, step_number: int, score: int) -> str:
    """Saves progress and returns structured response."""
    try:
        # Validate inputs
        if step_number < 0 or step_number > 100:
            return json.dumps({
                "status": "error",
                "message": "Step number must be between 0-100 (percentage complete)",
                "data": None
            })
        
        if score < 0 or score > 100:
            return json.dumps({
                "status": "error",
                "message": "Score must be between 0-100",
                "data": None
            })
        
        # Save progress to database
        success = db.save_progress(user_id, f"module_{module_number}", step_number, score)
        
        if success:
            # Determine performance level
            performance_levels = {
                90: {"level": "Excellent", "feedback": "Outstanding work! You've mastered this concept."},
                80: {"level": "Good", "feedback": "Great job! You have a solid understanding."},
                70: {"level": "Satisfactory", "feedback": "Good progress! Consider reviewing the key concepts."},
                60: {"level": "Needs Improvement", "feedback": "You're getting there! Additional practice recommended."},
                0: {"level": "Requires Review", "feedback": "Let's review this material together before moving forward."}
            }
            
            performance = next(perf for threshold, perf in performance_levels.items() if score >= threshold)
            
            response_data = {
                "status": "success",
                "message": "Progress saved successfully",
                "data": {
                    "module_number": module_number,
                    "step_number": step_number,
                    "score": score,
                    "performance_level": performance["level"],
                    "feedback": performance["feedback"],
                    "is_completed": step_number >= 100,
                    "progress_percentage": step_number,
                    "saved_at": "now"
                }
            }
            
            return json.dumps(response_data)
        else:
            return json.dumps({
                "status": "error",
                "message": "Error saving progress to database",
                "data": None
            })
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error saving progress: {str(e)}",
            "data": None
        })

def complete_module(user_id: str, module_number: int, final_score: int) -> str:
    """Completes a module and returns structured response."""
    try:
        # Save final progress as 100% complete
        success = db.save_progress(user_id, f"module_{module_number}", 100, final_score)
        
        if not success:
            return json.dumps({
                "status": "error",
                "message": "Error saving module completion",
                "data": None
            })
        
        # Get learning path for context
        learning_path = db.get_user_learning_path(user_id)
        total_modules = 0
        module_title = f"Module {module_number}"
        
        if learning_path:
            modules = learning_path["path_data"].get("modules", [])
            total_modules = len(modules)
            if module_number <= len(modules):
                module_title = modules[module_number - 1].get("title", f"Module {module_number}")
        
        # Determine certificate level
        certificates = {
            90: "Gold Certificate",
            80: "Silver Certificate", 
            70: "Bronze Certificate",
            0: "Completion Certificate"
        }
        
        certificate = next(cert for threshold, cert in certificates.items() if final_score >= threshold)
        
        # Check overall progress
        progress_data = db.get_user_progress(user_id)
        completed_modules = len(set(module_id for module_id, step, score, date in progress_data 
                                   if step >= 100))
        
        # Determine next steps
        next_steps = []
        if completed_modules < total_modules:
            next_steps = [
                f"Continue to Module {module_number + 1}",
                f"{total_modules - completed_modules} modules remaining"
            ]
        else:
            next_steps = [
                "All modules completed!",
                "Ready for final assessment",
                "Consider advanced topics"
            ]
        
        response_data = {
            "status": "success",
            "message": "Module completed successfully",
            "data": {
                "module_number": module_number,
                "module_title": module_title,
                "final_score": final_score,
                "certificate": certificate,
                "completed_modules": completed_modules,
                "total_modules": total_modules,
                "overall_progress": round((completed_modules / total_modules * 100)) if total_modules > 0 else 100,
                "next_steps": next_steps,
                "is_all_complete": completed_modules >= total_modules,
                "completed_at": "now"
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error completing module: {str(e)}",
            "data": None
        })

def get_user_progress(user_id: str) -> str:
    """Returns detailed user progress as structured JSON."""
    try:
        # Get progress data
        progress_data = db.get_user_progress(user_id)
        
        if not progress_data:
            return json.dumps({
                "status": "error",
                "message": "No learning progress found. Start a learning module first.",
                "data": None
            })
        
        # Get learning path for context
        learning_path = db.get_user_learning_path(user_id)
        total_modules = 0
        if learning_path:
            total_modules = learning_path["path_data"].get("total_modules", 0)
        
        # Organize progress by module
        module_progress = {}
        for module_id, step_number, score, completed_at in progress_data:
            module_num = int(module_id.replace("module_", ""))
            if module_num not in module_progress:
                module_progress[module_num] = []
            module_progress[module_num].append({
                "step": step_number,
                "score": score,
                "completed_at": completed_at
            })
        
        # Calculate statistics
        completed_modules = sum(1 for module_num, steps in module_progress.items() 
                               if any(step["step"] >= 100 for step in steps))
        
        total_scores = []
        module_details = []
        
        for module_num in sorted(module_progress.keys()):
            steps = module_progress[module_num]
            latest = max(steps, key=lambda x: x["completed_at"])
            
            status = "completed" if latest["step"] >= 100 else "in-progress"
            total_scores.append(latest["score"])
            
            module_details.append({
                "module_number": module_num,
                "status": status,
                "progress": latest["step"],
                "score": latest["score"],
                "last_updated": latest["completed_at"]
            })
        
        average_score = sum(total_scores) / len(total_scores) if total_scores else 0
        
        response_data = {
            "status": "success",
            "data": {
                "modules_started": len(module_progress),
                "modules_completed": completed_modules,
                "total_modules": total_modules,
                "average_score": round(average_score, 1),
                "overall_progress": round((completed_modules / total_modules * 100)) if total_modules > 0 else 0,
                "module_details": module_details,
                "user_id": user_id
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving progress: {str(e)}",
            "data": None
        })

# Keep the existing text-based tools for backwards compatibility
def get_planning_handoff(user_id: str) -> str:
    """Retrieves the latest learning path handoff data from the planning agent."""
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

def get_database_info(user_id: str) -> str:
    """Retrieves database statistics and progress agent specific information for debugging."""
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