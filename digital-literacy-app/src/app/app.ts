import { Component, signal } from '@angular/core';
import { Landing } from './landing/landing';

@Component({
  selector: 'app-root',
  standalone: true,        // important for Angular standalone setup
  imports: [Landing],      // Landing will handle Dashboard internally
  template: `<app-landing></app-landing>`,  // inline template for simplicity
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('digital-literacy-app');
}
