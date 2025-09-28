// src/app/agent.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface AgentResponse {
  response: string;
  status: 'success' | 'error';
  data?: any;
}

export interface ADKRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: {
    text: string;
  };
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
    const body: ADKRequest = {
      appName: "assessment_agent",
      userId: userId,
      sessionId: "session_" + userId.substring(0, 8),
      newMessage: {
        text: message
      }
    };

    return this.http.post<any>(`${this.agentUrls.assessmentAgent}/run`, body)
      .pipe(
        map(response => ({
          response: response.response || response.text || JSON.stringify(response),
          status: 'success' as const,
          data: response
        })),
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
    const body: ADKRequest = {
      appName: "planning_agent_a2a",
      userId: userId,
      sessionId: "session_" + userId.substring(0, 8),
      newMessage: {
        text: message
      }
    };

    return this.http.post<any>(`${this.agentUrls.planningAgent}/run`, body)
      .pipe(
        map(response => ({
          response: response.response || response.text || JSON.stringify(response),
          status: 'success' as const,
          data: response
        })),
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
    const body: ADKRequest = {
      appName: "progress_agent_a2a",
      userId: userId,
      sessionId: "session_" + userId.substring(0, 8),
      newMessage: {
        text: message
      }
    };

    return this.http.post<any>(`${this.agentUrls.progressAgent}/run`, body)
      .pipe(
        map(response => ({
          response: response.response || response.text || JSON.stringify(response),
          status: 'success' as const,
          data: response
        })),
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
    const body: ADKRequest = {
      appName: "content_delivery_agent_a2a",
      userId: userId,
      sessionId: "session_" + userId.substring(0, 8),
      newMessage: {
        text: message
      }
    };

    return this.http.post<any>(`${this.agentUrls.contentDeliveryAgent}/run`, body)
      .pipe(
        map(response => ({
          response: response.response || response.text || JSON.stringify(response),
          status: 'success' as const,
          data: response
        })),
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
    const body: ADKRequest = {
      appName: agentType.replace('Agent', '_agent'),
      userId: userId,
      sessionId: "session_" + userId.substring(0, 8),
      newMessage: {
        text: message
      }
    };

    const agentUrl = this.agentUrls[agentType];
    
    return this.http.post<any>(`${agentUrl}/run`, body)
      .pipe(
        map(response => ({
          response: response.response || response.text || JSON.stringify(response),
          status: 'success' as const,
          data: response
        })),
        catchError(error => {
          console.error(`${agentType} Error:`, error);
          return of({
            response: 'Agent is currently unavailable.',
            status: 'error' as const
          });
        })
      );
  }
}