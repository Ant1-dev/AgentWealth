// src/app/agent.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private apiUrl = 'http://localhost:5000'; // Backend Flask API URL

  constructor(private http: HttpClient) { }

  /**
   * Sends a user's message to the assessment agent.
   * @param userId A unique identifier for the user.
   * @param response The user's text input.
   * @returns An Observable with the agent's response.
   */
  sendMessageToAgent(userId: string, response: string): Observable<any> {
    const body = { userId, response };
    return this.http.post(`${this.apiUrl}/assess`, body);
  }
}