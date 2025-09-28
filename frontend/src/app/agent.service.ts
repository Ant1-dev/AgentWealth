// src/app/agent.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../environments/environment';

export interface AgentResponse {
  response: string;
  status: 'success' | 'error';
  data?: any;
}

export interface AssessmentRequest {
  message: string;
  user_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private http = inject(HttpClient);
  private readonly agentUrls = environment.agentServices;

  /**
   * Sends a message to the Assessment Agent (ADK format)
   * @param userId - Unique user identifier 
   * @param message - User's message/response
   * @returns Observable with agent's response
   */
  sendToAssessmentAgent(userId: string, message: string): Observable<AgentResponse> {
    const body: AssessmentRequest = {
      message: message,
      user_id: userId
    };

    return this.http.post<AgentResponse>(`${this.agentUrls.assessmentAgent}/run`, body)
      .pipe(
        catchError(error => {
          console.error('Assessment Agent Error:', error);
          return of({
            response: 'Sorry, I encountered an error. Please try again.',
            status: 'error' as const
          });
        })
      );
  }

  /**
   * Sends a message to the Planning Agent
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToPlanningAgent(userId: string, message: string): Observable<AgentResponse> {
    const body: AssessmentRequest = {
      message: message,
      user_id: userId
    };

    return this.http.post<AgentResponse>(`${this.agentUrls.planningAgent}/run`, body)
      .pipe(
        catchError(error => {
          console.error('Planning Agent Error:', error);
          return of({
            response: 'Planning agent is currently unavailable.',
            status: 'error' as const
          });
        })
      );
  }

  /**
   * Sends a message to the Progress Agent
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToProgressAgent(userId: string, message: string): Observable<AgentResponse> {
    const body: AssessmentRequest = {
      message: message,
      user_id: userId
    };

    return this.http.post<AgentResponse>(`${this.agentUrls.progressAgent}/run`, body)
      .pipe(
        catchError(error => {
          console.error('Progress Agent Error:', error);
          return of({
            response: 'Progress tracking is currently unavailable.',
            status: 'error' as const
          });
        })
      );
  }

  /**
   * Sends a message to the Content Delivery Agent
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToContentAgent(userId: string, message: string): Observable<AgentResponse> {
    const body: AssessmentRequest = {
      message: message,
      user_id: userId
    };

    return this.http.post<AgentResponse>(`${this.agentUrls.contentDeliveryAgent}/run`, body)
      .pipe(
        catchError(error => {
          console.error('Content Delivery Agent Error:', error);
          return of({
            response: 'Content delivery is currently unavailable.',
            status: 'error' as const
          });
        })
      );
  }

  /**
   * Generic method to send to any agent
   * @param agentType - Which agent to contact
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToAgent(agentType: keyof typeof environment.agentServices, userId: string, message: string): Observable<AgentResponse> {
    switch(agentType) {
      case 'assessmentAgent':
        return this.sendToAssessmentAgent(userId, message);
      case 'planningAgent':
        return this.sendToPlanningAgent(userId, message);
      case 'progressAgent':
        return this.sendToProgressAgent(userId, message);
      case 'contentDeliveryAgent':
        return this.sendToContentAgent(userId, message);
      default:
        return of({
          response: 'Invalid agent type specified.',
          status: 'error' as const
        });
    }
  }
}