// src/app/agent-dashboard/agent-dashboard.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { AgentService } from '../agent.service';
import { interval } from 'rxjs';

interface AgentStatus {
  name: string;
  status: 'Active' | 'Thinking' | 'Monitoring' | 'Idle';
  task: string;
  decision?: string;
  prediction?: string;
  lastUpdate: Date;
}

interface UserProgress {
  topic: string;
  knowledgeLevel: string;
  confidence: number;
  completed: boolean;
}

interface LearningModule {
  name: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'upcoming';
}

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css']
})
export class AgentDashboard implements OnInit {
  private auth = inject(AuthService);
  private agentService = inject(AgentService);

  // Signals for reactive state management
  agents = signal<AgentStatus[]>([
    {
      name: 'Assessment Agent',
      status: 'Active',
      task: 'Analyzing financial literacy patterns across users...',
      decision: 'Detected beginner level - recommending foundational investment concepts',
      lastUpdate: new Date()
    },
    {
      name: 'Planning Agent', 
      status: 'Thinking',
      task: 'Creating personalized learning curriculum...',
      prediction: 'Optimal learning path: Investment Basics → Risk Management → Portfolio Building',
      lastUpdate: new Date()
    },
    {
      name: 'Progress Agent',
      status: 'Monitoring',
      task: 'Tracking learning progress and engagement...',
      prediction: '85% probability of completing next module within 3 days',
      lastUpdate: new Date()
    },
    {
      name: 'Content Delivery Agent',
      status: 'Active',
      task: 'Preparing personalized financial education content...',
      decision: 'Adapting content for visual learning style with interactive examples',
      lastUpdate: new Date()
    }
  ]);

  userProgress = signal<UserProgress[]>([]);
  learningModules = signal<LearningModule[]>([
    { name: 'Investment Basics', progress: 0, status: 'upcoming' },
    { name: 'Risk Assessment', progress: 0, status: 'upcoming' },
    { name: 'Portfolio Building', progress: 0, status: 'upcoming' },
    { name: 'Retirement Planning', progress: 0, status: 'upcoming' },
    { name: 'Financial Goals', progress: 0, status: 'upcoming' }
  ]);

  learningPlan = signal<any>(null);
  planningInsights = signal<string[]>([]);

  userId = signal<string | undefined>(undefined);
  isLoading = signal<boolean>(false);
  lastUpdateTime = signal<Date>(new Date());

  // Computed properties
  activeAgents = computed(() => 
    this.agents().filter(agent => agent.status === 'Active').length
  );

  completedModules = computed(() =>
    this.learningModules().filter(module => module.status === 'completed').length
  );

  overallProgress = computed(() => {
    const modules = this.learningModules();
    if (modules.length === 0) return 0;
    const totalProgress = modules.reduce((sum, module) => sum + module.progress, 0);
    return Math.round(totalProgress / modules.length);
  });

  ngOnInit(): void {
    // Get user ID from Auth0 and immediately load data
    this.auth.user$.subscribe(user => {
      if (user?.sub) {
        this.userId.set(user.sub);
        console.log('User ID set:', user.sub);
        // Automatically load user data when user ID is available
        this.loadUserData();
      }
    });

    // Update agent activity every 30 seconds
    interval(30000).subscribe(() => {
      this.updateAgentActivity();
    });
  }

