import sys
import os
from typing import Dict, Any, List
import json

# Add the parent 'backend' directory to the Python path to find the 'shared' module
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..', '..'))
sys.path.append(_BACKEND_DIR)

from shared.db_service import db


def get_module_content(user_id: str, module_number: int) -> str:
    """Retrieves and serves the complete learning content for a specific module."""
    try:
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return "ASSESSMENT_INCOMPLETE"
        
        modules = learning_path["path_data"].get("modules", [])
        
        if module_number < 1 or module_number > len(modules):
            return f"Invalid module number. Available modules: 1-{len(modules)}"
        
        module = modules[module_number - 1]
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        learning_style = module.get("learning_style", "analytical")
        risk_tolerance = learning_path["path_data"].get("risk_tolerance", "moderate")
        
        content = generate_content_for_topic(topic, difficulty, learning_style, risk_tolerance)
        
        response = f"""📚 Module {module_number}: {module.get('title', 'Unknown')}

{content}

Module Summary:
• Topic: {topic.replace('_', ' ').title()}
• Difficulty: {difficulty.title()}
• Optimized for: {learning_style.title()} learners
• Risk Focus: {module.get('risk_focus', 'Balanced approach')}"""
        
        return response
        
    except Exception as e:
        return f"Error retrieving module content: {str(e)}"

def get_lesson_step(user_id: str, module_number: int, step_number: int) -> str:
    """Retrieves a specific step within a learning module for progressive content delivery."""
    try:
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return "ASSESSMENT_INCOMPLETE"
        
        modules = learning_path["path_data"].get("modules", [])
        
        if module_number < 1 or module_number > len(modules):
            return f"Invalid module number. Available modules: 1-{len(modules)}"
        
        module = modules[module_number - 1]
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        
        steps = generate_lesson_steps(topic, difficulty, step_number)
        
        if step_number < 1 or step_number > len(steps):
            return f"Invalid step number. Available steps: 1-{len(steps)}"
        
        current_step = steps[step_number - 1]
        
        response = f"""📖 Module {module_number}, Step {step_number}: {current_step['title']}

{current_step['content']}

Progress: Step {step_number} of {len(steps)}
Next: {steps[step_number]['title'] if step_number < len(steps) else 'Module completion assessment'}"""
        
        return response
        
    except Exception as e:
        return f"Error retrieving lesson step: {str(e)}"

def get_quiz_questions(user_id: str, module_number: int) -> str:
    """Generates quiz questions for a learning module to assess comprehension."""
    try:
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return "ASSESSMENT_INCOMPLETE"
        
        modules = learning_path["path_data"].get("modules", [])
        
        if module_number < 1 or module_number > len(modules):
            return f"Invalid module number. Available modules: 1-{len(modules)}"
        
        module = modules[module_number - 1]
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        
        questions = generate_quiz_for_topic(topic, difficulty)
        
        response = f"""📝 Module {module_number} Quiz: {module.get('title', 'Unknown')}

Instructions: Select the best answer for each question.

"""
        
        for i, question in enumerate(questions, 1):
            response += f"Question {i}: {question['question']}\n"
            for letter, option in zip(['A', 'B', 'C', 'D'], question['options']):
                response += f"{letter}. {option}\n"
            response += "\n"
        
        response += "Complete this quiz to test your understanding and earn your module completion score!"
        
        return response
        
    except Exception as e:
        return f"Error generating quiz questions: {str(e)}"

