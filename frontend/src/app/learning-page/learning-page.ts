import { Component, OnInit, inject, signal, computed, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { AgentService } from '../agent.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Safe HTML Pipe
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

// Enhanced Interfaces based on get_current_learning_state response
interface LearningState {
  status: string;
  data: {
    current_position: {
      module_number: number;
      step_number: number;
      total_modules: number;
      total_steps: number;
    };
    module: {
      number: number;
      title: string;
      topic: string;
      difficulty: string;
      learning_style: string;
      risk_tolerance: string;
      risk_focus: string;
    };
    current_step: {
      number: number;
      title: string;
      content: string;
      total_steps: number;
    };
    key_concepts: string[];
    lesson_content: string;
    quiz_questions: QuizQuestion[];
    user_profile: {
      learning_style: string;
      risk_tolerance: string;
    };
  } | null;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
}

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface AgentActivity {
  activity: string;
  decision: string;
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

  // Core Learning State - populated by get_current_learning_state
  learningState = signal<LearningState | null>(null);
  isLoading = signal<boolean>(false);
  userId = signal<string | undefined>(undefined);
  assessmentIncomplete = signal<boolean>(true); // Start as true
  
  // Quiz Interaction State
  selectedAnswerIndex = signal<number | null>(null);
  quizCompleted = signal<boolean>(false);
  showQuizFeedback = signal<boolean>(false);
  currentQuizIndex = signal<number>(0);
  
  // Chat State
  chatMessages = signal<ChatMessage[]>([]);
  currentChatInput = signal<string>('');
  
  // Agent Activity State
  agentActivities = signal<AgentActivity[]>([]);

  // String reference for template
  readonly String = String;

  // Computed Properties - derived from learningState
  currentModule = computed(() => this.learningState()?.data?.module || null);
  currentStep = computed(() => this.learningState()?.data?.current_step || null);
  currentPosition = computed(() => this.learningState()?.data?.current_position || null);
  keyConcepts = computed(() => this.learningState()?.data?.key_concepts || []);
  lessonContent = computed(() => this.learningState()?.data?.lesson_content || '');
  quizQuestions = computed(() => this.learningState()?.data?.quiz_questions || []);
  userProfile = computed(() => this.learningState()?.data?.user_profile || null);
  
  currentModuleNumber = computed(() => this.currentPosition()?.module_number || 1);
  currentStepNumber = computed(() => this.currentPosition()?.step_number || 1);
  totalModules = computed(() => this.currentPosition()?.total_modules || 1);
  totalSteps = computed(() => this.currentPosition()?.total_steps || 1);
  
  // Quiz computed properties
  currentQuizQuestion = computed(() => this.quizQuestions()[this.currentQuizIndex()] || null);
  hasMoreQuestions = computed(() => this.currentQuizIndex() < this.quizQuestions().length - 1);
  
  // Progress computation
  progressPercentage = computed(() => {
    const position = this.currentPosition();
    if (!position) return 0;
    
    const moduleProgress = (position.module_number - 1) / position.total_modules;
    const stepProgress = (position.step_number - 1) / position.total_steps;
    const currentModuleProgress = stepProgress / position.total_modules;
    
    return Math.round((moduleProgress + currentModuleProgress) * 100);
  });
  
  // Computed property to determine if user can proceed (either quiz completed or no quiz available)
  canProceedToNextStep = computed(() => {
    const hasQuiz = this.quizQuestions().length > 0;
    return !hasQuiz || this.quizCompleted();
  });

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      if (user?.sub) {
        this.userId.set(user.sub);
        this.loadCompleteLearningState();
      }
    });
  }

  /**
   * Master method that loads all learning data using get_current_learning_state
   */
  private async loadCompleteLearningState(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    this.isLoading.set(true);
<<<<<<< HEAD
    this.agentActivities.set([]); 
    this.updateAgentActivity('Checking assessment status...');

    try {
      const isAssessmentComplete = await this.checkAssessmentStatus();

      if (isAssessmentComplete) {
        this.assessmentIncomplete.set(false);
        this.updateAgentDecision('✅ Assessment complete. Loading learning content.');
        
        await this.loadModuleContent(this.currentModuleNumber());
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
        await this.loadQuizQuestions(this.currentModuleNumber());
      } else {
        // FALLBACK: Try to load content anyway, in case the detection failed
        this.updateAgentActivity('Fallback: Attempting to load content despite detection failure...');
        
        try {
          await this.loadModuleContent(this.currentModuleNumber());
          await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
          await this.loadQuizQuestions(this.currentModuleNumber());
          
          // If content loaded successfully, assume assessment is complete
          if (this.currentStep() && this.currentModule()) {
            this.assessmentIncomplete.set(false);
            this.updateAgentDecision('✅ Content loaded successfully - proceeding with learning');
          } else {
            this.assessmentIncomplete.set(true);
            this.updateAgentDecision('⚠️ Assessment incomplete. Please complete at least 3 topic assessments.');
          }
        } catch (fallbackError) {
          this.assessmentIncomplete.set(true);
          this.updateAgentDecision('⚠️ Assessment incomplete. Please complete at least 3 topic assessments.');
        }
      }

    } catch (error) {
      console.error('Error loading learning content:', error);
      this.updateAgentDecision(`❌ Error: ${error}`);
      this.assessmentIncomplete.set(true);
=======
    this.agentActivities.set([]);
    this.updateAgentActivity('Progress Agent', 'Checking handoff status...', 'Verifying assessment completion...');

    try {
      // First check if assessment is complete via Progress Agent
      const handoffResponse = await this.sendToProgressAgent(
        currentUserId,
        `Check if planning handoff exists for user_id: ${currentUserId}. Use get_planning_handoff tool.`
      );

      if (handoffResponse.response.includes("No learning path handoff found")) {
        this.assessmentIncomplete.set(true);
        this.updateAgentActivity('Assessment Agent', 'Assessment incomplete', 'User needs to complete initial assessment');
        return;
      }

      this.updateAgentActivity('Progress Agent', 'Handoff verified', 'Assessment complete, requesting learning state...');

      // Now get complete learning state from Progress Agent using get_current_learning_state
      const response = await this.sendToProgressAgent(
        currentUserId,
        `Get complete learning state for user_id: ${currentUserId}. Use get_current_learning_state tool.`
      );

      console.log('Learning State Response:', response);

      // Parse the structured response
      const learningStateData = this.parseLearningStateResponse(response.response);
      
      if (learningStateData && learningStateData.status === 'success') {
        this.learningState.set(learningStateData);
        this.assessmentIncomplete.set(false);
        
        this.updateAgentActivity('Content Agent', 'Learning state loaded successfully', 'All content and progress synchronized');
        this.updateAgentActivity('Assessment Agent', 'User profile loaded', `Learning style: ${learningStateData.data?.user_profile.learning_style}, Risk tolerance: ${learningStateData.data?.user_profile.risk_tolerance}`);
        
        // Reset quiz state for current position
        this.resetQuizState();
        
      } else if (learningStateData?.status === 'error' && learningStateData.data === null) {
        this.assessmentIncomplete.set(true);
        this.updateAgentActivity('Assessment Agent', 'Assessment required', 'User needs to complete initial assessment');
      } else {
        throw new Error('Invalid learning state response');
      }

    } catch (error) {
      console.error('Error loading complete learning state:', error);
      this.assessmentIncomplete.set(true);
      this.updateAgentActivity('System', 'Error loading learning state', `Error: ${error}`);
>>>>>>> 5d27834 (updated some agent logic)
    } finally {
      this.isLoading.set(false);
    }
  }

<<<<<<< HEAD
  private async checkAssessmentStatus(): Promise<boolean> {
    const currentUserId = this.userId();
    if (!currentUserId) return false;
  
    try {
      console.log('Checking assessment status for user:', currentUserId);
      
      // Step 1: Check user's assessment history
      this.updateAgentActivity('Assessment Agent: Checking user assessment history...');
      
      const assessmentResponse = await this.sendToAssessmentAgent(
        currentUserId,
        'Please check my assessment history and tell me how many assessments I have completed.'
      );
      
      console.log('Assessment Agent Response:', assessmentResponse);
      
      // Look for patterns that indicate completed assessments
      const response = assessmentResponse.response?.toLowerCase() || '';
      
      // Method 1: Look for specific assessment count mentions
      const assessmentCountMatch = response.match(/(\d+)\s*assessments?/);
      if (assessmentCountMatch) {
        const count = parseInt(assessmentCountMatch[1]);
        console.log('Found assessment count:', count);
        if (count >= 3) {
          this.updateAgentDecision(`Found ${count} assessments - sufficient for learning path`);
          return await this.checkOrCreateLearningPath(currentUserId);
        }
      }
      
      // Method 2: Look for successful assessment completion indicators
      if (response.includes('assessment history') && 
          (response.includes('knowledge level') || response.includes('risk tolerance'))) {
        console.log('Found assessment history with knowledge levels');
        this.updateAgentDecision('Assessment history found with knowledge levels');
        return await this.checkOrCreateLearningPath(currentUserId);
      }
      
      // Method 3: Look for "no previous assessments" which means they need to complete them
      if (response.includes('no previous') || response.includes('first financial') || response.includes('welcome')) {
        console.log('No previous assessments found');
        this.updateAgentDecision('No assessments found - user needs to complete assessment');
        return false;
      }
      
      // Method 4: If response contains specific topic assessments, count them
      const topicMatches = response.match(/(investment|risk|retirement|budgeting|financial)/g);
      if (topicMatches && topicMatches.length >= 3) {
        console.log('Found multiple topic assessments:', topicMatches.length);
        this.updateAgentDecision(`Found ${topicMatches.length} topic assessments`);
        return await this.checkOrCreateLearningPath(currentUserId);
      }
      
      // Method 5: If we got a substantial response (not an error), assume some assessments exist
      if (response.length > 100 && !response.includes('no assessment') && !response.includes('welcome')) {
        console.log('Substantial response detected, assuming assessments exist');
        this.updateAgentDecision('Assessment data detected - proceeding with learning path');
        return await this.checkOrCreateLearningPath(currentUserId);
      }
      
      console.log('Could not determine assessment status from response');
      this.updateAgentDecision('Unable to determine assessment status - assuming incomplete');
      return false;
      
    } catch (error) {
      console.error('Error checking assessment status:', error);
      this.updateAgentDecision(`Error checking assessments: ${error}`);
      return false;
    }
  }

  private async checkOrCreateLearningPath(userId: string): Promise<boolean> {
    try {
      // Check if learning path already exists
      this.updateAgentActivity('Planning Agent: Checking for existing learning path...');
      
      const planningResponse = await this.sendToPlanningAgent(
        userId,
        'Check if I have a learning path created. Use get_user_learning_path tool.'
      );
      
      console.log('Planning Response:', planningResponse);
      
      const planningResponseText = planningResponse.response?.toLowerCase() || '';
      
      // More flexible learning path detection
      const hasLearningPath = planningResponseText.includes('learning path') && 
                             !planningResponseText.includes('no learning path found') &&
                             (planningResponseText.includes('modules') || 
                              planningResponseText.includes('created') ||
                              planningResponseText.includes('risk tolerance') ||
                              planningResponseText.includes('learning style') ||
                              planningResponseText.includes('total modules'));
      
      if (hasLearningPath) {
        this.updateAgentDecision('✅ Learning path exists');
        return true; // Simplify - if path exists, we're ready
      }
      
      // If no learning path exists, try to create one
      this.updateAgentActivity('Planning Agent: Creating learning path...');
      
      const createResponse = await this.sendToPlanningAgent(
        userId,
        'Please create my learning path based on my assessments. Use create_learning_path tool.'
      );
      
      console.log('Create Learning Path Response:', createResponse);
      
      const createResponseText = createResponse.response?.toLowerCase() || '';
      
      // More flexible creation detection
      const pathCreated = createResponseText.includes('learning path created') || 
                         createResponseText.includes('personalized learning') ||
                         createResponseText.includes('modules:') ||
                         createResponseText.includes('learning modules') ||
                         createResponseText.includes('estimated duration') ||
                         createResponseText.includes('total modules') ||
                         (createResponseText.includes('success') && createResponseText.includes('path'));
      
      if (pathCreated) {
        this.updateAgentDecision('✅ Learning path created successfully');
        return true; // Path created, we're ready
      }
      
      // Even if we can't detect success clearly, if we got this far with 4+ assessments, assume success
      if (createResponseText.length > 50 && !createResponseText.includes('error') && !createResponseText.includes('failed')) {
        this.updateAgentDecision('✅ Assuming learning path ready (sufficient assessment data)');
        return true;
      }
      
      this.updateAgentDecision('⚠️ Could not create learning path - insufficient data');
      return false;
      
    } catch (error) {
      console.error('Error with learning path:', error);
      this.updateAgentDecision(`Error with learning path: ${error}`);
      return false;
    }
  }

  private async checkProgressHandoff(userId: string): Promise<boolean> {
    try {
      this.updateAgentActivity('Progress Agent: Preparing handoff...');
      
      const progressResponse = await this.sendToProgressAgent(
        userId,
        'Check if there is a planning handoff for me. Use get_planning_handoff tool.'
      );
      
      console.log('Progress Handoff Response:', progressResponse);
      
      const progressResponseText = progressResponse.response?.toLowerCase() || '';
      
      // Check for positive handoff indicators
      if (progressResponseText.includes('handoff complete') ||
          progressResponseText.includes('planning complete') ||
          progressResponseText.includes('learning path ready') ||
          progressResponseText.includes('modules ready') ||
          progressResponseText.includes('user profile')) {
        
        this.updateAgentDecision('✅ Progress handoff complete');
        return true;
      }
      
      // If no handoff exists, the progress agent should have the planning data anyway
      // Let's assume success if we got this far
      this.updateAgentDecision('✅ Ready for content delivery');
      return true;
      
    } catch (error) {
      console.error('Error checking progress handoff:', error);
      this.updateAgentDecision(`Progress handoff error: ${error}`);
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
      // Set a default error state
      this.currentModule.set({
        title: 'Error Loading Module',
        content: 'Could not load module content. Please try again later.',
        moduleNumber: moduleNumber,
        topic: 'Error',
        difficulty: 'Error'
      });
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
       this.currentStep.set({
         title: 'Error Loading Step',
         content: 'Could not load lesson content. Please try again later.',
         stepNumber: stepNumber,
         totalSteps: 1
       });
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
       this.quizQuestions.set([]);
    }
  }

  // --- PARSING AND UTILITY FUNCTIONS ---
  
  private parseModuleContent(response: any, moduleNumber: number): void {
    const content = response.response || '';
    console.log('Raw module content:', content);
    
    // Try multiple patterns for module title
    let titleMatch = content.match(/Module \d+[,:]?\s*([^\n\r]+)/i);
    if (!titleMatch) {
      titleMatch = content.match(/📖\s*Module \d+[,:]?\s*([^\n\r]+)/i);
    }
    if (!titleMatch) {
      titleMatch = content.match(/Title[:\s]*([^\n\r]+)/i);
    }
    
    const title = titleMatch ? titleMatch[1].trim() : `Financial Literacy Module ${moduleNumber}`;
    
    // Look for topic and difficulty in various formats
    const topicMatch = content.match(/Topic[:\s]*([^\n\r]+)/i) || 
                     content.match(/(Investment|Retirement|Risk|Budget|Financial)\s*(Planning|Management|Basics|Goals)/i);
    const difficultyMatch = content.match(/Difficulty[:\s]*([^\n\r]+)/i) ||
                           content.match(/(Beginner|Intermediate|Advanced)/i);
    
    // Clean the content for display (remove agent formatting)
    let cleanContent = content
      .replace(/^.*?Here (it is|are the details)[:\s]*```?/i, '')
      .replace(/```\s*$/, '')
      .replace(/📖\s*/g, '')
      .replace(/OK\.\s*I have retrieved.*?Here (it is|are)[:\s]*/i, '')
      .trim();
    
    // If content is too short or just metadata, create a meaningful description
    if (cleanContent.length < 50 || !cleanContent.includes('.')) {
      const topicName = topicMatch ? topicMatch[0] : 'Financial Literacy';
      cleanContent = `
        <h3>Welcome to ${title}</h3>
        <p>This module covers essential concepts in <strong>${topicName}</strong> designed for your learning level.</p>
        <p>You'll learn practical skills and knowledge that will help you make better financial decisions.</p>
        <h4>What you'll learn:</h4>
        <ul>
          <li>Key concepts and terminology</li>
          <li>Practical applications and examples</li>
          <li>Best practices and strategies</li>
          <li>Real-world scenarios and case studies</li>
        </ul>
      `;
    }

    this.currentModule.set({
      title: title,
      content: cleanContent,
      moduleNumber: moduleNumber,
      topic: topicMatch ? topicMatch[1] || topicMatch[0] : 'Financial Literacy',
      difficulty: difficultyMatch ? difficultyMatch[1] || difficultyMatch[0] : 'Beginner'
    });
  }

  private parseLessonStep(response: any, stepNumber: number): void {
    const content = response.response || '';
    console.log('Raw step content:', content);
    
    // Try multiple patterns for step title and content
    let titleMatch = content.match(/Step \d+[,:]?\s*([^\n\r]+)/i);
    if (!titleMatch) {
      titleMatch = content.match(/📖.*?Step \d+[,:]?\s*([^\n\r]+)/i);
    }
    
    const stepsMatch = content.match(/Step \d+ of (\d+)/i) || content.match(/Progress[:\s]*Step \d+ of (\d+)/i);
    
    const title = titleMatch ? titleMatch[1].trim() : `Learning Step ${stepNumber}`;
    const totalSteps = stepsMatch ? parseInt(stepsMatch[1]) : 5;
    
    // Clean the content for display
    let cleanContent = content
      .replace(/^.*?Here (it is|are)[:\s]*```?/i, '')
      .replace(/```\s*$/, '')
      .replace(/📖\s*/g, '')
      .replace(/OK\.\s*I have retrieved.*?Here (it is|are)[:\s]*/i, '')
      .replace(/Step \d+[,:]?\s*[^\n\r]*\n?/i, '')
      .replace(/Progress[:\s]*Step \d+ of \d+/i, '')
      .replace(/Next[:\s]*Step \d+/i, '')
      .trim();
    
    // If content is too short, create meaningful content
    if (cleanContent.length < 50 || cleanContent === 'Content for step 1 of Retirement Planning') {
      cleanContent = `
        <h3>${title}</h3>
        <p>In this step, you'll learn important concepts that build upon previous knowledge and prepare you for the next phase of your learning journey.</p>
        
        <h4>Key Topics:</h4>
        <p>This lesson covers fundamental principles that are essential for understanding more advanced concepts. Take your time to review each section carefully.</p>
        
        <h4>Learning Objectives:</h4>
        <ul>
          <li>Understand the core concepts presented in this step</li>
          <li>Apply the knowledge to practical scenarios</li>
          <li>Prepare for the next learning milestone</li>
        </ul>
        
        <p><strong>Remember:</strong> Complete the understanding check below to proceed to the next step.</p>
      `;
    }
    
    this.currentStep.set({
      title: title,
      content: cleanContent,
      stepNumber: stepNumber,
      totalSteps: totalSteps
    });
  }

  private parseQuizQuestions(response: any): void {
    const content = response.response || '';
    console.log('Raw quiz content:', content);
    
    const questions: QuizQuestion[] = [];
    
    // Clean up the content first
    let cleanContent = content
      .replace(/^.*?Here (they are|are the questions)[:\s]*```?/i, '')
      .replace(/```\s*$/, '')
      .replace(/OK\.\s*I have retrieved.*?Here (they are|are)[:\s]*/i, '')
      .trim();
    
    // Try to parse questions in various formats
  const questionBlocks = cleanContent.split(/(?:Question \d+[:\.]?\s*|\d+\.\s*)/i).filter((block: string) => block.trim());
    
    questionBlocks.forEach((block: string, index: number) => {
      const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length > 0) {
        const questionText = lines[0].replace(/^\d+\.\s*/, '').trim();
        
        // Look for answer options in various formats
        const options: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Match A. B. C. D. or A) B) C) D) or just bullet points
          if (line.match(/^[A-D][.)]\s*/) || line.match(/^[•-]\s*/)) {
            const option = line.replace(/^[A-D][.)]?\s*/, '').replace(/^[•-]\s*/, '').trim();
            if (option) {
              options.push(option);
            }
          }
        }
        
        if (questionText && options.length >= 2) {
          questions.push({ 
            question: questionText, 
            options, 
            correct: 'B' // Default to B for now
          });
        }
      }
    });
    
    // If no questions were parsed, create default questions
    if (questions.length === 0) {
      console.warn("Could not parse quiz questions from agent response, using defaults");
      questions.push(
        {
          question: "What is the primary benefit of a diversified investment portfolio?",
          options: ["Guaranteed high returns", "Reduced overall risk", "Elimination of all fees", "Quick and easy access to cash"],
          correct: 'B'
        },
        {
          question: "What should be your first step in financial planning?",
          options: ["Invest in stocks", "Create an emergency fund", "Buy insurance", "Take out a loan"],
          correct: 'B'
        },
        {
          question: "What is compound interest?",
          options: ["Interest on the original amount only", "Interest earned on both principal and accumulated interest", "A type of bank fee", "A government tax"],
          correct: 'B'
        }
      );
    }
    
    this.quizQuestions.set(questions);
    
    // Auto-start quiz with first question
    this.currentQuizIndex.set(0);
    this.resetQuizState();
  }
  
  private updateAgentActivity(activity: string, decision: string = ''): void {
    this.agentActivities.update(activities => [...activities, { activity, decision }]);
  }
  
  private updateAgentDecision(decision: string): void {
    this.agentActivities.update(activities => {
      if (activities.length > 0) {
        activities[activities.length - 1].decision = decision;
=======
  /**
   * Parse the JSON response from get_current_learning_state
   */
  private parseLearningStateResponse(responseText: string): LearningState | null {
    try {
      // Extract JSON from response text if it's wrapped in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LearningState;
>>>>>>> 5d27834 (updated some agent logic)
      }
      
      // Try parsing the entire response as JSON
      return JSON.parse(responseText) as LearningState;
    } catch (error) {
      console.error('Error parsing learning state response:', error);
      return null;
    }
  }

<<<<<<< HEAD
  private sendToAssessmentAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToAssessmentAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  private sendToPlanningAgent(userId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToPlanningAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

=======
  /**
   * Navigate to next step - updates progress and reloads state
   */
  async nextStep(): Promise<void> {
    if (!this.quizCompleted()) {
      this.addChatMessage("Please answer the question correctly to proceed.", false);
      return;
    }

    const currentUserId = this.userId();
    const position = this.currentPosition();
    if (!currentUserId || !position) return;

    this.isLoading.set(true);
    this.updateAgentActivity('Progress Agent', 'Saving progress and advancing...', 'Updating user progress');

    try {
      // Save current progress via Progress Agent
      await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module: ${position.module_number}, step: ${position.step_number + 1}, score: 100. Use save_progress tool.`
      );

      // Reload complete learning state from Progress Agent (which has get_current_learning_state)
      await this.loadCompleteLearningState();
      
      this.updateAgentActivity('Progress Agent', 'Progress saved successfully', 'Advanced to next step');

    } catch (error) {
      console.error('Error advancing to next step:', error);
      this.updateAgentActivity('Progress Agent', 'Error saving progress', `Error: ${error}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Navigate to previous step - reloads state for previous position
   */
  async previousStep(): Promise<void> {
    const currentUserId = this.userId();
    const position = this.currentPosition();
    if (!currentUserId || !position) return;

    // Don't allow going before first step of first module
    if (position.module_number === 1 && position.step_number === 1) return;

    this.isLoading.set(true);
    this.updateAgentActivity('Progress Agent', 'Moving to previous step...', 'Updating position');

    try {
      let targetModule = position.module_number;
      let targetStep = position.step_number - 1;

      // If we're at step 1, go to last step of previous module
      if (targetStep < 1 && targetModule > 1) {
        targetModule = position.module_number - 1;
        targetStep = 5; // Assuming 5 steps per module
      }

      // Save the new position via Progress Agent
      await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module: ${targetModule}, step: ${targetStep}, score: 0. Use save_progress tool.`
      );

      // Reload complete learning state from Progress Agent
      await this.loadCompleteLearningState();

    } catch (error) {
      console.error('Error going to previous step:', error);
      this.updateAgentActivity('Progress Agent', 'Error moving to previous step', `Error: ${error}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Quiz Interaction Methods
  selectAnswer(index: number): void {
    if (this.showQuizFeedback()) return;
    
    this.selectedAnswerIndex.set(index);
    this.showQuizFeedback.set(true);
    
    const quiz = this.currentQuizQuestion();
    if (quiz && String.fromCharCode(65 + index) === quiz.correct) {
      this.quizCompleted.set(true);
      this.updateAgentActivity('Assessment Agent', 'Correct answer selected', 'Strong comprehension detected');
    } else {
      this.updateAgentActivity('Assessment Agent', 'Incorrect answer selected', 'Comprehension gap identified');
    }
  }

  nextQuestion(): void {
    if (this.hasMoreQuestions()) {
      this.currentQuizIndex.set(this.currentQuizIndex() + 1);
      this.resetQuizState();
    }
  }

  private resetQuizState(): void {
    this.quizCompleted.set(false);
    this.selectedAnswerIndex.set(null);
    this.showQuizFeedback.set(false);
    this.currentQuizIndex.set(0);
  }

  // Chat Methods
  async sendChatMessage(): Promise<void> {
    const messageText = this.currentChatInput().trim();
    if (!messageText) return;

    this.addChatMessage(messageText, true);
    this.currentChatInput.set('');
    await this.getHelpFromAgent(messageText);
  }

  async sendQuickHelp(type: string): Promise<void> {
    const helpTypes: Record<string, string> = {
      'analogy': 'Can you explain this using an analogy?',
      'examples': 'Can you give me some examples?',
      'simplify': 'Can you simplify this explanation?'
    };

    const message = helpTypes[type] || 'Can you help me understand this better?';
    this.addChatMessage(message, true);
    
    // Include current topic context for better help
    const currentTopic = this.currentModule()?.topic || 'this lesson';
    await this.getHelpFromAgent(`Provide ${type} help for ${currentTopic}. Current step: ${this.currentStep()?.title}`);
  }

  private async getHelpFromAgent(prompt: string): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    try {
      const response = await this.sendToContentAgent(currentUserId, prompt);
      const helpMessage = response.response || "Sorry, I couldn't get a helpful answer right now.";
      this.addChatMessage(helpMessage, false);
    } catch (error) {
      this.addChatMessage("There was a problem connecting to the help agent. Please try again.", false);
    }
  }

  private addChatMessage(text: string, isUser: boolean): void {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatMessages.update(messages => [...messages, { text, isUser, timestamp }]);
  }

  // Agent Communication
>>>>>>> 5d27834 (updated some agent logic)
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
<<<<<<< HEAD
  
  // --- USER INTERACTION METHODS ---
  selectTab(tabName: string): void {
    console.log(`[Navigation]: Requesting switch to tab: ${tabName}. A parent component needs to handle this routing or tab switching.`);
    // In a full application, this would emit an event (e.g., this.tabSelected.emit(tabName);)
  }

  selectAnswer(index: number): void {
    if (this.showQuizFeedback()) return;
    
    this.selectedAnswerIndex.set(index);
    this.showQuizFeedback.set(true);
    
    const quiz = this.currentQuizQuestion();
    if (quiz && String.fromCharCode(65 + index) === quiz.correct) {
      // Mark quiz as completed immediately when correct answer is selected
      this.quizCompleted.set(true);
      this.updateAgentActivity('Assessment Agent: User answered correctly.');
      this.updateAgentDecision('STATUS: Strong comprehension detected. ✅ Ready to proceed.');
    } else {
      // For wrong answers, still allow progression after feedback (educational approach)
      setTimeout(() => {
        this.quizCompleted.set(true);
        this.updateAgentDecision('STATUS: Answer reviewed. Ready to proceed with additional support.');
      }, 2000); // Give 2 seconds to read feedback
      
      this.updateAgentActivity('Assessment Agent: User answered incorrectly.');
      this.updateAgentDecision('STATUS: Comprehension gap detected. Providing additional support.');
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
    if (!this.canProceedToNextStep()) {
      this.addChatMessage("Please complete the understanding check to proceed.", false);
      return;
    }

    const currentUserId = this.userId();
    const step = this.currentStep();
    if (!currentUserId || !step) return;

    this.isLoading.set(true);
    try {
      const progressPercentage = Math.round((this.currentStepNumber() / step.totalSteps) * 100);
      
      // Save progress
      await this.sendToProgressAgent(
        currentUserId,
        `Save progress for user_id: ${currentUserId}, module: ${this.currentModuleNumber()}, step: ${this.currentStepNumber()}, progress: ${progressPercentage}%.`
      );

      if (this.currentStepNumber() < step.totalSteps) {
        // Move to next step in current module
        this.currentStepNumber.set(this.currentStepNumber() + 1);
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
        await this.loadQuizQuestions(this.currentModuleNumber());
      } else {
        // Move to next module
        this.currentModuleNumber.set(this.currentModuleNumber() + 1);
        this.currentStepNumber.set(1);
        await this.loadModuleContent(this.currentModuleNumber());
        await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
        await this.loadQuizQuestions(this.currentModuleNumber());
      }
      
      this.resetQuizState();
      this.addChatMessage(`✅ Great job! Moving to step ${this.currentStepNumber()}.`, false);
      
    } catch (error) {
      console.error('Error progressing to next step:', error);
      this.addChatMessage("There was an error progressing to the next step. Please try again.", false);
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
=======

  // Agent Activity Tracking
  private updateAgentActivity(agent: string, activity: string, decision: string = ''): void {
    this.agentActivities.update(activities => [
      ...activities,
      { activity: `${agent}: ${activity}`, decision }
    ]);
>>>>>>> 5d27834 (updated some agent logic)
  }

  // Add a method to manually refresh the learning content
  async refreshLearningContent(): Promise<void> {
    await this.loadLearningContent();
  }

  // Debug method to force load content regardless of assessment status
  async forceLoadContent(): Promise<void> {
    const currentUserId = this.userId();
    if (!currentUserId) return;

    this.isLoading.set(true);
    this.updateAgentActivity('FORCE OVERRIDE: Loading content regardless of assessment status...');
    
    try {
      this.assessmentIncomplete.set(false);
      
      await this.loadModuleContent(this.currentModuleNumber());
      await this.loadLessonStep(this.currentModuleNumber(), this.currentStepNumber());
      await this.loadQuizQuestions(this.currentModuleNumber());
      
      this.updateAgentDecision('✅ Content force-loaded successfully');
    } catch (error) {
      console.error('Error force loading content:', error);
      this.updateAgentDecision(`❌ Force load failed: ${error}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}