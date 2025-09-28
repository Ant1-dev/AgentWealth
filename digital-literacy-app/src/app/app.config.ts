import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideAuth0({
      domain: "dev-r8qggbubba4lsre1.us.auth0.com",
      clientId: "3bCX9c9qij5TpTasl6rsIrG8J4TyJTDA",

      authorizationParams: {
        redirect_uri: window.location.origin
      }
    })
  ]
};