# --- The rest of the file (generate_content_for_topic, etc.) remains unchanged ---
def generate_content_for_topic(topic: str, difficulty: str, learning_style: str, risk_tolerance: str) -> str:
    """Generates structured learning content for a specific financial topic.

    Args:
        topic (str): The financial topic (e.g., 'investment_basics').
        difficulty (str): Learning difficulty level ('beginner', 'intermediate', 'advanced').
        learning_style (str): User's learning preference ('visual', 'hands-on', 'analytical').
        risk_tolerance (str): User's risk tolerance ('conservative', 'moderate', 'aggressive').

    Returns:
        str: Structured content including lessons, examples, and exercises.
    """
    
    # Content library organized by topic and difficulty
    content_library = {
        "investment_basics": {
            "beginner": {
                "lesson": "Investment fundamentals teach you how to grow your money over time. The main types of investments are stocks (ownership in companies), bonds (loans to companies/governments), and ETFs (baskets of many investments).",
                "key_concepts": [
                    "Stocks represent ownership shares in companies",
                    "Bonds are loans that pay regular interest",
                    "ETFs provide instant diversification",
                    "Risk and return are related - higher potential returns usually mean higher risk"
                ],
                "example": "If you buy 1 share of Apple stock for $100, you own a tiny piece of Apple. If Apple does well, your share might be worth $110. If not, it might drop to $90."
            },
            "intermediate": {
                "lesson": "Investment strategy focuses on building diversified portfolios. Asset allocation (how you divide money between stocks, bonds, etc.) is crucial for managing risk while pursuing growth.",
                "key_concepts": [
                    "Diversification reduces risk by spreading investments",
                    "Asset allocation should match your timeline and goals",
                    "Dollar-cost averaging smooths out market volatility",
                    "Rebalancing maintains your target allocation"
                ],
                "example": "A balanced portfolio might be 60% stocks, 30% bonds, 10% cash. If stocks perform well and become 70% of your portfolio, you'd sell some stocks and buy bonds to rebalance."
            },
            "advanced": {
                "lesson": "Advanced investment analysis involves evaluating companies using financial statements, understanding market cycles, and implementing sophisticated portfolio strategies.",
                "key_concepts": [
                    "Fundamental analysis examines company financial health",
                    "Technical analysis studies price patterns and trends", 
                    "Market timing is difficult and often counterproductive",
                    "Tax-efficient investing maximizes after-tax returns"
                ],
                "example": "Analyzing a company's P/E ratio, debt-to-equity ratio, and cash flow helps determine if it's fairly valued compared to competitors and historical norms."
            }
        },
        "risk_management": {
            "beginner": {
                "lesson": "Investment risk is the possibility of losing money. Different investments have different risk levels. Understanding your comfort with risk helps guide investment choices.",
                "key_concepts": [
                    "All investments carry some risk",
                    "Higher risk often means higher potential returns",
                    "Your risk tolerance depends on timeline and personality",
                    "Diversification is the best risk management tool"
                ],
                "example": "Savings accounts are low risk but low return (1-2%). Stocks are higher risk but historically return 7-10% annually over long periods."
            },
            "intermediate": {
                "lesson": "Portfolio risk management involves understanding correlation between assets, using appropriate position sizing, and maintaining proper diversification across asset classes and geographic regions.",
                "key_concepts": [
                    "Asset correlation affects portfolio risk",
                    "Position sizing limits impact of any single investment",
                    "Geographic diversification reduces country-specific risk",
                    "Time diversification reduces short-term volatility impact"
                ],
                "example": "During 2008, US and international stocks fell together (high correlation), but bonds performed well, showing why multi-asset portfolios are important."
            },
            "advanced": {
                "lesson": "Advanced risk management uses mathematical models to quantify risk, implements hedging strategies, and employs sophisticated tools like options and derivatives for risk control.",
                "key_concepts": [
                    "Value at Risk (VaR) quantifies potential losses",
                    "Beta measures sensitivity to market movements",
                    "Options can hedge downside risk",
                    "Risk-adjusted returns account for volatility"
                ],
                "example": "A portfolio with 15% volatility and 8% returns has a Sharpe ratio of 0.53 (assuming 3% risk-free rate), indicating good risk-adjusted performance."
            }
        },
        "retirement_planning": {
            "beginner": {
                "lesson": "Retirement planning starts with understanding tax-advantaged accounts like 401(k)s and IRAs. These accounts help your money grow faster by reducing taxes.",
                "key_concepts": [
                    "401(k) plans often include employer matching",
                    "Traditional accounts are tax-deferred",
                    "Roth accounts are tax-free in retirement",
                    "Starting early gives compound growth more time"
                ],
                "example": "If your employer matches 50% of contributions up to 6%, and you contribute $6,000, they add $3,000 free money - that's an instant 50% return!"
            },
            "intermediate": {
                "lesson": "Retirement optimization involves maximizing tax advantages, understanding withdrawal strategies, and coordinating multiple account types for tax efficiency.",
                "key_concepts": [
                    "Asset location optimizes which investments go in which accounts",
                    "Social Security timing affects lifetime benefits",
                    "Required minimum distributions start at age 73",
                    "Healthcare costs are a major retirement expense"
                ],
                "example": "Putting bonds in tax-deferred accounts and stocks in taxable accounts can improve after-tax returns, since stock gains get preferential tax treatment."
            },
            "advanced": {
                "lesson": "Advanced retirement strategies include Roth conversions, estate planning integration, and sophisticated withdrawal sequencing to minimize lifetime taxes.",
                "key_concepts": [
                    "Roth conversions can reduce future tax burden",
                    "Estate planning affects retirement withdrawal strategy",
                    "Tax-loss harvesting offsets taxable gains",
                    "Withdrawal sequencing optimizes tax efficiency"
                ],
                "example": "Converting traditional IRA funds to Roth during low-income years (like early retirement) can reduce taxes on future growth and required distributions."
            }
        },
        "budgeting": {
            "beginner": {
                "lesson": "Personal budgeting tracks income and expenses to ensure you spend less than you earn. The foundation is understanding where your money goes each month.",
                "key_concepts": [
                    "Track all income sources",
                    "Categorize expenses (needs vs wants)",
                    "Build an emergency fund (3-6 months expenses)",
                    "Pay yourself first by saving before spending"
                ],
                "example": "The 50/30/20 rule suggests 50% of income for needs, 30% for wants, and 20% for savings and debt payment."
            },
            "intermediate": {
                "lesson": "Advanced budgeting strategies include zero-based budgeting, automated savings, and strategic debt management to optimize cash flow and wealth building.",
                "key_concepts": [
                    "Zero-based budgeting assigns every dollar a purpose",
                    "Automation makes saving effortless",
                    "Debt avalanche vs snowball methods",
                    "Irregular income requires different strategies"
                ],
                "example": "Setting up automatic transfers of $500/month to savings on payday ensures consistent wealth building without relying on willpower."
            },
            "advanced": {
                "lesson": "Financial planning integration combines budgeting with investment strategy, tax planning, and cash flow optimization for comprehensive wealth management.",
                "key_concepts": [
                    "Cash flow timing affects investment opportunities",
                    "Tax planning influences spending decisions",
                    "Opportunity cost analysis guides major purchases",
                    "Financial ratios measure financial health"
                ],
                "example": "Delaying a $50,000 car purchase by 2 years and investing that money instead could result in $70,000+ available for the purchase due to compound growth."
            }
        },
        "financial_goals": {
            "beginner": {
                "lesson": "Financial goal setting uses the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound goals help create clear action plans.",
                "key_concepts": [
                    "Distinguish between needs and wants",
                    "Short-term goals (1-2 years) vs long-term (5+ years)",
                    "Prioritize goals by importance and urgency",
                    "Break large goals into smaller milestones"
                ],
                "example": "Instead of 'save money,' a SMART goal is 'save $10,000 for a house down payment within 3 years by saving $278 per month.'"
            },
            "intermediate": {
                "lesson": "Goal achievement strategies involve creating detailed timelines, tracking progress regularly, and adjusting plans as circumstances change.",
                "key_concepts": [
                    "Timeline planning with specific milestones",
                    "Regular progress reviews and adjustments",
                    "Opportunity cost of competing goals",
                    "Flexibility for changing life circumstances"
                ],
                "example": "If saving for both a house and retirement, calculate the optimal allocation: perhaps 60% to house fund for 3 years, then 100% to retirement after purchase."
            },
            "advanced": {
                "lesson": "Strategic financial planning optimizes multiple competing goals, considers tax implications, and integrates estate planning for comprehensive wealth management.",
                "key_concepts": [
                    "Multi-goal optimization using mathematical models",
                    "Scenario planning for different life outcomes",
                    "Legacy planning and intergenerational wealth transfer",
                    "Risk management through insurance and diversification"
                ],
                "example": "Using Monte Carlo simulation to determine optimal savings rates for retirement while funding children's education, considering various market scenarios."
            }
        }
    }
    
    # Get base content for topic and difficulty
    base_content = content_library.get(topic, {}).get(difficulty, {
        "lesson": f"Content for {topic.replace('_', ' ')} at {difficulty} level",
        "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
        "example": "Example content would go here."
    })
    
    # Customize content based on learning style
    if learning_style == "visual":
        style_note = "\n\n📊 Visual Learning Notes:\n• Use charts and graphs to track your progress\n• Create visual representations of portfolio allocation\n• Draw timeline diagrams for your financial goals"
    elif learning_style == "hands-on":
        style_note = "\n\n🛠️ Hands-On Activities:\n• Use online calculators to practice concepts\n• Set up practice portfolios with paper trading\n• Create spreadsheets to track your own finances"
    else:
        style_note = "\n\n📖 Analytical Deep Dive:\n• Study the mathematical relationships behind concepts\n• Analyze case studies and historical examples\n• Break down complex strategies into logical steps"
    
    # Customize based on risk tolerance
    if risk_tolerance == "conservative":
        risk_note = "\n\n🛡️ Conservative Approach:\n• Focus on capital preservation strategies\n• Emphasize stable, predictable investments\n• Consider lower-risk examples and scenarios"
    elif risk_tolerance == "aggressive":
        risk_note = "\n\n🚀 Growth-Oriented Approach:\n• Explore higher-growth potential strategies\n• Consider more volatile investment options\n• Focus on long-term wealth building"
    else:
        risk_note = "\n\n⚖️ Balanced Approach:\n• Mix conservative and growth strategies\n• Diversify across risk levels\n• Balance stability with growth potential"
    
    # Assemble final content
    content = f"""Lesson Overview:
{base_content['lesson']}

Key Concepts:"""
    
    for concept in base_content['key_concepts']:
        content += f"\n• {concept}"
    
    content += f"\n\nPractical Example:\n{base_content['example']}"
    content += style_note
    content += risk_note
    
    return content

