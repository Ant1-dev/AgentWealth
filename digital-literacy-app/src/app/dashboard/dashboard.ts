// src/app/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core'; // Import OnInit
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentDashboard } from '../agent-dashboard/agent-dashboard';
import { DigitalFinancialLiteracy } from '../digital-financial-literacy/digital-financial-literacy';
import { LearningPage } from '../learning-page/learning-page';
import { AgentService } from '../agent.service';
import { filter, switchMap, tap } from 'rxjs/operators';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgentDashboard,
    DigitalFinancialLiteracy,
    LearningPage
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit { // Implement OnInit
  messages: Message[] = [
    { sender: 'ai', text: 'Welcome! How can I help you navigate your financial journey today?' }
  ];
  userInput: string = '';
  activeTab: 'chat' | 'agent' | 'learning' | 'finance' = 'chat';
  userId: string | undefined; // Property to store the user ID

  constructor(public auth: AuthService, private agentService: AgentService) {}

  ngOnInit(): void {
    // Subscribe to the user observable to get the unique user ID
    this.auth.user$.subscribe(user => {
      if (user && user.sub) {
        this.userId = user.sub;
      }
    });
  }

  selectTab(tabName: 'chat' | 'agent' | 'learning' | 'finance'): void {
    this.activeTab = tabName;
  }

  sendMessage(): void {
    if (!this.userInput.trim() || !this.userId) return; // Don't send if no userId

    const userMessage = this.userInput;
    this.messages.push({ sender: 'user', text: userMessage });
    this.userInput = '';

    // Use the dynamic userId from the auth service
    this.agentService.sendMessageToAgent(this.userId, userMessage)
      .subscribe((response: any) => {
        this.messages.push({ sender: 'ai', text: response.message });
      }, (error: any) => {
        console.error('Error sending message:', error);
        this.messages.push({ sender: 'ai', text: 'Sorry, I encountered an error. Please try again.' });
      });
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}