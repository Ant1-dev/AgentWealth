import { Component, OnInit, inject, signal, computed, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { AgentService } from '../agent.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Define the pipe directly in this file to avoid creating a new file
@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

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

interface ChatMessage {
    text: string;
    isUser: boolean;
    timestamp: string;
}

@Component({
  selector: 'app-learning-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './learning-page.html',
  styleUrls: ['./learning-page.css']
})
export class LearningPage implements OnInit {
  private auth = inject(AuthService);
  private agentService = inject(AgentService);

  // State Signals
  currentModule = signal<LearningModule | null>(null);
  currentStep = signal<LearningStep | null>(null);
  quizQuestions = signal<QuizQuestion[]>([]);
  currentQuizIndex = signal<number>(0);
  selectedAnswerIndex = signal<number | null>(null);
  quizCompleted = signal<boolean>(false);
  showQuizFeedback = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  userId = signal<string | undefined>(undefined);
  assessmentIncomplete = signal<boolean>(false);
  
  // Chat State
  chatMessages = signal<ChatMessage[]>([]);
  currentChatInput = signal<string>('');
  
  // Agent Activity State
  agentActivities = signal<Array<{activity: string, decision: string}>>([]);

  // Progress State
  currentModuleNumber = signal<number>(1);
  currentStepNumber = signal<number>(1);
  readonly String = String;

  // Computed properties
  currentQuizQuestion = computed(() => this.quizQuestions()[this.currentQuizIndex()] || null);
  hasMoreQuestions = computed(() => this.currentQuizIndex() < this.quizQuestions().length - 1);
  progressPercentage = computed(() => {
    const step = this.currentStep();
    return step ? Math.round((this.currentStepNumber() / step.totalSteps) * 100) : 0;
  });

  ngOnInit(): void {
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
    this.agentActivities.set([]); 
    this.updateAgentActivity('Progress Agent: Checking for handoff from Planning Agent...');

    try {
      const isAssessmentComplete = await this.checkProgressHandoff();

      if (isAssessmentComplete) {
        this.assessmentIncomplete.set(false);
        this.updateAgentDecision('RESULT: Assessment complete. Proceeding to load content.');
        
        await this.loadModuleContent(this.currentModuleNumber());
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
        await this.loadQuizQuestions(this.currentModuleNumber());
      } else {
        this.assessmentIncomplete.set(true);
        this.updateAgentDecision('RESULT: Assessment incomplete. Please complete the initial assessment.');
      }

    } catch (error) {
      console.error('Error loading learning content:', error);
      this.updateAgentDecision(`ERROR: ${error}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async checkProgressHandoff(): Promise<boolean> {
    const currentUserId = this.userId();
    if (!currentUserId) return false;

    try {
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Check if a planning handoff exists for user_id: ${currentUserId}. Use the get_planning_handoff tool.`
      );
      return !response.response.includes("No learning path handoff found");
    } catch (error) {
      console.error('Error checking progress handoff:', error);
      return false;
    }
  }

  private async loadModuleContent(moduleNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    this.updateAgentActivity(`Content Agent: Requesting Module ${moduleNumber}...`);
    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get module content for user_id: ${currentUserId}, module_number: ${moduleNumber}.`
      );
      this.parseModuleContent(response, moduleNumber);
      this.updateAgentDecision('RESULT: Module content loaded.');
    } catch (error) {
      console.error(`Error loading module ${moduleNumber} content:`, error);
      this.updateAgentDecision(`ERROR: ${error}`);
    }
  }

  private async loadLessonStep(moduleNumber: number, stepNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    this.updateAgentActivity(`Content Agent: Requesting Step ${stepNumber} for Module ${moduleNumber}...`);
    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get lesson step for user_id: ${currentUserId}, module_number: ${moduleNumber}, step_number: ${stepNumber}.`
      );
      this.parseLessonStep(response, stepNumber);
      this.updateAgentDecision('RESULT: Step content loaded.');
    } catch (error) {
      console.error(`Error loading lesson step ${stepNumber}:`, error);
       this.updateAgentDecision(`ERROR: ${error}`);
    }
  }

  private async loadQuizQuestions(moduleNumber: number): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;
    this.updateAgentActivity(`Content Agent: Requesting Quiz for Module ${moduleNumber}...`);
    try {
      const response = await this.sendToContentAgent(
        currentUserId,
        `Get quiz questions for user_id: ${currentUserId}, module_number: ${moduleNumber}.`
      );
      this.parseQuizQuestions(response);
       this.updateAgentDecision('RESULT: Quiz loaded.');
    } catch (error) {
      console.error(`Error loading quiz for module ${moduleNumber}:`, error);
       this.updateAgentDecision(`ERROR: ${error}`);
    }
  }

  // --- PARSING AND UTILITY FUNCTIONS ---
  
  private parseModuleContent(response: any, moduleNumber: number): void {
    const content = response.response || '';
    const titleMatch = content.match(/Module \d+:\s*([^\n]+)/);
    const title = titleMatch ? titleMatch[1] : `Module ${moduleNumber}`;
    const topicMatch = content.match(/Topic:\s*([^\n]+)/);
    const difficultyMatch = content.match(/Difficulty:\s*([^\n]+)/);
    
    this.currentModule.set({
      title: title.trim(),
      content: content,
      moduleNumber: moduleNumber,
      topic: topicMatch ? topicMatch[1].trim() : 'Financial Literacy',
      difficulty: difficultyMatch ? difficultyMatch[1].trim() : 'Beginner'
    });
  }

  private parseLessonStep(response: any, stepNumber: number): void {
    const content = response.response || '';
    const titleMatch = content.match(/Step \d+:\s*([^\n]+)/);
    const stepsMatch = content.match(/Step \d+ of (\d+)/);
    
    this.currentStep.set({
      title: titleMatch ? titleMatch[1].trim() : `Learning Step ${stepNumber}`,
      content: content,
      stepNumber: stepNumber,
      totalSteps: stepsMatch ? parseInt(stepsMatch[1]) : 5
    });
  }

  private parseQuizQuestions(response: any): void {
    const content = response.response || '';
    const questions: QuizQuestion[] = [];
    const qParts = content.split(/Question \d+:/).filter((p: string) => p.trim() !== '');

    qParts.forEach((part: string) => {
        const lines = part.trim().split('\n');
        const questionText = lines[0].trim();
        const options = lines.slice(1).map((l: string) => l.replace(/^[A-D]\.\s*/, '').trim()).filter((o: string) => o);
        if (questionText && options.length >= 2) {
             questions.push({ question: questionText, options, correct: 'B' }); // Placeholder
        }
    });
    
    if (questions.length === 0) {
      questions.push({
        question: "What is the primary benefit of a diversified investment portfolio?",
        options: ["Guaranteed high returns", "Reduced overall risk", "Elimination of all fees", "Quick and easy access to cash"],
        correct: 'B'
      });
    }
    this.quizQuestions.set(questions);
  }
  
  private updateAgentActivity(activity: string, decision: string = ''): void {
    this.agentActivities.update(activities => [...activities, { activity, decision }]);
  }
  
  private updateAgentDecision(decision: string): void {
    this.agentActivities.update(activities => {
      if (activities.length > 0) {
        activities[activities.length - 1].decision = decision;
      }
      return [...activities];
    });
  }

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
  
  // --- USER INTERACTION METHODS ---

  selectAnswer(index: number): void {
    if (this.showQuizFeedback()) return;
    this.selectedAnswerIndex.set(index);
    this.showQuizFeedback.set(true);
    
    const quiz = this.currentQuizQuestion();
    if (quiz && String.fromCharCode(65 + index) === quiz.correct) {
      this.quizCompleted.set(true);
      // FIX: Corrected this call to use the proper logging format
      this.updateAgentActivity('Assessment Agent: User answered correctly.');
      this.updateAgentDecision('STATUS: Strong comprehension detected.');
    } else {
      // FIX: Corrected this call to use the proper logging format
      this.updateAgentActivity('Assessment Agent: User answered incorrectly.');
      this.updateAgentDecision('STATUS: Comprehension gap detected.');
    }
  }

  async sendChatMessage(): Promise<void> {
    const messageText = this.currentChatInput().trim();
    if (!messageText) return;

    this.addChatMessage(messageText, true);
    this.currentChatInput.set('');
    await this.getHelpFromAgent(messageText);
  }

  async sendQuickHelp(type: string): Promise<void> {
    const message = `Can you explain this using ${type === 'simplify' ? 'simpler terms' : `an ${type}` }?`;
    this.addChatMessage(message, true);
    await this.getHelpFromAgent(`Provide ${type} help for the current lesson.`);
  }

  private async getHelpFromAgent(prompt: string): Promise<void> {
      const currentUserId = this.userId();
      if (!currentUserId) return;

      try {
        const response = await this.sendToContentAgent(currentUserId, prompt);
        const helpMessage = response.response || "Sorry, I couldn't get a helpful answer for that right now.";
        this.addChatMessage(helpMessage, false);
      } catch (error) {
        this.addChatMessage("There was a problem connecting to the help agent. Please try again.", false);
      }
  }

  private addChatMessage(text: string, isUser: boolean): void {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatMessages.update(messages => [...messages, { text, isUser, timestamp }]);
  }

  async nextStep(): Promise<void> {
    if (!this.quizCompleted()) {
      this.addChatMessage("Please answer the question correctly to proceed.", false);
      return;
    }

    const currentUserId = this.userId();
    const step = this.currentStep();
    if (!currentUserId || !step) return;

    this.isLoading.set(true);
    try {
      const progressPercentage = Math.round((this.currentStepNumber() / step.totalSteps) * 100);
      await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module: ${this.currentModuleNumber()}, step: ${progressPercentage}, score: 100.`
      );

      if (this.currentStepNumber() < step.totalSteps) {
        this.currentStepNumber.set(this.currentStepNumber() + 1);
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
      } else {
        this.currentModuleNumber.set(this.currentModuleNumber() + 1);
        this.currentStepNumber.set(1);
        await this.loadLearningContent();
      }
      this.resetQuizState();
    } catch (error) {
      console.error('Error progressing to next step:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async previousStep(): Promise<void> {
    this.isLoading.set(true);
    try {
        if (this.currentStepNumber() > 1) {
            this.currentStepNumber.set(this.currentStepNumber() - 1);
            await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
        } else if (this.currentModuleNumber() > 1) {
            this.currentModuleNumber.set(this.currentModuleNumber() - 1);
            this.currentStepNumber.set(5); // Assuming a fixed number of steps
            await this.loadLearningContent();
        }
        this.resetQuizState();
    } catch (error) {
        console.error("Error going to previous step:", error);
    } finally {
        this.isLoading.set(false);
    }
  }
  
  private resetQuizState(): void {
      this.quizCompleted.set(false);
      this.selectedAnswerIndex.set(null);
      this.showQuizFeedback.set(false);
      this.currentQuizIndex.set(0);
  }

  nextQuestion(): void {
    if (this.hasMoreQuestions()) {
      this.currentQuizIndex.set(this.currentQuizIndex() + 1);
      this.resetQuizState();
    }
  }
}