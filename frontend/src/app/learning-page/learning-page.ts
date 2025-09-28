// src/app/learning-page/learning-page.ts
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

interface LearningModule {
  title: string;
  topic: string;
  difficulty: string;
}

interface LearningStep {
  title: string;
  content: string;
  totalSteps: number;
}

@Component({
  selector: 'app-learning-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './learning-page.html',
  styleUrls: ['./learning-page.css']
})
export class LearningPage {
  // Make String available to template
  readonly String = String;

  // Learning content signals
  currentModule = signal<LearningModule>({
    title: 'Introduction to Smart Investing',
    topic: 'Investment Basics',
    difficulty: 'Beginner'
  });

  currentStep = signal<LearningStep>({
    title: 'Why Invest Your Money?',
    content: `
      <p>Investing helps your money grow over time through the power of compound interest.</p>
      <p>Key benefits of investing:</p>
      <ul>
        <li><strong>Beat inflation:</strong> Keep your purchasing power</li>
        <li><strong>Build wealth:</strong> Grow your money for future goals</li>
        <li><strong>Financial freedom:</strong> Create passive income streams</li>
      </ul>
      <p>Even small amounts invested regularly can lead to significant wealth over time.</p>
    `,
    totalSteps: 5
  });

  // Quiz data with multiple questions per step
  allQuizQuestions = signal<QuizQuestion[][]>([
    // Step 1 questions
    [
      {
        question: "What is the main benefit of investing your money instead of keeping it in a regular savings account?",
        options: [
          "Your money is completely safe from any loss",
          "You can beat inflation and potentially grow wealth over time",
          "You get immediate access to large returns",
          "Banks pay you bonus interest for investing"
        ],
        correct: "B"
      },
      {
        question: "What does compound interest mean?",
        options: [
          "Interest paid only once per year",
          "Interest calculated on the original amount only",
          "Interest earned on both principal and previously earned interest",
          "Interest that decreases over time"
        ],
        correct: "C"
      }
    ],
    // Step 2 questions
    [
      {
        question: "What is the relationship between risk and return in investing?",
        options: [
          "Higher risk always guarantees higher returns",
          "Lower risk investments always lose money",
          "Generally, higher risk investments offer potential for higher returns",
          "Risk and return are completely unrelated"
        ],
        correct: "C"
      }
    ],
    // Step 3 questions
    [
      {
        question: "Why are ETFs recommended for beginning investors?",
        options: [
          "They guarantee profits with no risk",
          "They offer instant diversification with low fees",
          "They only invest in the safest companies",
          "They automatically time the market for you"
        ],
        correct: "B"
      }
    ]
  ]);

  // Navigation signals
  currentStepNumber = signal<number>(1);
  currentModuleNumber = signal<number>(1);
  currentQuestionIndex = signal<number>(0);

