import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, NgFor, NgClass, NgIf } from '@angular/common'; // <-- IMPORT CommonModule
import { FormsModule } from '@angular/forms';
import { AgentDashboard } from '../agent-dashboard/agent-dashboard';
import { DigitalFinancialLiteracy } from '../digital-financial-literacy/digital-financial-literacy';
import { LearningPage } from '../learning-page/learning-page';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    NgClass,
    FormsModule,
    AgentDashboard,
    DigitalFinancialLiteracy,
    LearningPage
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  messages: Message[] = [
    { sender: 'ai', text: 'Welcome! How can I help you navigate your financial journey today?' }
  ];
  userInput: string = '';
  activeTab: 'chat' | 'agent' | 'learning' | 'finance' = 'agent';

  constructor(private auth: AuthService) {}

  selectTab(tabName: 'chat' | 'agent' | 'learning' | 'finance'): void {
    this.activeTab = tabName;
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;
    this.messages.push({ sender: 'user', text: this.userInput });
    this.userInput = '';
    setTimeout(() => {
      this.messages.push({ sender: 'ai', text: `I've received your message. Let's explore the Agent Dashboard for insights.` });
    }, 1000);
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}