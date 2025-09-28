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
    // Get user ID from Auth0
    this.auth.user$.subscribe(user => {
      if (user?.sub) {
        this.userId.set(user.sub);
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
      // Use the agent's get_user_history tool with proper user_id
      const response = await this.sendToAssessmentAgent(
        currentUserId, 
        `Please use get_user_history tool for user_id: ${currentUserId}`
      );
      
      // Update learning modules based on user progress
      this.updateLearningModules(response);
      
      // Update agent status to show real activity
      this.updateAgentWithRealData(response);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading.set(false);
    }
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