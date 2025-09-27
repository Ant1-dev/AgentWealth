import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { NgFor, NgClass, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  messages: Message[] = [
    { sender: 'ai', text: 'Welcome! Let’s assess your skills and see where guidance is needed.' }
  ];
  userInput: string = '';

  constructor(private auth: AuthService) {}

  sendMessage(): void {
    if (!this.userInput.trim()) return;
    this.messages.push({ sender: 'user', text: this.userInput });
    const userText = this.userInput;
    this.userInput = '';
    setTimeout(() => {
      this.messages.push({ sender: 'ai', text: `You said: "${userText}". Can you tell me more about your current knowledge?` });
      this.scrollToBottom();
    }, 1000);
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
