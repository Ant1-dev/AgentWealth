// app.routes.ts
import { Routes } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';


export const routes: Routes = [
  { path: '', component: Landing }, // default route
  // add other routes here later
  { path: 'dashboard', component: Dashboard }
];