  // Quiz state signals
  selectedAnswerIndex = signal<number | null>(null);
  showQuizFeedback = signal<boolean>(false);
  quizCompleted = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  // Chat signals
  chatMessages = signal<ChatMessage[]>([
    {
      text: "Hi! I'm here to help you understand this lesson. Feel free to ask any questions!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  currentChatInput = signal<string>('');

  // Agent activities
  agentActivities = signal<Array<{activity: string, decision: string}>>([
    { activity: 'Content Agent: Loading personalized learning materials...', decision: 'STATUS: Module content ready' },
    { activity: 'Progress Agent: Tracking comprehension signals...', decision: 'STATUS: Monitoring quiz performance' },
    { activity: 'Assessment Agent: Adapting difficulty...', decision: 'STATUS: Ready to provide contextual help' }
  ]);

  // Computed properties
  progressPercentage = computed(() => {
    const current = this.currentStepNumber();
    const total = this.currentStep().totalSteps;
    return Math.round((current / total) * 100);
  });

  currentQuizQuestion = computed(() => {
    const stepIndex = this.currentStepNumber() - 1;
    const questionIndex = this.currentQuestionIndex();
    const questionsForStep = this.allQuizQuestions()[stepIndex];
    
    if (questionsForStep && questionIndex < questionsForStep.length) {
      return questionsForStep[questionIndex];
    }
    return null;
  });

  hasMoreQuestions = computed(() => {
    const stepIndex = this.currentStepNumber() - 1;
    const questionIndex = this.currentQuestionIndex();
    const questionsForStep = this.allQuizQuestions()[stepIndex];
    
    return questionsForStep && questionIndex < questionsForStep.length - 1;
  });

  // Quiz methods
  selectAnswer(index: number): void {
    this.selectedAnswerIndex.set(index);
    this.showQuizFeedback.set(true);
    
    const quiz = this.currentQuizQuestion();
    if (quiz) {
      const selectedLetter = String.fromCharCode(65 + index);
      const isCorrect = selectedLetter === quiz.correct;
      this.quizCompleted.set(isCorrect);
      
      // Update agent activity
      this.updateAgentActivity(
        isCorrect ? 'Assessment Agent: Strong comprehension detected' : 'Assessment Agent: Additional support may be needed',
        isCorrect ? 'RESULT: Concept understood well' : 'RESULT: Review recommended'
      );
    }
  }

  nextQuestion(): void {
    if (this.hasMoreQuestions()) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
      this.resetQuizState();
    }
  }

  // Navigation methods
  nextStep(): void {
    if (!this.quizCompleted()) {
      return;
    }

    const currentStep = this.currentStepNumber();
    const totalSteps = this.currentStep().totalSteps;

    if (currentStep < totalSteps) {
      // Move to next step
      this.currentStepNumber.set(currentStep + 1);
      this.updateStepContent();
    } else {
      // Move to next module
      this.currentModuleNumber.set(this.currentModuleNumber() + 1);
      this.currentStepNumber.set(1);
      this.updateModuleContent();
    }

    this.resetQuizState();
    this.currentQuestionIndex.set(0);
  }

  previousStep(): void {
    const currentStep = this.currentStepNumber();
    
    if (currentStep > 1) {
      this.currentStepNumber.set(currentStep - 1);
      this.updateStepContent();
      this.resetQuizState();
      this.currentQuestionIndex.set(0);
    }
  }

  // Chat methods
  sendChatMessage(): void {
    const message = this.currentChatInput().trim();
    if (!message) return;

    // Add user message
    this.addChatMessage(message, true);
    this.currentChatInput.set('');

    // Simulate agent response
    setTimeout(() => {
      const response = this.generateAgentResponse(message);
      this.addChatMessage(response, false);
    }, 1000);
  }

  sendQuickHelp(type: 'analogy' | 'examples' | 'simplify'): void {
    const quickMessages = {
      analogy: "Can you explain this with an analogy?",
      examples: "Can you give me some examples?",
      simplify: "Can you simplify this explanation?"
    };

    this.addChatMessage(quickMessages[type], true);

    setTimeout(() => {
      const response = this.generateQuickHelpResponse(type);
      this.addChatMessage(response, false);
    }, 1000);
  }

  // Helper methods
  private addChatMessage(text: string, isUser: boolean): void {
    const newMessage: ChatMessage = {
      text,
      isUser,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    this.chatMessages.set([...this.chatMessages(), newMessage]);
  }

  private generateAgentResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('invest') || message.includes('money')) {
      return "Investing is about putting your money to work for you! Think of it like planting seeds - you invest time and money now to grow something bigger for the future.";
    }
    
    if (message.includes('risk')) {
      return "Risk in investing means the chance that you might lose some money, but it also comes with the potential for higher returns. It's like choosing between a safe path and a potentially rewarding adventure!";
    }
    
    if (message.includes('etf')) {
      return "An ETF is like a fruit basket - instead of buying just one apple (one stock), you get a whole basket with many different fruits (many different stocks). This spreads out your risk!";
    }
    
    return "That's a great question! The key concept here is that small, consistent actions in investing can lead to significant long-term growth. What specific part would you like me to explain further?";
  }

  private generateQuickHelpResponse(type: 'analogy' | 'examples' | 'simplify'): string {
    const currentStepTitle = this.currentStep().title;
    
    switch (type) {
      case 'analogy':
        return "Think of investing like planting a garden. You plant seeds (invest money), water them regularly (add more money over time), and eventually you harvest much more than you planted!";
        
      case 'examples':
        return "For example: If you invest $100 per month for 30 years at 7% annual return, you'd have contributed $36,000 but your account would be worth over $100,000! That's the power of compound growth.";
        
      case 'simplify':
        return "Simple version: Put money into investments → Money grows over time → You end up with more money than you started with. The key is starting early and being patient!";
        
      default:
        return "I'm here to help you understand any part of this lesson. Feel free to ask specific questions!";
    }
  }

  private updateStepContent(): void {
    const stepNumber = this.currentStepNumber();
    
    const stepContent = {
      1: {
        title: 'Why Invest Your Money?',
        content: `
          <p>Investing helps your money grow over time through the power of compound interest.</p>
          <p>Key benefits of investing:</p>
          <ul>
            <li><strong>Beat inflation:</strong> Keep your purchasing power</li>
            <li><strong>Build wealth:</strong> Grow your money for future goals</li>
            <li><strong>Financial freedom:</strong> Create passive income streams</li>
          </ul>
          <p>Even small amounts invested regularly can lead to significant wealth over time.</p>
        `
      },
      2: {
        title: 'Understanding Risk vs. Return',
        content: `
          <p>All investments carry some level of risk, but higher risk often means higher potential returns.</p>
          <p>Investment risk levels:</p>
          <ul>
            <li><strong>Low Risk:</strong> Savings accounts, CDs (1-3% return)</li>
            <li><strong>Medium Risk:</strong> Bonds, balanced funds (4-7% return)</li>
            <li><strong>Higher Risk:</strong> Stocks, growth funds (7-10%+ return)</li>
          </ul>
          <p>Diversification helps manage risk by spreading investments across different asset types.</p>
        `
      },
      3: {
        title: 'Getting Started with ETFs',
        content: `
          <p>Exchange-Traded Funds (ETFs) are perfect for beginners because they offer instant diversification.</p>
          <p>Why ETFs are great for new investors:</p>
          <ul>
            <li><strong>Low fees:</strong> Most charge less than 0.1% annually</li>
            <li><strong>Diversification:</strong> Own hundreds of stocks in one fund</li>
            <li><strong>Easy to buy:</strong> Trade like individual stocks</li>
            <li><strong>Transparency:</strong> You know exactly what you own</li>
          </ul>
          <p>Popular beginner ETFs: VTI (Total Stock Market), VOO (S&P 500), VXUS (International)</p>
        `
      }
    };

    const stepData = stepContent[stepNumber as keyof typeof stepContent];
    if (stepData) {
      this.currentStep.set({
        title: stepData.title,
        content: stepData.content,
        totalSteps: 5
      });
    }
  }

  private updateModuleContent(): void {
    // This would load the next module - for now just update the title
    this.currentModule.set({
      title: 'Advanced Investment Strategies',
      topic: 'Portfolio Management',
      difficulty: 'Intermediate'
    });
  }

  private resetQuizState(): void {
    this.selectedAnswerIndex.set(null);
    this.showQuizFeedback.set(false);
    this.quizCompleted.set(false);
  }

  private updateAgentActivity(activity: string, decision: string): void {
    const activities = this.agentActivities();
    const newActivity = { activity, decision };
    this.agentActivities.set([newActivity, ...activities.slice(0, 2)]);
  }
}