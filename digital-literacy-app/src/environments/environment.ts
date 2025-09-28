// src/environments/environment.ts (Development)
export const environment = {
  production: false,
  agentServices: {
    assessmentAgent: 'http://localhost:8000',
    planningAgent: 'http://localhost:8001', 
    progressAgent: 'http://localhost:8002',
    contentDeliveryAgent: 'http://localhost:8003'
  },
  auth0: {
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin
  }
};