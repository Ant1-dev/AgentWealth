// src/environments/environment.prod.ts (Production)
export const environment = {
  production: true,
  agentServices: {
    assessmentAgent: 'https://your-api.herokuapp.com/assessment',
    planningAgent: 'https://your-api.herokuapp.com/planning',
    progressAgent: 'https://your-api.herokuapp.com/progress', 
    contentDeliveryAgent: 'https://your-api.herokuapp.com/content'
  },
  auth0: {
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin
  }
};