  private async loadUserData(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    this.isLoading.set(true);
    
    try {
      // First, check user assessment status
      const assessmentResponse = await this.sendToAssessmentAgent(
        currentUserId, 
        `My user ID is: ${currentUserId}. Please get my assessment history.`
      );
      
      console.log('Assessment Agent Response:', assessmentResponse);
      
      // Update agent status to show real activity
      this.updateAgentWithRealData(assessmentResponse);
      
      // If user has assessments, try to get/create learning plan
      if (assessmentResponse.response && !assessmentResponse.response.includes('no previous assessments')) {
        await this.loadLearningPlan();
      } else {
        // New user - set default insights
        this.planningInsights.set([
          'Complete your first financial assessment to unlock personalized insights',
          'Assessment will analyze your risk tolerance and learning preferences',
          'Your learning path will be customized based on your responses'
        ]);
      }
      
      // Update learning modules based on user progress
      this.updateLearningModules(assessmentResponse);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadLearningPlan(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      // First, check if assessment has been handed off to planning agent
      const handoffResponse = await this.sendToPlanningAgent(
        currentUserId,
        `Check assessment handoff for user_id: ${currentUserId}. Use get_assessment_handoff tool.`
      );

      console.log('Planning Agent Handoff Response:', handoffResponse);

      // Then get or create learning path
      const learningPathResponse = await this.sendToPlanningAgent(
        currentUserId,
        `Get learning path for user_id: ${currentUserId}. Use get_user_learning_path tool.`
      );

      console.log('Learning Path Response:', learningPathResponse);

      // If no learning path exists, create one
      if (learningPathResponse.response && learningPathResponse.response.includes('No learning path found')) {
        const createPathResponse = await this.sendToPlanningAgent(
          currentUserId,
          `Create learning path for user_id: ${currentUserId}. Use create_learning_path tool.`
        );
        
        console.log('Create Path Response:', createPathResponse);
        this.parseLearningPlanResponse(createPathResponse);
      } else {
        this.parseLearningPlanResponse(learningPathResponse);
      }

    } catch (error) {
      console.error('Error loading learning plan:', error);
      this.planningInsights.set([
        'Error loading learning plan - please try refreshing',
        'Planning agent may be unavailable',
        'Contact support if issue persists'
      ]);
    }
  }

  private sendToPlanningAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToPlanningAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  private parseLearningPlanResponse(response: any): void {
    const responseText = response.response || '';
    
    // Extract insights from the planning agent response
    const insights: string[] = [];
    
    if (responseText.includes('Risk Tolerance:')) {
      const riskMatch = responseText.match(/Risk Tolerance:\s*(\w+)/i);
      if (riskMatch) {
        insights.push(`Risk Profile: ${riskMatch[1]} investor with personalized strategies`);
      }
    }
    
    if (responseText.includes('Learning Style:')) {
      const styleMatch = responseText.match(/Learning Style:\s*(\w+)/i);
      if (styleMatch) {
        insights.push(`Learning Approach: ${styleMatch[1]} learning optimized for maximum retention`);
      }
    }
    
    if (responseText.includes('Total Modules:')) {
      const modulesMatch = responseText.match(/Total Modules:\s*(\d+)/i);
      if (modulesMatch) {
        insights.push(`Learning Path: ${modulesMatch[1]} personalized modules designed for your level`);
      }
    }
    
    if (responseText.includes('Estimated Duration:') || responseText.includes('Estimated Time:')) {
      const durationMatch = responseText.match(/Estimated (?:Duration|Time):\s*([^\\n]+)/i);
      if (durationMatch) {
        insights.push(`Timeline: ${durationMatch[1]} to complete your financial education`);
      }
    }
    
    // Add some default insights if we couldn't extract specific ones
    if (insights.length === 0) {
      insights.push(
        'Personalized learning plan created based on your assessment',
        'AI-optimized module sequence for maximum learning efficiency',
        'Progress tracking will adapt difficulty based on your performance'
      );
    }
    
    // Store the full plan data
    this.learningPlan.set(response);
    this.planningInsights.set(insights);
    
    // Update planning agent status
    this.updatePlanningAgentStatus(responseText);
  }

  private updatePlanningAgentStatus(planResponse: string): void {
    const updatedAgents = this.agents().map(agent => {
      if (agent.name === 'Planning Agent') {
        return {
          ...agent,
          status: 'Active' as const,
          task: 'Learning path optimization complete...',
          decision: `Created personalized curriculum: ${planResponse.substring(0, 60)}...`,
          lastUpdate: new Date()
        };
      }
      return agent;
    });
    
    this.agents.set(updatedAgents);
  }

  private sendToAssessmentAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToAssessmentAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  private updateLearningModules(assessmentData: any): void {
    // Mock data - in real implementation, parse assessmentData
    const mockProgress: LearningModule[] = [
      { name: 'Investment Basics', progress: 65, status: 'in-progress' },
      { name: 'Risk Assessment', progress: 100, status: 'completed' },
      { name: 'Portfolio Building', progress: 0, status: 'upcoming' },
      { name: 'Retirement Planning', progress: 0, status: 'upcoming' },
      { name: 'Financial Goals', progress: 0, status: 'upcoming' }
    ];
    
    this.learningModules.set(mockProgress);
  }

  private updateAgentWithRealData(response: any): void {
    const updatedAgents = this.agents().map(agent => {
      if (agent.name === 'Assessment Agent') {
        return {
          ...agent,
          status: 'Active' as const,
          task: 'Processing user assessment history...',
          decision: `Retrieved user data: ${response.response?.substring(0, 50)}...`,
          lastUpdate: new Date()
        };
      }
      return agent;
    });
    
    this.agents.set(updatedAgents);
  }

  private updateAgentActivity(): void {
    const updatedAgents = this.agents().map(agent => {
      // Simulate dynamic agent activity
      const tasks = {
        'Assessment Agent': [
          'Analyzing user financial knowledge patterns...',
          'Evaluating risk tolerance preferences...',
          'Processing assessment responses...'
        ],
        'Planning Agent': [
          'Optimizing learning curriculum sequence...',
          'Adjusting module difficulty levels...',
          'Creating personalized study plans...'
        ],
        'Progress Agent': [
          'Monitoring learning engagement metrics...',
          'Tracking module completion rates...',
          'Analyzing user progress patterns...'
        ],
        'Content Delivery Agent': [
          'Preparing next lesson materials...',
          'Customizing content for learning style...',
          'Generating practice exercises...'
        ]
      };

      const agentTasks = tasks[agent.name as keyof typeof tasks] || [agent.task];
      const randomTask = agentTasks[Math.floor(Math.random() * agentTasks.length)];
      
      return {
        ...agent,
        task: randomTask,
        lastUpdate: new Date()
      };
    });

    this.agents.set(updatedAgents);
    this.lastUpdateTime.set(new Date());
  }

  // Test method to get user history using agent tools
  async testUserHistory(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) {
      console.log('No user ID available');
      return;
    }

    console.log(`Testing with user ID: ${currentUserId}`);
    
    try {
      // Try different approaches to trigger the agent's tools
      const approaches = [
        `Please call get_user_history tool with user_id: ${currentUserId}`,
        `Use the get_user_history function for user ${currentUserId}`,
        `I am user ${currentUserId}, please get my assessment history`,
        `Get user history for ${currentUserId}`
      ];

      for (const message of approaches) {
        console.log(`Trying: ${message}`);
        const response = await this.sendToAssessmentAgent(currentUserId, message);
        console.log('Response:', response);
        
        // If we get a meaningful response, break
        if (response.response && !response.response.includes('need your user ID')) {
          this.updateAgentWithRealData(response);
          break;
        }
      }
      
    } catch (error) {
      console.error('Error testing user history:', error);
    }
  }

  // User actions
  continuelearning(): void {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    // Find next incomplete module
    const nextModule = this.learningModules().find(module => 
      module.status === 'in-progress' || module.status === 'upcoming'
    );

    if (nextModule) {
      console.log(`Starting: ${nextModule.name}`);
      // Navigate to learning interface or trigger agent
    }
  }

  practiceTrading(): void {
    console.log('Opening trading simulator...');
    // Navigate to trading practice component
  }

  viewAllProgress(): void {
    console.log('Viewing detailed progress...');
    // Navigate to detailed progress view
  }

  viewFullPlan(): void {
    const plan = this.learningPlan();
    if (plan) {
      console.log('Full Learning Plan:', plan);
      // Could open a modal or navigate to detailed plan view
      alert('Full learning plan logged to console. Check developer tools to see details.');
    }
  }

  // Utility methods
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  getProgressBarWidth(progress: number): string {
    return `${Math.min(100, Math.max(0, progress))}%`;
  }

  getModuleStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✓';
      case 'in-progress': return '→';
      case 'upcoming': return '○';
      default: return '';
    }
  }

  formatUpdateTime(): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - this.lastUpdateTime().getTime()) / 1000);
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  }
}