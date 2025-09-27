import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Dashboard } from '../dashboard/dashboard';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Dashboard, NgIf],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class Landing {
  isLoggedIn = false;

  constructor(public auth: AuthService) {
    // Auth0 Angular already handles redirect callback internally
    this.auth.isAuthenticated$.subscribe(status => {
      this.isLoggedIn = status;
      console.log('Auth status updated:', status);
    });
  }

  loginOrSignup(): void {
    this.auth.loginWithRedirect({
      appState: { target: '/dashboard' } // optional redirect target
    });
  }
}