def generate_lesson_steps(topic: str, difficulty: str, step_number: int) -> List[Dict[str, str]]:
    """Generates a sequence of learning steps for progressive content delivery.

    Args:
        topic (str): The financial topic.
        difficulty (str): The difficulty level.
        step_number (int): The requested step number.

    Returns:
        list: List of step dictionaries with titles and content.
    """
    
    # Step templates by topic
    step_templates = {
        "investment_basics": [
            {"title": "What Are Investments?", "content": "Investments are assets you buy hoping they'll increase in value or generate income over time."},
            {"title": "Types of Investments", "content": "Main categories include stocks (company ownership), bonds (loans), and funds (collections of investments)."},
            {"title": "Risk and Return", "content": "Generally, higher potential returns come with higher risk. Understanding this trade-off is crucial."},
            {"title": "Getting Started", "content": "Begin with low-cost index funds or ETFs for instant diversification and professional management."},
            {"title": "Building Your Portfolio", "content": "Diversify across asset types, geographic regions, and company sizes to reduce risk."}
        ],
        "risk_management": [
            {"title": "Understanding Risk", "content": "Investment risk includes market risk, inflation risk, and the risk of individual investments failing."},
            {"title": "Risk Tolerance", "content": "Your comfort with risk depends on your timeline, financial situation, and personality."},
            {"title": "Diversification Strategy", "content": "Spread investments across different assets that don't move together to reduce overall portfolio risk."},
            {"title": "Risk Measurement", "content": "Tools like standard deviation and beta help quantify and compare investment risks."},
            {"title": "Risk Management Tools", "content": "Stop-losses, asset allocation, and position sizing help manage and limit investment risks."}
        ],
        "retirement_planning": [
            {"title": "Retirement Basics", "content": "Retirement planning involves saving enough money to maintain your lifestyle without working income."},
            {"title": "Tax-Advantaged Accounts", "content": "401(k)s, IRAs, and other retirement accounts provide tax benefits to encourage long-term saving."},
            {"title": "Employer Benefits", "content": "Company matching is free money - always contribute enough to get the full match."},
            {"title": "Investment Strategy", "content": "Retirement accounts should focus on long-term growth, adjusting risk as you near retirement."},
            {"title": "Withdrawal Planning", "content": "Plan how to withdraw money in retirement to minimize taxes and make your savings last."}
        ],
        "budgeting": [
            {"title": "Income Tracking", "content": "List all income sources including salary, bonuses, side income, and investment returns."},
            {"title": "Expense Categories", "content": "Separate needs (housing, food, utilities) from wants (entertainment, dining out, hobbies)."},
            {"title": "Emergency Fund", "content": "Build 3-6 months of expenses in a savings account before investing for other goals."},
            {"title": "Savings Strategy", "content": "Pay yourself first by automatically saving a percentage of income before other expenses."},
            {"title": "Budget Optimization", "content": "Regularly review and adjust your budget to maximize savings while maintaining quality of life."}
        ],
        "financial_goals": [
            {"title": "Goal Setting Framework", "content": "Use SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound goals."},
            {"title": "Prioritizing Goals", "content": "Rank goals by importance and urgency. Emergency fund typically comes before other goals."},
            {"title": "Timeline Planning", "content": "Short-term goals (1-2 years) need safer investments; long-term goals can handle more risk."},
            {"title": "Progress Tracking", "content": "Regularly monitor progress and adjust plans as life circumstances change."},
            {"title": "Goal Achievement", "content": "Celebrate milestones and use successful goal completion to motivate future financial planning."}
        ]
    }
    
    return step_templates.get(topic, [
        {"title": f"Step {i+1}", "content": f"Content for step {i+1} of {topic}"} for i in range(5)
    ])

