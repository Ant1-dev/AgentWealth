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
            return json.dumps({
                "status": "error",
                "message": "ASSESSMENT_INCOMPLETE",
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
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        learning_style = module.get("learning_style", "analytical")
        risk_tolerance = learning_path["path_data"].get("risk_tolerance", "moderate")
        
        content = generate_content_for_topic(topic, difficulty, learning_style, risk_tolerance)
        
        response_data = {
            "status": "success",
            "data": {
                "module_number": module_number,
                "title": module.get('title', 'Unknown'),
                "topic": topic.replace('_', ' ').title(),
                "difficulty": difficulty.title(),
                "learning_style": learning_style.title(),
                "risk_tolerance": risk_tolerance.title(),
                "risk_focus": module.get('risk_focus', 'Balanced approach'),
                "content": content,
                "duration": module.get('duration', '2-3 hours'),
                "description": f"This module covers essential concepts in {topic.replace('_', ' ')} designed for {difficulty} level learners with {learning_style} learning preferences."
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving module content: {str(e)}",
            "data": None
        })

def get_lesson_step(user_id: str, module_number: int, step_number: int) -> str:
    """Retrieves a specific step within a learning module for progressive content delivery."""
    try:
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return json.dumps({
                "status": "error",
                "message": "ASSESSMENT_INCOMPLETE", 
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
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        
        steps = generate_lesson_steps(topic, difficulty, step_number)
        
        if step_number < 1 or step_number > len(steps):
            return json.dumps({
                "status": "error",
                "message": f"Invalid step number. Available steps: 1-{len(steps)}",
                "data": None
            })
        
        current_step = steps[step_number - 1]
        
        response_data = {
            "status": "success",
            "data": {
                "module_number": module_number,
                "step_number": step_number,
                "total_steps": len(steps),
                "title": current_step['title'],
                "content": current_step['content'],
                "topic": topic.replace('_', ' ').title(),
                "difficulty": difficulty.title(),
                "next_step_title": steps[step_number]['title'] if step_number < len(steps) else "Module completion assessment",
                "progress_percentage": round((step_number / len(steps)) * 100)
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving lesson step: {str(e)}",
            "data": None
        })

def get_quiz_questions(user_id: str, module_number: int) -> str:
    """Generates quiz questions for a learning module to assess comprehension."""
    try:
        learning_path = db.get_user_learning_path(user_id)
        if not learning_path:
            return json.dumps({
                "status": "error",
                "message": "ASSESSMENT_INCOMPLETE",
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
        topic = module.get("topic", "unknown")
        difficulty = module.get("difficulty", "beginner")
        
        questions = generate_quiz_for_topic(topic, difficulty)
        
        response_data = {
            "status": "success",
            "data": {
                "module_number": module_number,
                "module_title": module.get('title', 'Unknown'),
                "topic": topic.replace('_', ' ').title(),
                "difficulty": difficulty.title(),
                "questions": questions,
                "total_questions": len(questions),
                "instructions": "Select the best answer for each question to test your understanding of the key concepts."
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error generating quiz questions: {str(e)}",
            "data": None
        })

def generate_content_for_topic(topic: str, difficulty: str, learning_style: str, risk_tolerance: str) -> str:
    """Generates structured learning content for a specific financial topic."""
    
    # Content library organized by topic and difficulty
    content_library = {
        "investment_basics": {
            "beginner": {
                "overview": "Investment fundamentals teach you how to grow your money over time through different types of assets.",
                "key_points": [
                    "Stocks represent ownership shares in companies and offer growth potential",
                    "Bonds are loans to companies/governments that provide steady income", 
                    "ETFs bundle many investments together for instant diversification",
                    "Higher potential returns typically come with higher risk levels"
                ],
                "practical_example": "If you invest $1,000 in an S&P 500 ETF, you own tiny pieces of 500 major companies. If these companies do well collectively, your investment grows. If they struggle, it may decline temporarily.",
                "action_steps": [
                    "Start with low-cost index funds or ETFs for diversification",
                    "Invest regularly through dollar-cost averaging",
                    "Focus on long-term growth rather than short-term fluctuations",
                    "Keep fees low to maximize your returns"
                ]
            },
            "intermediate": {
                "overview": "Investment strategy focuses on building diversified portfolios that balance risk and return based on your goals and timeline.",
                "key_points": [
                    "Asset allocation is more important than individual investment selection",
                    "Diversification across asset classes reduces portfolio volatility",
                    "Rebalancing maintains your target allocation as markets change",
                    "Time horizon determines appropriate risk level"
                ],
                "practical_example": "A 30-year-old might use a 70% stocks/30% bonds allocation for growth, while a 60-year-old might prefer 40% stocks/60% bonds for stability as retirement approaches.",
                "action_steps": [
                    "Determine your target asset allocation based on goals",
                    "Diversify across domestic and international markets",
                    "Rebalance quarterly or when allocations drift significantly",
                    "Consider tax-efficient fund placement in different account types"
                ]
            }
        },
        "risk_management": {
            "beginner": {
                "overview": "Investment risk is the possibility of losing money, but understanding and managing risk helps you make better decisions.",
                "key_points": [
                    "All investments carry some level of risk - there's no such thing as a guaranteed return",
                    "Risk and return are directly related - higher potential returns require accepting higher risk",
                    "Your risk tolerance depends on your timeline, financial situation, and comfort level",
                    "Diversification is the most effective way to reduce investment risk"
                ],
                "practical_example": "A savings account might earn 1% with virtually no risk, while stocks might average 7-10% annually but can lose 20-30% in bad years. Your choice depends on when you need the money.",
                "action_steps": [
                    "Assess your personal risk tolerance honestly",
                    "Don't invest money you'll need within 3-5 years in stocks",
                    "Spread investments across different asset types and sectors",
                    "Focus on long-term trends rather than daily fluctuations"
                ]
            }
        },
        "retirement_planning": {
            "beginner": {
                "overview": "Retirement planning involves saving enough money to maintain your lifestyle when you stop working, using tax-advantaged accounts to maximize growth.",
                "key_points": [
                    "401(k) plans often include employer matching - free money you shouldn't leave on the table",
                    "Traditional accounts are tax-deferred - you pay taxes when you withdraw",
                    "Roth accounts are tax-free in retirement - you pay taxes upfront",
                    "Starting early gives compound growth decades to work in your favor"
                ],
                "practical_example": "If your employer matches 50% of contributions up to 6% of salary, and you earn $50,000, contributing $3,000 gets you $1,500 in free matching - that's an instant 50% return!",
                "action_steps": [
                    "Contribute enough to get your full employer match",
                    "Increase contributions by 1% each year",
                    "Choose low-cost target-date funds if unsure about investments",
                    "Don't cash out retirement accounts when changing jobs"
                ]
            }
        }
    }
    
    # Get base content for topic and difficulty
    base_content = content_library.get(topic, {}).get(difficulty, {
        "overview": f"Learn essential concepts in {topic.replace('_', ' ')} to build your financial knowledge.",
        "key_points": [
            "Understanding fundamental principles",
            "Applying concepts to real situations", 
            "Making informed financial decisions",
            "Building long-term wealth"
        ],
        "practical_example": "Practical examples help you apply these concepts to your own financial situation.",
        "action_steps": [
            "Review the key concepts carefully",
            "Consider how they apply to your situation",
            "Take small steps to implement what you learn",
            "Track your progress over time"
        ]
    })
    
    # Customize content based on learning style
    style_customization = {
        "visual": {
            "suggestion": "Use charts and graphs to visualize your progress and portfolio allocation.",
            "tools": "Consider apps like Mint or Personal Capital for visual tracking."
        },
        "hands-on": {
            "suggestion": "Practice with online calculators and paper trading accounts.",
            "tools": "Try investment simulators before using real money."
        },
        "analytical": {
            "suggestion": "Study the mathematical relationships and historical data behind these concepts.",
            "tools": "Research academic studies and detailed financial analysis."
        }
    }
    
    # Customize based on risk tolerance  
    risk_customization = {
        "conservative": {
            "approach": "Focus on capital preservation with modest growth potential.",
            "emphasis": "Prioritize safety and steady, predictable returns."
        },
        "moderate": {
            "approach": "Balance growth potential with reasonable risk management.",
            "emphasis": "Diversify across risk levels for steady long-term growth."
        },
        "aggressive": {
            "approach": "Pursue higher growth potential with acceptance of volatility.",
            "emphasis": "Focus on long-term wealth building with higher risk tolerance."
        }
    }
    
    # Build the content
    content = f"""
<div class="lesson-overview">
<h3>Overview</h3>
<p>{base_content['overview']}</p>
</div>

<div class="key-concepts">
<h3>Key Concepts</h3>
<ul>
"""
    
    for point in base_content['key_points']:
        content += f"<li>{point}</li>\n"
    
    content += f"""
</ul>
</div>

<div class="practical-example">
<h3>Practical Example</h3>
<p>{base_content['practical_example']}</p>
</div>

<div class="action-steps">
<h3>Action Steps</h3>
<ol>
"""
    
    for step in base_content['action_steps']:
        content += f"<li>{step}</li>\n"
    
    style_info = style_customization.get(learning_style, style_customization['analytical'])
    risk_info = risk_customization.get(risk_tolerance, risk_customization['moderate'])
    
    content += f"""
</ol>
</div>

<div class="personalized-guidance">
<h3>Personalized for You</h3>
<p><strong>Learning Style ({learning_style.title()}):</strong> {style_info['suggestion']}</p>
<p><strong>Risk Approach ({risk_tolerance.title()}):</strong> {risk_info['approach']}</p>
</div>
"""
    
    return content

def generate_lesson_steps(topic: str, difficulty: str, step_number: int) -> List[Dict[str, str]]:
    """Generates a sequence of learning steps for progressive content delivery."""
    
    step_templates = {
        "investment_basics": [
            {
                "title": "What Are Investments?", 
                "content": """
                <h3>Understanding Investments</h3>
                <p>Investments are assets you purchase with the expectation that they will generate income or appreciate in value over time. Think of them as tools to grow your wealth rather than just storing it.</p>
                
                <h4>Why Invest?</h4>
                <ul>
                    <li><strong>Beat Inflation:</strong> Keep your purchasing power over time</li>
                    <li><strong>Build Wealth:</strong> Grow your money faster than savings accounts</li>
                    <li><strong>Reach Goals:</strong> Fund retirement, education, or major purchases</li>
                    <li><strong>Generate Income:</strong> Create passive income streams</li>
                </ul>
                
                <p><strong>Key Takeaway:</strong> Investing is about putting your money to work so it can grow while you focus on other aspects of your life.</p>
                """
            },
            {
                "title": "Types of Investments",
                "content": """
                <h3>Main Investment Categories</h3>
                
                <h4>1. Stocks (Equities)</h4>
                <p>When you buy stock, you own a small piece of a company. If the company does well, your stock value increases.</p>
                
                <h4>2. Bonds (Fixed Income)</h4>
                <p>Bonds are loans you make to companies or governments. They pay you regular interest in return.</p>
                
                <h4>3. Mutual Funds & ETFs</h4>
                <p>These pool money from many investors to buy diversified collections of stocks and bonds.</p>
                
                <h4>4. Real Estate</h4>
                <p>Property investments can provide rental income and potential appreciation.</p>
                
                <p><strong>Pro Tip:</strong> Start with broad market ETFs for instant diversification across hundreds of companies.</p>
                """
            },
            {
                "title": "Risk and Return Relationship",
                "content": """
                <h3>Understanding the Risk-Return Tradeoff</h3>
                <p>One of the most important concepts in investing is that risk and potential return are directly related.</p>
                
                <h4>The Spectrum:</h4>
                <ul>
                    <li><strong>Low Risk, Low Return:</strong> Savings accounts, CDs (1-3% annually)</li>
                    <li><strong>Medium Risk, Medium Return:</strong> Bonds, balanced funds (3-6% annually)</li>
                    <li><strong>Higher Risk, Higher Return:</strong> Stocks, growth funds (6-10%+ annually)</li>
                </ul>
                
                <h4>Managing Risk:</h4>
                <p>The key isn't to avoid risk entirely, but to take appropriate risks for your timeline and goals. Younger investors can typically handle more risk because they have time to recover from market downturns.</p>
                
                <p><strong>Remember:</strong> No investment is guaranteed, but historically, diversified stock investments have provided the best long-term returns.</p>
                """
            },
            {
                "title": "Getting Started with Investing",
                "content": """
                <h3>Your First Steps into Investing</h3>
                
                <h4>1. Build Your Foundation</h4>
                <ul>
                    <li>Emergency fund (3-6 months expenses)</li>
                    <li>Pay off high-interest debt</li>
                    <li>Stable income source</li>
                </ul>
                
                <h4>2. Choose Your Account Type</h4>
                <ul>
                    <li><strong>401(k):</strong> Employer-sponsored, often with matching</li>
                    <li><strong>IRA:</strong> Individual retirement account with tax benefits</li>
                    <li><strong>Taxable:</strong> Regular investment account, more flexibility</li>
                </ul>
                
                <h4>3. Start Simple</h4>
                <p>Begin with a target-date fund or broad market index fund. These provide instant diversification and professional management.</p>
                
                <h4>4. Automate Your Investing</h4>
                <p>Set up automatic monthly contributions to build wealth consistently without having to think about it.</p>
                """
            },
            {
                "title": "Building Your Investment Portfolio",
                "content": """
                <h3>Creating a Balanced Portfolio</h3>
                
                <h4>Asset Allocation Basics</h4>
                <p>This refers to how you divide your money between different types of investments:</p>
                
                <ul>
                    <li><strong>Age-based rule:</strong> Hold your age in bonds (30 years old = 30% bonds, 70% stocks)</li>
                    <li><strong>Risk-based:</strong> Conservative (40/60), Moderate (60/40), Aggressive (80/20)</li>
                    <li><strong>Goal-based:</strong> Adjust based on when you need the money</li>
                </ul>
                
                <h4>Diversification Strategy</h4>
                <ul>
                    <li>Spread investments across different company sizes</li>
                    <li>Include both domestic and international markets</li>
                    <li>Consider different sectors and industries</li>
                    <li>Rebalance periodically to maintain your target allocation</li>
                </ul>
                
                <p><strong>Bottom Line:</strong> A well-diversified portfolio helps reduce risk while still capturing market growth over time.</p>
                """
            }
        ],
        "risk_management": [
            {
                "title": "Understanding Investment Risk",
                "content": """
                <h3>What Is Investment Risk?</h3>
                <p>Investment risk is the possibility that your investments will lose value or not perform as expected. While this might sound scary, understanding risk helps you make better decisions.</p>
                
                <h4>Types of Investment Risk:</h4>
                <ul>
                    <li><strong>Market Risk:</strong> Overall market movements affect your investments</li>
                    <li><strong>Inflation Risk:</strong> Your purchasing power decreases over time</li>
                    <li><strong>Company Risk:</strong> Individual companies may struggle or fail</li>
                    <li><strong>Interest Rate Risk:</strong> Changes in rates affect bond values</li>
                </ul>
                
                <p><strong>Important:</strong> Not investing is also risky - your money loses purchasing power to inflation over time.</p>
                """
            },
            {
                "title": "Assessing Your Risk Tolerance",
                "content": """
                <h3>How Much Risk Can You Handle?</h3>
                <p>Your risk tolerance depends on several factors that are unique to your situation.</p>
                
                <h4>Consider These Factors:</h4>
                <ul>
                    <li><strong>Timeline:</strong> Longer investment periods can handle more volatility</li>
                    <li><strong>Financial Stability:</strong> Steady income allows for more risk-taking</li>
                    <li><strong>Personality:</strong> Some people sleep better with conservative investments</li>
                    <li><strong>Experience:</strong> Knowledge and comfort with markets affects risk tolerance</li>
                </ul>
                
                <h4>Risk Tolerance Quiz Questions:</h4>
                <p>Ask yourself: If your investment dropped 20% in value tomorrow, would you:</p>
                <ul>
                    <li>Panic and sell everything?</li>
                    <li>Feel uncomfortable but stay invested?</li>
                    <li>See it as a buying opportunity?</li>
                </ul>
                
                <p>Your honest answer helps determine your appropriate risk level.</p>
                """
            }
        ],
        "retirement_planning": [
            {
                "title": "Retirement Planning Fundamentals",
                "content": """
                <h3>Planning for Your Financial Future</h3>
                <p>Retirement planning is about accumulating enough money to maintain your desired lifestyle when you stop working. The earlier you start, the easier it becomes.</p>
                
                <h4>The Magic of Compound Growth:</h4>
                <p>When you invest for retirement, your money grows in two ways:</p>
                <ul>
                    <li><strong>Your contributions:</strong> The money you put in</li>
                    <li><strong>Investment growth:</strong> Returns on your investments</li>
                    <li><strong>Compound effect:</strong> Growth on top of previous growth</li>
                </ul>
                
                <h4>Example:</h4>
                <p>Starting at age 25 and saving $200/month at 7% annual return:</p>
                <ul>
                    <li>By age 35: ~$35,000</li>
                    <li>By age 45: ~$110,000</li>
                    <li>By age 65: ~$525,000</li>
                </ul>
                
                <p><strong>Key Insight:</strong> Time is your greatest asset in retirement planning.</p>
                """
            }
        ]
    }
    
    return step_templates.get(topic, [
        {"title": f"Learning Step {i+1}", "content": f"<p>Educational content for step {i+1} of {topic.replace('_', ' ')}.</p>"} 
        for i in range(5)
    ])

def generate_quiz_for_topic(topic: str, difficulty: str) -> List[Dict[str, Any]]:
    """Generates quiz questions specific to a financial topic and difficulty level."""
    
    quiz_bank = {
        "investment_basics": {
            "beginner": [
                {
                    "question": "What does owning a stock represent?",
                    "options": [
                        "A loan to a company",
                        "Ownership in a company", 
                        "A government bond",
                        "A savings account"
                    ],
                    "correct": "B",
                    "explanation": "When you buy stock, you purchase a small ownership stake in that company."
                },
                {
                    "question": "Which investment typically offers the highest potential returns over long periods?",
                    "options": [
                        "Savings accounts",
                        "Government bonds", 
                        "Stocks",
                        "Certificates of deposit"
                    ],
                    "correct": "C",
                    "explanation": "Historically, stocks have provided the highest long-term returns, though with higher volatility."
                },
                {
                    "question": "What is the main benefit of an ETF?",
                    "options": [
                        "Guaranteed returns",
                        "Instant diversification",
                        "No fees",
                        "Government insurance"
                    ],
                    "correct": "B",
                    "explanation": "ETFs allow you to own pieces of many different investments through a single purchase."
                },
                {
                    "question": "What is the relationship between risk and return in investing?",
                    "options": [
                        "Higher risk always means higher returns",
                        "There is no relationship",
                        "Higher potential returns typically require accepting higher risk",
                        "Lower risk always means higher returns"
                    ],
                    "correct": "C",
                    "explanation": "While not guaranteed, investments with higher potential returns generally come with higher risk."
                }
            ],
            "intermediate": [
                {
                    "question": "What is the primary benefit of diversification?",
                    "options": [
                        "Higher returns",
                        "Lower fees",
                        "Reduced overall risk",
                        "Faster growth"
                    ],
                    "correct": "C",
                    "explanation": "Diversification helps reduce risk by spreading investments across different assets that don't move together."
                },
                {
                    "question": "Dollar-cost averaging involves:",
                    "options": [
                        "Buying all investments at once",
                        "Investing the same amount regularly regardless of market conditions",
                        "Only buying when prices are low",
                        "Selling when prices are high"
                    ],
                    "correct": "B",
                    "explanation": "Dollar-cost averaging means investing a fixed amount regularly, which can help smooth out market volatility."
                }
            ]
        },
        "risk_management": {
            "beginner": [
                {
                    "question": "What is the most effective way to manage investment risk?",
                    "options": [
                        "Buying only one stock",
                        "Diversification across different investments",
                        "Trying to time the market",
                        "Using only savings accounts"
                    ],
                    "correct": "B",
                    "explanation": "Diversification across different types of investments is the most reliable way to reduce overall portfolio risk."
                },
                {
                    "question": "What does 'risk tolerance' refer to?",
                    "options": [
                        "Your ability to predict market movements",
                        "Your comfort level with the possibility of losing money",
                        "The amount of money you have to invest",
                        "The number of stocks you own"
                    ],
                    "correct": "B",
                    "explanation": "Risk tolerance is your emotional and financial ability to handle potential investment losses."
                }
            ]
        },
        "retirement_planning": {
            "beginner": [
                {
                    "question": "What is the main advantage of a 401(k) plan?",
                    "options": [
                        "Guaranteed returns",
                        "No contribution limits",
                        "Tax advantages and potential employer matching",
                        "No early withdrawal penalties"
                    ],
                    "correct": "C",
                    "explanation": "401(k) plans offer tax benefits and many employers provide matching contributions, which is free money."
                },
                {
                    "question": "When should you start saving for retirement?",
                    "options": [
                        "When you turn 40",
                        "As soon as you have a steady income",
                        "Only after buying a house",
                        "When you get a promotion"
                    ],
                    "correct": "B",
                    "explanation": "The earlier you start, the more time compound growth has to work in your favor."
                }
            ]
        }
    }
    
    # Get questions for the topic and difficulty, with fallbacks
    questions = quiz_bank.get(topic, {}).get(difficulty, [])
    
    # If no specific questions exist, create generic ones
    if not questions:
        questions = [
            {
                "question": f"Which of the following is most important when learning about {topic.replace('_', ' ')}?",
                "options": [
                    "Understanding the basic concepts",
                    "Memorizing complex formulas", 
                    "Following market predictions",
                    "Avoiding all risks"
                ],
                "correct": "A",
                "explanation": f"Understanding fundamental concepts is the foundation of learning {topic.replace('_', ' ')}."
            }
        ]
    
    return questions

# Keep all the other existing functions (process_content_requests, send_content_response, get_database_info, etc.)
# but update them to return JSON where appropriate

def get_database_info(user_id: str) -> str:
    """Retrieves database statistics and content delivery agent specific information for debugging."""
    try:
        stats = db.get_database_stats()
        
        # Get user-specific data
        learning_path = db.get_user_learning_path(user_id)
        progress_data = db.get_user_progress(user_id)
        
        response_data = {
            "status": "success",
            "data": {
                "system_stats": {
                    "total_users": stats.get('total_users', 0),
                    "total_learning_paths": stats.get('total_learning_paths', 0),
                    "total_progress_entries": stats.get('total_progress_entries', 0)
                },
                "user_data": {
                    "learning_path_exists": learning_path is not None,
                    "modules_available": len(learning_path['path_data'].get('modules', [])) if learning_path else 0,
                    "progress_entries": len(progress_data) if progress_data else 0
                },
                "database_info": "financial_literacy.db"
            }
        }
        
        return json.dumps(response_data)
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error retrieving database info: {str(e)}",
            "data": None
        })

# Also update the check_assessment_status function that was added earlier
def check_assessment_status(user_id: str) -> str:
    """Checks if user has completed their initial assessment and has a learning path."""
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

def process_content_requests(user_id: str) -> str:
    """Reads and processes incoming content requests from other agents via A2A communication."""
    try:
        # Get latest content request from progress agent
        request = db.get_latest_handoff(user_id, "content_delivery_agent")
        
        if not request:
            return json.dumps({
                "status": "no_requests",
                "message": "No content requests found from other agents.",
                "data": None
            })
        
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
            return json.dumps({
                "status": "error",
                "message": f"Unknown request type: {request_type}",
                "data": None
            })
        
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
            return json.dumps({
                "status": "success",
                "message": f"Content request processed and response sent. Request type: {request_type}",
                "data": {"request_type": request_type, "content_delivered": True}
            })
        else:
            return json.dumps({
                "status": "error",
                "message": "Error sending content response back to progress agent.",
                "data": None
            })
            
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error processing content requests: {str(e)}",
            "data": None
        })

def send_content_response(user_id: str, content_type: str, module_number: int, step_number: int = 1) -> str:
    """Manually sends content response to progress agent for specific requests."""
    try:
        # Generate content based on type
        if content_type == "module":
            content = get_module_content(user_id, module_number)
        elif content_type == "step":
            content = get_lesson_step(user_id, module_number, step_number)
        elif content_type == "quiz":
            content = get_quiz_questions(user_id, module_number)
        else:
            return json.dumps({
                "status": "error",
                "message": f"Invalid content type: {content_type}. Use 'module', 'step', or 'quiz'",
                "data": None
            })
        
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
            return json.dumps({
                "status": "success",
                "message": f"Content sent to progress agent: {content_type} for module {module_number}",
                "data": {
                    "content_type": content_type,
                    "module_number": module_number,
                    "step_number": step_number
                }
            })
        else:
            return json.dumps({
                "status": "error", 
                "message": "Error sending content to progress agent.",
                "data": None
            })
            
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": f"Error sending content response: {str(e)}",
            "data": None
        })