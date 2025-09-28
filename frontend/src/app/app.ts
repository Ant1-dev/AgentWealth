import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],  // only RouterOutlet is imported here
  template: `<router-outlet></router-outlet>`,
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('digital-literacy-app');

  
  }

