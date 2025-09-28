// src/app/dashboard/dashboard.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentDashboard } from '../agent-dashboard/agent-dashboard';
import { DigitalFinancialLiteracy } from '../digital-financial-literacy/digital-financial-literacy';
import { LearningPage } from '../learning-page/learning-page';
import { AgentService, AgentResponse } from '../agent.service';
import { environment } from '../../environments/environment';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  agentType?: string;
}

type TabType = 'chat' | 'agent' | 'learning' | 'finance';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AgentDashboard, DigitalFinancialLiteracy, LearningPage],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  // Inject services using modern Angular approach
  public auth = inject(AuthService);
  private agentService = inject(AgentService);

  // Signals for reactive state management
  messages = signal<Message[]>([
    {
      sender: 'ai',
      text: 'Welcome! How can I help you navigate your financial journey today?',
      timestamp: new Date(),
    },
  ]);

  userInput = signal<string>('');
  activeTab = signal<TabType>('chat');
  userId = signal<string | undefined>(undefined);
  isLoading = signal<boolean>(false);

  // Computed properties
  canSendMessage = computed(
    () => this.userInput().trim().length > 0 && this.userId() !== undefined && !this.isLoading()
  );

  ngOnInit(): void {
    // Subscribe to user authentication state
    this.auth.user$.subscribe((user) => {
      if (user?.sub) {
        this.userId.set(user.sub);
      }
    });
  }

  selectTab(tabName: TabType): void {
    this.activeTab.set(tabName);
  }

  async sendMessage(): Promise<void> {
    const currentInput = this.userInput().trim();
    const currentUserId = this.userId();

    if (!currentInput || !currentUserId) return;

    // Add user message immediately
    const userMessage: Message = {
      sender: 'user',
      text: currentInput,
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMessage]);
    this.userInput.set('');
    this.isLoading.set(true);

    try {
      // Send to Assessment Agent by default
      // You can modify this to route to different agents based on conversation context
      const response = await this.sendToAssessmentAgent(currentUserId, currentInput);

      const aiMessage: Message = {
        sender: 'ai',
        text: response.response,
        timestamp: new Date(),
        agentType: 'assessment',
      };

      this.messages.update((msgs) => [...msgs, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        sender: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        agentType: 'error',
      };

      this.messages.update((msgs) => [...msgs, errorMessage]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private sendToAssessmentAgent(userId: string, message: string): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      this.agentService.sendToAssessmentAgent(userId, message).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }

  // Method to route messages to different agents based on context
  private determineAgentType(message: string): keyof typeof environment.agentServices {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('assess') ||
      lowerMessage.includes('evaluate') ||
      lowerMessage.includes('start')
    ) {
      return 'assessmentAgent';
    } else if (
      lowerMessage.includes('plan') ||
      lowerMessage.includes('path') ||
      lowerMessage.includes('curriculum')
    ) {
      return 'planningAgent';
    } else if (
      lowerMessage.includes('progress') ||
      lowerMessage.includes('track') ||
      lowerMessage.includes('continue')
    ) {
      return 'progressAgent';
    } else if (
      lowerMessage.includes('learn') ||
      lowerMessage.includes('content') ||
      lowerMessage.includes('lesson')
    ) {
      return 'contentDeliveryAgent';
    }

    // Default to assessment agent
    return 'assessmentAgent';
  }

  logout(): void {
    this.auth.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  // Helper method for template
  updateUserInput(value: string): void {
    this.userInput.set(value);
  }
}
