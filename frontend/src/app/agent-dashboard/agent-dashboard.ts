// src/app/agent-dashboard/agent-dashboard.ts
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { AgentService } from '../agent.service';
import { interval, Subscription } from 'rxjs';

interface AgentStatus {
  name: string;
  status: 'Active' | 'Thinking' | 'Monitoring' | 'Idle';
  task: string;
  decision?: string;
  prediction?: string;
  lastUpdate: Date;
}

interface LearningModule {
  name: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'upcoming';
  topic?: string;
  difficulty?: string;
  duration?: string;
}

interface DashboardStats {
  activeAgents: number;
  overallProgress: number;
  completedModules: number;
  totalModules: number;
}

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css'],
})
export class AgentDashboard implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private agentService = inject(AgentService);
  private updateSubscription?: Subscription;

  // Core data signals - all populated from agents
  agents = signal<AgentStatus[]>([]);
  learningModules = signal<LearningModule[]>([]);
  dashboardStats = signal<DashboardStats>({
    activeAgents: 4,
    overallProgress: 0,
    completedModules: 0,
    totalModules: 0,
  });
  planningInsights = signal<string[]>([]);
  learningPlan = signal<any>(null);

  // State management signals
  userId = signal<string | undefined>(undefined);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  errorMessage = signal<string>('');
  lastUpdateTime = signal<Date>(new Date());
  isInitialized = signal<boolean>(false);

  // Computed properties - now based on dynamic data
  activeAgents = computed(() => this.dashboardStats().activeAgents);
  completedModules = computed(() => this.dashboardStats().completedModules);
  overallProgress = computed(() => this.dashboardStats().overallProgress);

  ngOnInit(): void {
    this.auth.user$.subscribe((user) => {
      if (user?.sub) {
        this.userId.set(user.sub);
        console.log('User ID set:', user.sub);
        this.initializeDashboard();
      }
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }

  private async initializeDashboard(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    this.isLoading.set(true);
    this.hasError.set(false);

    // Set fallback data immediately for better UX
    this.setFallbackData();

    try {
      // First, orchestrate the agent handoff chain
      console.log('🔄 Starting agent handoff chain...');
      await this.orchestrateAgentHandoffs(currentUserId);

      // Then load all agent data
      await Promise.race([
        this.loadAllAgentData(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Agent loading timeout')), 15000)
        )
      ]);

      this.isInitialized.set(true);
      this.startPeriodicUpdates();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      console.log('Using fallback data for demo purposes');
      this.isInitialized.set(true);
      this.startPeriodicUpdates();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Orchestrates the complete agent handoff chain:
   * 1. Planning Agent gets assessment handoff
   * 2. Planning Agent creates learning path
   * 3. Planning Agent hands off to Progress Agent
   * 4. Progress Agent hands off to Content Agent
   */
  private async orchestrateAgentHandoffs(userId: string): Promise<void> {
    try {
      console.log('📋 Step 1: Planning Agent retrieving assessment handoff...');
      
      // Step 1: Planning Agent gets assessment handoff
      const assessmentHandoff = await this.sendToPlanningAgent(
        userId,
        `Get assessment handoff for user_id: ${userId}. Use get_assessment_handoff tool.`
      );
      
      console.log('Assessment Handoff Response:', assessmentHandoff);

      // Check if assessment exists
      if (assessmentHandoff.response.includes('No assessment handoff found')) {
        console.log('⚠️ No assessment found - user needs to complete assessment first');
        return;
      }

      console.log('✅ Assessment handoff retrieved successfully');
      console.log('🎯 Step 2: Planning Agent creating learning path...');

      // Step 2: Planning Agent creates learning path
      const learningPathResponse = await this.sendToPlanningAgent(
        userId,
        `Create learning path for user_id: ${userId}. Use create_learning_path tool.`
      );

      console.log('Learning Path Creation Response:', learningPathResponse);

      if (learningPathResponse.response.includes('Learning Path Created')) {
        console.log('✅ Learning path created successfully');
        console.log('🚀 Step 3: Planning Agent handing off to Progress Agent...');

        // Step 3: Planning Agent hands off to Progress Agent
        const progressHandoff = await this.sendToPlanningAgent(
          userId,
          `Prepare progress handoff for user_id: ${userId}, message: "Learning path ready for progress tracking". Use prepare_progress_handoff tool.`
        );

        console.log('Progress Handoff Response:', progressHandoff);

        if (progressHandoff.response.includes('Progress Agent Handoff Prepared')) {
          console.log('✅ Progress Agent handoff prepared');
          console.log('📊 Step 4: Progress Agent receiving handoff...');

          // Step 4: Progress Agent receives handoff
          const progressReceive = await this.sendToProgressAgent(
            userId,
            `Get planning handoff for user_id: ${userId}. Use get_planning_handoff tool.`
          );

          console.log('Progress Agent Handoff Reception:', progressReceive);

          if (progressReceive.response.includes('Learning Path Received')) {
            console.log('✅ Progress Agent received handoff successfully');
            console.log('📚 Step 5: Progress Agent handing off to Content Agent...');

            // Step 5: Progress Agent hands off to Content Agent (if you have this tool)
            try {
              const contentHandoff = await this.sendToProgressAgent(
                userId,
                `Prepare content handoff for user_id: ${userId}, message: "User ready for content delivery". Use prepare_content_handoff tool.`
              );

              console.log('Content Agent Handoff Response:', contentHandoff);
              console.log('✅ All agent handoffs completed successfully!');
            } catch (error) {
              console.log('ℹ️ Content handoff tool not available, skipping...');
            }
          }
        }
      } else {
        console.log('⚠️ Learning path creation failed or incomplete');
      }

    } catch (error) {
      console.error('❌ Error in agent handoff chain:', error);
      throw error;
    }
  }

  private setFallbackData(): void {
    this.dashboardStats.set({
      activeAgents: 4,
      overallProgress: 33,
      completedModules: 2,
      totalModules: 6,
    });

    this.learningModules.set([
      { name: 'Investment Basics', progress: 0, status: 'in-progress' },
      { name: 'Risk Assessment', progress: 0, status: 'completed' },
      { name: 'Portfolio Building', progress: 0, status: 'in-progress' },
      { name: 'Retirement Planning', progress: 0, status: 'upcoming' },
      { name: 'Financial Goals', progress: 0, status: 'upcoming' },
      { name: 'Budgeting Fundamentals', progress: 0, status: 'upcoming' },
    ]);

    this.planningInsights.set([
      'Risk Profile: Moderate investor with personalized strategies',
      'Learning Approach: Visual learning optimized for maximum retention',
      'Learning Path: 6 personalized modules designed for your level',
      'Timeline: 8-12 hours to complete your financial education',
    ]);

    this.agents.set([
      {
        name: 'Assessment Agent',
        status: 'Active',
        task: 'Analyzing financial literacy patterns across users...',
        decision: 'Detected beginner level - recommending foundational investment concepts',
        lastUpdate: new Date(),
      },
      {
        name: 'Planning Agent',
        status: 'Thinking',
        task: 'Creating personalized learning curriculum...',
        prediction:
          'Optimal learning path: Investment Basics → Risk Management → Portfolio Building',
        lastUpdate: new Date(),
      },
      {
        name: 'Progress Agent',
        status: 'Monitoring',
        task: 'Tracking learning progress and engagement...',
        prediction: '85% probability of completing next module within 3 days',
        lastUpdate: new Date(),
      },
      {
        name: 'Content Delivery Agent',
        status: 'Active',
        task: 'Preparing personalized financial education content...',
        decision: 'Adapting content for visual learning style with interactive examples',
        lastUpdate: new Date(),
      },
    ]);

    this.learningPlan.set({
      exists: true,
      created: new Date().toISOString(),
      modules: 6,
    });
  }

  private async loadAllAgentData(): Promise<void> {
    const results = await Promise.allSettled([
      this.loadDashboardStats(),
      this.loadLearningModules(),
      this.loadPlanningInsights(),
      this.loadAgentActivities(),
    ]);

    const agentNames = [
      'Dashboard Stats',
      'Learning Modules',
      'Planning Insights',
      'Agent Activities',
    ];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.log(`${agentNames[index]} failed, using fallback data:`, result.reason);
      } else {
        console.log(`${agentNames[index]} loaded successfully`);
      }
    });
  }

  private async loadDashboardStats(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Get dashboard stats for user_id: ${currentUserId}. Use get_dashboard_stats tool.`
      );

      if (response.status === 'success' && response.data) {
        this.dashboardStats.set({
          activeAgents: response.data.active_agents || 4,
          overallProgress: response.data.overall_progress || 0,
          completedModules: response.data.completed_modules || 0,
          totalModules: response.data.total_modules || 0,
        });
      } else {
        const stats = this.parseDashboardStatsFromText(response.response || '');
        this.dashboardStats.set(stats);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  private async loadLearningModules(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Get learning modules for user_id: ${currentUserId}. Use get_learning_modules tool.`
      );

      if (response.status === 'success' && response.data && response.data.modules) {
        const modules: LearningModule[] = response.data.modules.map((module: any) => ({
          name: module.name,
          progress: module.progress || 0,
          status: module.status || 'upcoming',
          topic: module.topic,
          difficulty: module.difficulty,
          duration: module.duration,
        }));

        this.learningModules.set(modules);

        this.dashboardStats.update((stats) => ({
          ...stats,
          totalModules: response.data.total_modules || modules.length,
          completedModules:
            response.data.completed_count || modules.filter((m) => m.status === 'completed').length,
          overallProgress: response.data.overall_progress || stats.overallProgress,
        }));
      } else {
        const modules = this.parseLearningModulesFromText(response.response || '');
        this.learningModules.set(modules);
      }
    } catch (error) {
      console.error('Error loading learning modules:', error);
    }
  }

  private async loadPlanningInsights(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToPlanningAgent(
        currentUserId,
        `Get dashboard insights for user_id: ${currentUserId}. Use get_dashboard_insights tool.`
      );

      if (response.status === 'success' && response.data) {
        this.planningInsights.set(response.data.insights || []);
        this.learningPlan.set(response.data.learning_plan_exists ? response : null);
      } else {
        const insights = this.parsePlanningInsightsFromText(response.response || '');
        this.planningInsights.set(insights);
      }
    } catch (error) {
      console.error('Error loading planning insights:', error);
    }
  }

  private async loadAgentActivities(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToAssessmentAgent(
        currentUserId,
        `Get agent activities for Use get_agent_activities tool.`
      );

      if (response.status === 'success' && response.data && response.data.agents) {
        const agents: AgentStatus[] = response.data.agents.map((agent: any) => ({
          name: agent.name,
          status: agent.status as 'Active' | 'Thinking' | 'Monitoring' | 'Idle',
          task: agent.task,
          decision: agent.decision,
          prediction: agent.prediction,
          lastUpdate: new Date(agent.last_update || Date.now()),
        }));

        this.agents.set(agents);
        this.lastUpdateTime.set(new Date());
      } else {
        const agents = this.parseAgentActivitiesFromText(response.response || '');
        this.agents.set(agents);
      }
    } catch (error) {
      console.error('Error loading agent activities:', error);
    }
  }

  private parseDashboardStatsFromText(text: string): DashboardStats {
    return {
      activeAgents: this.extractNumber(text, /active[_ ]agents?[:\s]*(\d+)/i) || 4,
      overallProgress: this.extractNumber(text, /progress[:\s]*(\d+)/i) || 0,
      completedModules: this.extractNumber(text, /completed[_ ]modules?[:\s]*(\d+)/i) || 0,
      totalModules: this.extractNumber(text, /total[_ ]modules?[:\s]*(\d+)/i) || 0,
    };
  }

  private parseLearningModulesFromText(text: string): LearningModule[] {
    const modules: LearningModule[] = [];
    const moduleMatches = text.match(/(\w+[^:]*?):\s*(\d+)%/g);
    if (moduleMatches) {
      moduleMatches.forEach((match: string) => {
        const parts = match.match(/([^:]+):\s*(\d+)%/);
        if (parts) {
          const progress = parseInt(parts[2]);
          modules.push({
            name: parts[1].trim(),
            progress,
            status: progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'upcoming',
          });
        }
      });
    }
    return modules;
  }

  private parsePlanningInsightsFromText(text: string): string[] {
    const insights: string[] = [];
    if (text.includes('Risk Tolerance:') || text.includes('Risk Profile:')) {
      const riskMatch = text.match(/Risk (?:Tolerance|Profile):\s*([^\n]+)/i);
      if (riskMatch) insights.push(`Risk Profile: ${riskMatch[1].trim()}`);
    }
    if (text.includes('Learning Style:')) {
      const styleMatch = text.match(/Learning Style:\s*([^\n]+)/i);
      if (styleMatch) insights.push(`Learning Approach: ${styleMatch[1].trim()}`);
    }
    if (text.includes('Total Modules:')) {
      const modulesMatch = text.match(/Total Modules:\s*(\d+)/i);
      if (modulesMatch) {
        insights.push(
          `Learning Path: ${modulesMatch[1]} personalized modules designed for your level`
        );
      }
    }
    return insights.length > 0
      ? insights
      : ['Personalized learning plan being created', 'Complete assessment to unlock full insights'];
  }

  private parseAgentActivitiesFromText(_text: string): AgentStatus[] {
    return [];
  }

  private extractNumber(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  private startPeriodicUpdates(): void {
    this.updateSubscription = interval(30000).subscribe(() => {
      if (this.isInitialized()) {
        this.updateAgentActivities();
      }
    });
  }

  private updateAgentActivities(): void {
    const tasks = {
      'Assessment Agent': [
        'Analyzing user financial knowledge patterns...',
        'Evaluating risk tolerance preferences...',
        'Processing assessment responses...',
        'Identifying knowledge gaps...',
      ],
      'Planning Agent': [
        'Optimizing learning curriculum sequence...',
        'Adjusting module difficulty levels...',
        'Creating personalized study plans...',
        'Analyzing learning path effectiveness...',
      ],
      'Progress Agent': [
        'Monitoring learning engagement metrics...',
        'Tracking module completion rates...',
        'Analyzing user progress patterns...',
        'Adapting difficulty based on performance...',
      ],
      'Content Delivery Agent': [
        'Preparing next lesson materials...',
        'Customizing content for learning style...',
        'Generating practice exercises...',
        'Optimizing content delivery sequence...',
      ],
    };

    const currentAgents = this.agents();
    const updatedAgents = currentAgents.map((agent) => {
      const agentTasks = tasks[agent.name as keyof typeof tasks] || [agent.task];
      const randomTask = agentTasks[Math.floor(Math.random() * agentTasks.length)];
      return { ...agent, task: randomTask, lastUpdate: new Date() };
    });

    const agentNames = [
      'Assessment Agent',
      'Planning Agent',
      'Progress Agent',
      'Content Delivery Agent',
    ];
    agentNames.forEach((name) => {
      if (!updatedAgents.find((agent) => agent.name === name)) {
        updatedAgents.push({
          name,
          status: 'Active',
          task: tasks[name as keyof typeof tasks][0],
          lastUpdate: new Date(),
        });
      }
    });

    this.agents.set(updatedAgents);
    this.lastUpdateTime.set(new Date());
  }

  private sendToAssessmentAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToAssessmentAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }

  private sendToPlanningAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToPlanningAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }

  private sendToProgressAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToProgressAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }

  async retryLoadData(): Promise<void> {
    await this.initializeDashboard();
  }

  async continuelearning(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    const nextModule = this.learningModules().find(
      (m) => m.status === 'in-progress' || m.status === 'upcoming'
    );
    if (nextModule) {
      console.log(`Starting: ${nextModule.name}`);
      await this.startLearningModule(nextModule.name);
    }
  }

  async startLearningModule(moduleName: string): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    try {
      const moduleIndex = this.learningModules().findIndex((m) => m.name === moduleName);
      const moduleNumber = moduleIndex + 1;
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Start learning module ${moduleNumber} for user_id: ${currentUserId}. Use start_learning_module tool.`
      );
      console.log('Start Module Response:', response);
      await this.loadLearningModules();
      await this.loadDashboardStats();
    } catch (error) {
      console.error('Error starting learning module:', error);
    }
  }

  async saveProgress(moduleName: string, score: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    try {
      const moduleIndex = this.learningModules().findIndex((m) => m.name === moduleName);
      const moduleNumber = moduleIndex + 1;
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module_number: ${moduleNumber}, step_number: 75, score: ${score}. Use save_progress tool.`
      );
      console.log('Save Progress Response:', response);
      await this.loadLearningModules();
      await this.loadDashboardStats();
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  async completeModule(moduleName: string): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    try {
      const moduleIndex = this.learningModules().findIndex((m) => m.name === moduleName);
      const moduleNumber = moduleIndex + 1;
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Complete module for user_id: ${currentUserId}, module_number: ${moduleNumber}, final_score: 85. Use complete_module tool.`
      );
      console.log('Complete Module Response:', response);
      await Promise.all([
        this.loadLearningModules(),
        this.loadPlanningInsights(),
        this.loadDashboardStats(),
      ]);
    } catch (error) {
      console.error('Error completing module:', error);
    }
  }

  async testUserHistory(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) {
      console.log('No user ID available');
      return;
    }
    console.log(`Testing agent integration with history for user: ${currentUserId}`);
    
    try {
      // First run the complete handoff chain
      console.log('🔄 Running complete agent handoff chain...');
      await this.orchestrateAgentHandoffs(currentUserId);
      
      // Then load all dashboard data
      await Promise.all([
        this.loadAgentActivities(),
        this.loadPlanningInsights(),
        this.loadLearningModules(),
        this.loadDashboardStats()
      ]);
      console.log('Agent data refreshed with history context');
      
      // Debug handoff status
      console.log('🔍 Debugging handoff status...');
      await this.debugHandoffStatus(currentUserId);
      
    } catch (error) {
      console.error('Error testing user history:', error);
    }
  }

  /**
   * Debug method to check the status of all handoffs
   */
  private async debugHandoffStatus(userId: string): Promise<void> {
    try {
      console.log('📋 Checking Assessment → Planning handoff...');
      const assessmentHandoff = await this.sendToPlanningAgent(
        userId,
        `Get assessment handoff for user_id: ${userId}. Use get_assessment_handoff tool.`
      );
      console.log('Assessment handoff status:', assessmentHandoff.response);

      console.log('📚 Checking user learning path...');
      const learningPath = await this.sendToPlanningAgent(
        userId,
        `Get user learning path for user_id: ${userId}. Use get_user_learning_path tool.`
      );
      console.log('Learning path status:', learningPath.response);

      console.log('🚀 Checking Planning → Progress handoff...');
      const progressHandoff = await this.sendToProgressAgent(
        userId,
        `Get planning handoff for user_id: ${userId}. Use get_planning_handoff tool.`
      );
      console.log('Progress handoff status:', progressHandoff.response);

      console.log('📊 Checking database info...');
      const dbInfo = await this.sendToPlanningAgent(
        userId,
        `Get database info for user_id: ${userId}. Use get_database_info tool.`
      );
      console.log('Database info:', dbInfo.response);

    } catch (error) {
      console.error('Error debugging handoff status:', error);
    }
  }

  /**
   * Manual trigger for testing the complete agent handoff chain
   */
  async triggerHandoffChain(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) {
      console.log('No user ID available for handoff chain');
      return;
    }
    
    console.log('🔄 Manually triggering agent handoff chain...');
    try {
      await this.orchestrateAgentHandoffs(currentUserId);
      console.log('✅ Manual handoff chain completed');
      
      // Refresh dashboard data after handoffs
      await this.loadAllAgentData();
      console.log('📊 Dashboard data refreshed');
    } catch (error) {
      console.error('❌ Manual handoff chain failed:', error);
    }
  }

  // Convert progress number (0-100) into a percentage string for CSS width
  getProgressBarWidth(progress: number): string {
    return `${progress}%`;
  }

  // Stub for button action (expand progress view, show modal, etc.)
  viewAllProgress(): void {
    console.log('View all progress clicked');
    // You can later add modal or navigation here
  }

  // Launch practice trading (stub for now)
  practiceTrading(): void {
    console.log('Practice trading clicked');
    // TODO: add routing or modal logic later
  }

  // Fix for your earlier issue: ensure it requires arg
  formatUpdateTime(isoString?: string): string {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Return CSS class based on agent status
  getStatusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'Thinking':
        return 'status-thinking';
      case 'Monitoring':
        return 'status-monitoring';
      case 'Idle':
        return 'status-idle';
      default:
        return 'status-unknown';
    }
  }

  // Return icon name for a module status
  getModuleStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'in-progress':
        return 'hourglass_top';
      case 'not-started':
        return 'radio_button_unchecked';
      default:
        return 'help_outline';
    }
  }
}