def generate_quiz_for_topic(topic: str, difficulty: str) -> List[Dict[str, Any]]:
    """Generates quiz questions specific to a financial topic and difficulty level.

    Args:
        topic (str): The financial topic.
        difficulty (str): The difficulty level.

    Returns:
        list: List of quiz question dictionaries.
    """
    
    quiz_bank = {
        "investment_basics": {
            "beginner": [
                {
                    "question": "What does owning a stock represent?",
                    "options": ["A loan to a company", "Ownership in a company", "A government bond", "A savings account"],
                    "correct": "B"
                },
                {
                    "question": "Which investment typically offers the highest potential returns over long periods?",
                    "options": ["Savings accounts", "Government bonds", "Stocks", "Certificates of deposit"],
                    "correct": "C"
                },
                {
                    "question": "What is an ETF?",
                    "options": ["A single company stock", "A collection of many investments", "A type of bond", "A savings account"],
                    "correct": "B"
                }
            ],
            "intermediate": [
                {
                    "question": "What is the main benefit of diversification?",
                    "options": ["Higher returns", "Lower fees", "Reduced risk", "Faster growth"],
                    "correct": "C"
                },
                {
                    "question": "Dollar-cost averaging involves:",
                    "options": ["Buying all at once", "Investing the same amount regularly", "Only buying when prices are low", "Selling when prices are high"],
                    "correct": "B"
                }
            ]
        },
        "risk_management": {
            "beginner": [
                {
                    "question": "What is the primary way to manage investment risk?",
                    "options": ["Buying only one stock", "Diversification", "Timing the market", "Using a savings account"],
                    "correct": "B"
                },
                {
                    "question": "What does 'risk tolerance' refer to?",
                    "options": ["Your ability to predict the market", "Your comfort with the possibility of losing money", "The amount of money you have to invest", "The number of stocks you own"],
                    "correct": "B"
                }
            ]
        }
    }
    
    return quiz_bank.get(topic, {}).get(difficulty, [
        {"question": f"Sample question for {topic}", "options": ["Option A", "Option B", "Option C", "Option D"], "correct": "A"}
    ])

