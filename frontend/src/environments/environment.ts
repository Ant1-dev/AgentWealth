// src/environments/environment.ts (Default - Development)
export const environment = {
  production: false,
  // Use CORS proxy on port 5001, which forwards to ADK agents on 8000-8003
  corsProxy: 'http://localhost:5001',
  agentServices: {
    assessmentAgent: 'http://localhost:5001/assessment', // Proxies to 8000
    planningAgent: 'http://localhost:5001/planning', // Proxies to 8001
    progressAgent: 'http://localhost:5001/progress', // Proxies to 8002
    contentDeliveryAgent: 'http://localhost:5001/content', // Proxies to 8003
  },
  auth0: {
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin,
  },
};
