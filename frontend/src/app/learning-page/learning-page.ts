// src/app/learning-page/learning-page.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { AgentService } from '../agent.service';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
}

interface LearningModule {
  title: string;
  content: string;
  moduleNumber: number;
  topic: string;
  difficulty: string;
}

interface LearningStep {
  title: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
}

@Component({
  selector: 'app-learning-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-page.html',
  styleUrls: ['./learning-page.css']
})
export class LearningPage implements OnInit {
  private auth = inject(AuthService);
  private agentService = inject(AgentService);

  // Signals for reactive state
  currentModule = signal<LearningModule | null>(null);
  currentStep = signal<LearningStep | null>(null);
  quizQuestions = signal<QuizQuestion[]>([]);
  currentQuizIndex = signal<number>(0);
  selectedAnswerIndex = signal<number | null>(null);
  quizCompleted = signal<boolean>(false);
  showQuizFeedback = signal<boolean>(false);
  isHelpPopupVisible = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  userId = signal<string | undefined>(undefined);
  readonly String = String;
  
  // Learning progress
  currentModuleNumber = signal<number>(1);
  currentStepNumber = signal<number>(1);
  
  // Agent activities - now populated from real agent responses
  agentActivities = signal<Array<{activity: string, decision: string}>>([
    { activity: 'Content Agent: Loading personalized learning materials...', decision: 'STATUS: Waiting for user progress data' },
    { activity: 'Progress Agent: Checking handoff from planning...', decision: 'STATUS: Verifying learning path exists' },
    { activity: 'Assessment Agent: Ready to adapt difficulty...', decision: 'STATUS: Monitoring comprehension signals' }
  ]);

  // Computed properties
  currentQuiz = computed(() => {
    const questions = this.quizQuestions();
    const index = this.currentQuizIndex();
    return questions[index] || null;
  });

  hasMoreQuestions = computed(() => {
    return this.currentQuizIndex() < this.quizQuestions().length - 1;
  });

  progressPercentage = computed(() => {
    const current = this.currentStepNumber();
    const step = this.currentStep();
    if (!step) return 0;
    return Math.round((current / step.totalSteps) * 100);
  });

  ngOnInit(): void {
    // Get user ID and load learning content
    this.auth.user$.subscribe(user => {
      if (user?.sub) {
        this.userId.set(user.sub);
        this.loadLearningContent();
      }
    });
  }

  private async loadLearningContent(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    this.isLoading.set(true);

    try {
      // First, check if progress agent has content ready
      await this.checkProgressHandoff();
      
      // Load current module content
      await this.loadModuleContent(this.currentModuleNumber());
      
      // Load current step within module  
      await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
      
      // Load quiz questions for current module
      await this.loadQuizQuestions(this.currentModuleNumber());

    } catch (error) {
      console.error('Error loading learning content:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async checkProgressHandoff(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Check if planning handoff exists for user_id: ${currentUserId}. Use get_planning_handoff tool.`
      );

      console.log('Progress Handoff Check:', response);

      // Update agent activity with real response
      this.updateAgentActivity('Progress Agent', 'Checking handoff from planning...', response.response?.substring(0, 60) || 'Handoff verified');

    } catch (error) {
      console.error('Error checking progress handoff:', error);
    }
  }

  private async loadModuleContent(moduleNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get module content for user_id: ${currentUserId}, module_number: ${moduleNumber}. Use get_module_content tool.`
      );

      console.log('Module Content Response:', response);

      // Parse module content from agent response
      this.parseModuleContent(response, moduleNumber);

      // Update agent activity
      this.updateAgentActivity('Content Agent', 'Loading personalized learning materials...', 'Module content delivered successfully');

    } catch (error) {
      console.error('Error loading module content:', error);
    }
  }

  private async loadLessonStep(moduleNumber: number, stepNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get lesson step for user_id: ${currentUserId}, module_number: ${moduleNumber}, step_number: ${stepNumber}. Use get_lesson_step tool.`
      );