def process_content_requests(user_id: str) -> str:
    """Reads and processes incoming content requests from other agents via A2A communication.

    Args:
        user_id (str): The unique identifier for the user whose content requests to process.

    Returns:
        str: Status of content request processing and responses sent.
    """
    try:
        # Get latest content request from progress agent
        request = db.get_latest_handoff(user_id, "content_delivery_agent")
        
        if not request:
            return "No content requests found from other agents."
        
        request_data = request["message_data"]
        request_type = request_data.get("request_type")
        
        # Process different types of content requests
        content_response = ""
        
        if request_type == "get_module_content":
            module_number = request_data.get("module_number", 1)
            content_response = get_module_content(user_id, module_number)
            
        elif request_type == "get_lesson_step":
            module_number = request_data.get("module_number", 1)
            step_number = request_data.get("step_number", 1)
            content_response = get_lesson_step(user_id, module_number, step_number)
            
        elif request_type == "get_quiz_questions":
            module_number = request_data.get("module_number", 1)
            content_response = get_quiz_questions(user_id, module_number)
            
        else:
            content_response = f"Unknown request type: {request_type}"
        
        # Send response back via A2A communication
        response_data = {
            "content": content_response,
            "request_type": request_type,
            "user_id": user_id,
            "responding_agent": "content_delivery_agent"
        }
        
        success = db.save_agent_communication(
            user_id=user_id,
            from_agent="content_delivery_agent",
            to_agent="progress_agent",
            message_data=response_data
        )
        
        if success:
            return f"Content request processed and response sent. Request type: {request_type}"
        else:
            return "Error sending content response back to progress agent."
            
    except Exception as e:
        return f"Error processing content requests: {str(e)}"

