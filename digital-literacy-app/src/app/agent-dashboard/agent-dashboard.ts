import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html', // Corrected path
  styleUrls: ['./agent-dashboard.css']
})
export class AgentDashboard {
  // Data for the agent dashboard
  agents = [
    {
      name: 'Assessment Agent',
      status: 'Active',
      color: 'green',
      task: 'Analyzing user engagement patterns across 247 learners...',
      decision: 'Detected visual learning preference - switching all content to diagram-heavy format'
    },
    {
      name: 'Path Planning Agent',
      status: 'Thinking',
      color: 'orange',
      task: 'Monitoring market volatility for teaching opportunities...',
      decision: 'Redesigning compound interest lesson with interactive charts and animations'
    },
    {
      name: 'Progress Tracking Agent',
      status: 'Monitoring',
      color: 'blue',
      task: 'Monitoring market volatility for teaching opportunities...',
      prediction: '87% probability you\'ll master ETF concepts within 2 more lessons'
    }
  ];
}