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

// Complete ADK format - newMessage as object
export interface ADKRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: {
    text: string;
  };
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
    role: string;
  }>;
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
  const body = {
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
    return this.sendToAgent('planningAgent', userId, message);
  }

  /**
   * Sends a message to the Progress Agent
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToProgressAgent(userId: string, message: string): Observable<AgentResponse> {
    return this.sendToAgent('progressAgent', userId, message);
  }

  /**
   * Sends a message to the Content Delivery Agent
   * @param userId - Unique user identifier
   * @param message - User's message
   * @returns Observable with agent's response
   */
  sendToContentAgent(userId: string, message: string): Observable<AgentResponse> {
    return this.sendToAgent('contentDeliveryAgent', userId, message);
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
      },
      contents: [
        {
          parts: [
            {
              text: message
            }
          ],
          role: "user"
        }
      ]
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