def send_content_response(user_id: str, content_type: str, module_number: int, step_number: int) -> str:
    """Manually sends content response to progress agent for specific requests.

    Args:
        user_id (str): The unique identifier for the user.
        content_type (str): Type of content to send ("module", "step", "quiz").
        module_number (int): The module number for content.
        step_number (int): The step number (for lesson steps).

    Returns:
        str: Confirmation of content response sent.
    """
    try:
        # Generate content based on type
        if content_type == "module":
            content = get_module_content(user_id, module_number)
        elif content_type == "step":
            content = get_lesson_step(user_id, module_number, step_number)
        elif content_type == "quiz":
            content = get_quiz_questions(user_id, module_number)
        else:
            return f"Invalid content type: {content_type}. Use 'module', 'step', or 'quiz'"
        
        # Send response via A2A
        response_data = {
            "content": content,
            "content_type": content_type,
            "module_number": module_number,
            "step_number": step_number,
            "user_id": user_id
        }
        
        success = db.save_agent_communication(
            user_id=user_id,
            from_agent="content_delivery_agent",
            to_agent="progress_agent",
            message_data=response_data
        )
        
        if success:
            return f"Content sent to progress agent: {content_type} for module {module_number}"
        else:
            return "Error sending content to progress agent."
            
    except Exception as e:
        return f"Error sending content response: {str(e)}"

def get_database_info(user_id: str) -> str:
    """Retrieves database statistics and content delivery agent specific information for debugging.

    Args:
        user_id (str): The unique identifier for the user requesting database information.

    Returns:
        str: Formatted database statistics and content-specific data.
    """
    try:
        stats = db.get_database_stats()
        
        # Get user-specific data
        learning_path = db.get_user_learning_path(user_id)
        progress_data = db.get_user_progress(user_id)
        
        return f"""📊 Content Delivery Agent Database Info:

System Statistics:
• Total users: {stats.get('total_users', 0)}
• Total learning paths: {stats.get('total_learning_paths', 0)}
• Total progress entries: {stats.get('total_progress_entries', 0)}

User Content Data:
• Learning path exists: {'Yes' if learning_path else 'No'}
• Modules available: {len(learning_path['path_data'].get('modules', [])) if learning_path else 0}
• Progress entries: {len(progress_data)}
• Database: financial_literacy.db"""
        
    except Exception as e:
        return f"Error retrieving database info: {str(e)}"
    
def get_current_learning_state(user_id: str) -> str:
    """Returns structured data about user's current learning position and content."""
    try:
        # Get user's learning path
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return json.dumps({
                "status": "error",
                "message": "ASSESSMENT_INCOMPLETE",
                "data": None
            })
        
        # Get user's current progress to determine position
        progress_data = db.get_user_progress(user_id)
        
        # Determine current module and step
        current_module_number = 1
        current_step_number = 1
        
        if progress_data:
            # Find the latest module with progress
            for module_id, step_number, score, completed_at in progress_data:
                module_num = int(module_id.replace("module_", ""))
                if step_number < 100:  # Not completed yet
                    current_module_number = module_num
                    current_step_number = min(step_number + 1, 5)  # Next step or max 5
                    break
                elif step_number >= 100:  # Completed
                    current_module_number = module_num + 1  # Next module
                    current_step_number = 1
        
        modules = learning_path["path_data"].get("modules", [])
        
        # Ensure we don't exceed available modules
        if current_module_number > len(modules):
            current_module_number = len(modules)
            current_step_number = 5  # Last step of last module
        
        if current_module_number < 1 or current_module_number > len(modules):
            return json.dumps({
                "status": "error", 
                "message": f"Invalid module number: {current_module_number}",
                "data": None
            })
        
        # Get current module data
        module = modules[current_module_number - 1]
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        learning_style = module.get("learning_style", "analytical")
        risk_tolerance = learning_path["path_data"].get("risk_tolerance", "moderate")
        
        # Generate lesson steps for current module
        steps = generate_lesson_steps(topic, difficulty, current_step_number)
        current_step_data = steps[current_step_number - 1] if current_step_number <= len(steps) else steps[0]
        
        # Generate content for the module
        content = generate_content_for_topic(topic, difficulty, learning_style, risk_tolerance)
        
        # Parse key concepts from content
        key_concepts = []
        content_library = {
            "investment_basics": {
                "beginner": [
                    "Stocks represent ownership shares in companies",
                    "Bonds are loans that pay regular interest", 
                    "ETFs provide instant diversification",
                    "Risk and return are related"
                ]
            },
            "risk_management": {
                "beginner": [
                    "All investments carry some risk",
                    "Higher risk often means higher potential returns",
                    "Your risk tolerance depends on timeline and personality",
                    "Diversification is the best risk management tool"
                ]
            }
            # Add other topics as needed
        }
        
        key_concepts = content_library.get(topic, {}).get(difficulty, [
            f"Key concept 1 for {topic}",
            f"Key concept 2 for {topic}",
            f"Key concept 3 for {topic}"
        ])
        
        # Generate quiz questions
        quiz_questions = generate_quiz_for_topic(topic, difficulty)
        
        # Structure the response
        response_data = {
            "status": "success",
            "data": {
                "current_position": {
                    "module_number": current_module_number,
                    "step_number": current_step_number,
                    "total_modules": len(modules),
                    "total_steps": len(steps)
                },
                "module": {
                    "number": current_module_number,
                    "title": module.get('title', 'Unknown'),
                    "topic": topic,
                    "difficulty": difficulty,
                    "learning_style": learning_style,
                    "risk_tolerance": risk_tolerance,
                    "risk_focus": module.get('risk_focus', 'Balanced approach')
                },
                "current_step": {
                    "number": current_step_number,
                    "title": current_step_data.get('title', 'Unknown Step'),
                    "content": current_step_data.get('content', ''),
                    "total_steps": len(steps)
                },
                "key_concepts": key_concepts,
                "lesson_content": content,
                "quiz_questions": quiz_questions,
                "user_profile": {
                    "learning_style": learning_style,
                    "risk_tolerance": risk_tolerance
                }
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving learning state: {str(e)}",
            "data": None
        })
    
