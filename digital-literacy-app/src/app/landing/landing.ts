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
    // Subscribe to auth status
    this.auth.isAuthenticated$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  loginOrSignup(): void {
    if (!this.isLoggedIn) {
      this.auth.loginWithRedirect();
    }
    // If already logged in, dashboard will automatically render
  }
}