      console.log('Lesson Step Response:', response);

      // Parse lesson step from agent response
      this.parseLessonStep(response, stepNumber);

    } catch (error) {
      console.error('Error loading lesson step:', error);
    }
  }

  private async loadQuizQuestions(moduleNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get quiz questions for user_id: ${currentUserId}, module_number: ${moduleNumber}. Use get_quiz_questions tool.`
      );

      console.log('Quiz Questions Response:', response);

      // Parse quiz questions from agent response
      this.parseQuizQuestions(response);

    } catch (error) {
      console.error('Error loading quiz questions:', error);
    }
  }

  private parseModuleContent(response: any, moduleNumber: number): void {
    const content = response.response || '';
    
    // Extract module title and content from agent response
    const titleMatch = content.match(/Module \d+:\s*([^\n]+)/);
    const title = titleMatch ? titleMatch[1] : `Financial Learning Module ${moduleNumber}`;
    
    // Extract topic and difficulty if present
    const topicMatch = content.match(/Topic:\s*([^\n]+)/);
    const difficultyMatch = content.match(/Difficulty:\s*([^\n]+)/);
    
    const module: LearningModule = {
      title: title.trim(),
      content: content,
      moduleNumber: moduleNumber,
      topic: topicMatch ? topicMatch[1].trim() : 'Financial Literacy',
      difficulty: difficultyMatch ? difficultyMatch[1].trim() : 'Beginner'
    };

    this.currentModule.set(module);
  }

  private parseLessonStep(response: any, stepNumber: number): void {
    const content = response.response || '';
    
    // Extract step title and total steps
    const titleMatch = content.match(/Step \d+:\s*([^\n]+)/);
    const stepsMatch = content.match(/Step \d+ of (\d+)/);
    
    const step: LearningStep = {
      title: titleMatch ? titleMatch[1] : `Learning Step ${stepNumber}`,
      content: content,
      stepNumber: stepNumber,
      totalSteps: stepsMatch ? parseInt(stepsMatch[1]) : 5
    };

    this.currentStep.set(step);
  }

  private parseQuizQuestions(response: any): void {
    const content = response.response || '';
    const questions: QuizQuestion[] = [];
    
    // Parse quiz questions from agent response
    const lines = content.split('\n');
    let currentQuestion: Partial<QuizQuestion> = {};
    let options: string[] = [];
    
    for (const line of lines) {
      const questionMatch = line.match(/Question \d+:\s*(.+)/);
      const optionMatch = line.match(/([A-D])\.\s*(.+)/);
      
      if (questionMatch) {
        if (currentQuestion.question && options.length > 0) {
          questions.push({
            question: currentQuestion.question,
            options: options,
            correct: 'B' // Default, should be parsed from response
          });
        }
        currentQuestion = { question: questionMatch[1] };
        options = [];
      } else if (optionMatch && currentQuestion.question) {
        options.push(optionMatch[2]);
      }
    }
    
    // Add the last question
    if (currentQuestion.question && options.length > 0) {
      questions.push({
        question: currentQuestion.question,
        options: options,
        correct: 'B'
      });
    }
    
    // Fallback quiz if parsing fails
    if (questions.length === 0) {
      questions.push({
        question: "What is the main benefit of diversifying your investments?",
        options: [
          "Higher guaranteed returns",
          "Reduced overall risk",
          "Lower fees",
          "Faster growth"
        ],
        correct: 'B'
      });
    }

    this.quizQuestions.set(questions);
  }

  private updateAgentActivity(agentName: string, activity: string, decision: string): void {
    const activities = this.agentActivities();
    const updatedActivities = activities.map(item => 
      item.activity.includes(agentName) 
        ? { activity: `${agentName}: ${activity}`, decision: `RESULT: ${decision}` }
        : item
    );
    this.agentActivities.set(updatedActivities);
  }

  // Agent communication methods
  private sendToProgressAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToProgressAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  private sendToContentAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToContentAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  // User interaction methods
  selectAnswer(index: number): void {
    this.selectedAnswerIndex.set(index);
    this.showQuizFeedback.set(true);
    
    const quiz = this.currentQuiz();
    if (quiz) {
      const selectedLetter = String.fromCharCode(65 + index); // Convert to A, B, C, D
      if (selectedLetter === quiz.correct) {
        this.quizCompleted.set(true);
        this.updateAgentActivity('Assessment Agent', 'Monitoring engagement...', 'Correct answer - strong comprehension detected');
      } else {
        this.updateAgentActivity('Assessment Agent', 'Monitoring engagement...', 'Incorrect answer - may need additional support');
      }
    }
  }

  needHelp(): void {
    this.isHelpPopupVisible.set(true);
  }

  closeHelp(): void {
    this.isHelpPopupVisible.set(false);
  }

  async getHelp(type: string): Promise<void> {
    this.closeHelp();
    
    const currentUserId = this.userId();
    if (!currentUserId) return;

    let helpMessage = '';
    
    try {
      // Get contextual help from content agent
      const response = await this.sendToContentAgent(
        currentUserId,
        `Provide ${type} help for current lesson. User needs assistance with comprehension.`
      );
      
      helpMessage = response.response || this.getFallbackHelp(type);
      
    } catch (error) {
      helpMessage = this.getFallbackHelp(type);
    }
    
    alert(helpMessage);
    this.updateAgentActivity('Content Agent', 'Providing contextual help...', `${type} assistance delivered`);
  }

  private getFallbackHelp(type: string): string {
    switch (type) {
      case 'analogy':
        return "Think of investments like planting a garden - some plants grow quickly but might not survive harsh weather, while others grow slowly but are very sturdy!";
      case 'examples':
        return "For example, instead of buying just one company's stock, you could buy an ETF that owns pieces of hundreds of companies, spreading your risk.";
      case 'simplify':
        return "Key point: Don't put all your eggs in one basket. Spread your money across different investments to reduce risk.";
      default:
        return "Remember: investing is a long-term journey. Take your time to understand each concept before moving forward.";
    }
  }

  async nextStep(): Promise<void> {
    if (!this.quizCompleted()) {
      alert('Please complete the understanding check first!');
      return;
    }

    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      // Save progress to progress agent
      const progressResponse = await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module: ${this.currentModuleNumber()}, step: ${this.currentStepNumber()}, score: 100. Use save_progress tool.`
      );

      console.log('Progress Saved:', progressResponse);

      // Move to next step or module
      const step = this.currentStep();
      if (step && this.currentStepNumber() < step.totalSteps) {
        // Next step in current module
        this.currentStepNumber.set(this.currentStepNumber() + 1);
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
      } else {
        // Next module
        this.currentModuleNumber.set(this.currentModuleNumber() + 1);
        this.currentStepNumber.set(1);
        await this.loadModuleContent(this.currentModuleNumber());
        await this.loadLessonStep(this.currentModuleNumber(), 1);
      }

      // Reset quiz state
      this.quizCompleted.set(false);
      this.selectedAnswerIndex.set(null);
      this.showQuizFeedback.set(false);
      this.currentQuizIndex.set(0);

    } catch (error) {
      console.error('Error progressing to next step:', error);
      alert('Error saving progress. Please try again.');
    }
  }

  previousStep(): void {
    if (this.currentStepNumber() > 1) {
      this.currentStepNumber.set(this.currentStepNumber() - 1);
      this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
    } else if (this.currentModuleNumber() > 1) {
      this.currentModuleNumber.set(this.currentModuleNumber() - 1);
      this.currentStepNumber.set(5); // Assume 5 steps per module
      this.loadModuleContent(this.currentModuleNumber());
      this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
    }
  }

  nextQuestion(): void {
    if (this.hasMoreQuestions()) {
      this.currentQuizIndex.set(this.currentQuizIndex() + 1);
      this.selectedAnswerIndex.set(null);
      this.showQuizFeedback.set(false);
    }
  }
}