def check_assessment_status(user_id: str) -> str:
    """Checks if user has completed their initial assessment and has a learning path.
    
    Args:
        user_id (str): The user ID to check assessment status for
    
    Returns:
        str: JSON response with assessment status and user guidance
    """
    try:
        # Check if user has completed assessment by looking for learning path
        learning_path = db.get_user_learning_path(user_id)
        
        if not learning_path:
            return json.dumps({
                "status": "assessment_incomplete",
                "message": "ASSESSMENT_REQUIRED",
                "data": {
                    "assessment_complete": False,
                    "user_guidance": {
                        "title": "Complete Your Financial Assessment",
                        "description": "To access personalized learning content, you need to complete a quick assessment.",
                        "action_required": "Return to the main chat dashboard to begin your assessment",
                        "estimated_time": "5-10 minutes",
                        "benefits": [
                            "Personalized learning path based on your knowledge level",
                            "Content adapted to your learning style", 
                            "Customized examples for your risk tolerance",
                            "Progress tracking tailored to your goals"
                        ]
                    },
                    "next_steps": [
                        "Navigate to the main chat dashboard",
                        "Start conversation with the Assessment Agent",
                        "Answer questions about your financial knowledge",
                        "Receive your personalized learning plan"
                    ]
                }
            })
        
        # Assessment is complete - check progress
        progress_data = db.get_user_progress(user_id)
        path_data = learning_path.get("path_data", {})
        risk_tolerance = path_data.get("risk_tolerance", "moderate")
        learning_style = path_data.get("learning_style", "analytical")
        
        return json.dumps({
            "status": "assessment_complete", 
            "message": "READY_FOR_LEARNING",
            "data": {
                "assessment_complete": True,
                "user_profile": {
                    "risk_tolerance": risk_tolerance,
                    "learning_style": learning_style,
                    "assessment_date": learning_path.get("created_at", "Unknown")
                },
                "progress_summary": {
                    "modules_available": len(path_data.get("modules", [])),
                    "progress_entries": len(progress_data) if progress_data else 0,
                    "learning_path_ready": True
                },
                "welcome_message": f"Welcome back! Your {learning_style} learning path is ready with {risk_tolerance} risk-focused content."
            }
        })
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error checking assessment status: {str(e)}",
            "data": {
                "assessment_complete": False,
                "error_details": str(e),
                "user_guidance": {
                    "title": "System Error",
                    "description": "There was an error checking your assessment status.",
                    "action_required": "Please try refreshing the page or contact support"
                }
            }
        })