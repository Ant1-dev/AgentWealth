import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-learning-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-page.html',
  styleUrls: ['./learning-page.css']
})
export class LearningPage {
  quizCompleted = false;
  selectedAnswerIndex: number | null = null;
  answers = [
    { text: "A single company's stock", correct: false },
    { text: 'Small pieces of thousands of companies', correct: true },
    { text: 'A government bond', correct: false }
  ];
  showQuizFeedback = false;
  isHelpPopupVisible = false;

  agentActivities = [
    { activity: 'Progress Agent: Tracking comprehension...', decision: 'DETECTED: Strong understanding of concepts.' },
    { activity: 'Path Planning Agent: Optimizing next lesson...', decision: 'DECISION: Adding expense ratio tool.' },
    { activity: 'Assessment Agent: Monitoring engagement...', decision: 'INSIGHT: User responds well to analogies.' }
  ];

  selectAnswer(index: number) {
    this.selectedAnswerIndex = index;
    this.showQuizFeedback = true;
    if (this.answers[index].correct) {
      this.quizCompleted = true;
    }
  }

  needHelp() {
    this.isHelpPopupVisible = true;
  }

  closeHelp() {
    this.isHelpPopupVisible = false;
  }

  getHelp(type: string) {
    this.closeHelp();
    let helpMessage = '';
    switch (type) {
      case 'analogy':
        helpMessage = "Think of an ETF like a pizza with many toppings - you get a slice and taste everything, not just pepperoni!";
        break;
      case 'examples':
        helpMessage = "Imagine you want to invest in technology. Instead of picking Apple OR Google, an ETF lets you own both plus hundreds of other tech companies!";
        break;
      case 'simplify':
        helpMessage = "ETF = Many stocks bundled together. One purchase = instant diversification. Less risky than individual stocks.";
        break;
    }
    alert(helpMessage);
  }

  nextStep() {
    if (this.quizCompleted) {
      alert('Moving to the next lesson: Expense Ratios...');
    } else {
      alert('Please complete the understanding check first!');
    }
  }
}