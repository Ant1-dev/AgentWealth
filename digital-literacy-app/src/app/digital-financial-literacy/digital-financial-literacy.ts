import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface EtfData {
  name: string;
  price: number;
  change: number;
  changeDirection: 'up' | 'down';
}

@Component({
  selector: 'app-digital-financial-literacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-financial-literacy.html',
  styleUrls: ['./digital-financial-literacy.css']
})
export class DigitalFinancialLiteracy implements AfterViewInit {
  portfolio = {
    cash: 8347.50,
    holdings: {} as { [key: string]: number },
    totalValue: 10000.00
  };

  currentTrade = {
    symbol: '',
    price: 0,
    quantity: 1
  };

  etfData: { [key: string]: EtfData } = {
    'VTI': { name: 'Vanguard Total Stock Market ETF', price: 230.45, change: 0.8, changeDirection: 'up' },
    'VXUS': { name: 'Vanguard Total International Stock ETF', price: 58.20, change: 1.2, changeDirection: 'up' },
    'BND': { name: 'Vanguard Total Bond Market ETF', price: 80.15, change: -0.1, changeDirection: 'down' }
  };

  etfs = ['VTI', 'VXUS', 'BND'];
  selectedEtf: string | null = null;
  coachMessage: string = "Welcome! Based on your profile, let's start with a mix of stocks (VTI) and bonds (BND).";
  smartRecommendation: string = "Try buying 3 shares of VTI first ($691.35). It's a great way to own a piece of the entire US market.";
  isModalOpen = false;
  shareQuantity = 1;
  totalCost = 0;
  remainingCash = 0;
  investedAmount = 1652.50;
  portfolioPerformance = 0.0;
  showAchievementPopup = false;
  achievementTitle = '';
  achievementDesc = '';
  chartBars: { height: number }[] = [];

  ngAfterViewInit() {
    this.initializeChart();
    setInterval(() => this.simulateMarketMovement(), 10000);
    this.updatePortfolioDisplay();
  }

  // Helper function to safely access ETF data
  getEtf(symbol: string): EtfData {
    return this.etfData[symbol];
  }

  getHoldingsCount(): number {
    return Object.keys(this.portfolio.holdings).length;
  }

  selectETF(symbol: string) {
    this.selectedEtf = symbol;
    this.updateAgentGuidance(symbol);
  }

  updateAgentGuidance(symbol: string) {
    const messages: { [key: string]: string } = {
        'VTI': 'Excellent choice! VTI is a solid foundation for any portfolio, giving you broad exposure to US stocks.',
        'VXUS': 'Smart move! Adding international stocks helps diversify your holdings beyond the US market.',
        'BND': 'Great for stability. Bonds help cushion your portfolio during stock market downturns.'
    };
    const recommendations: { [key: string]: string } = {
        'VTI': 'Consider starting with 2-3 shares. This should form the core of your stock holdings.',
        'VXUS': 'A good starting point is 3-5 shares to build your international position.',
        'BND': 'Purchase 3-4 shares to add a stable, income-generating asset to your portfolio.'
    };
    this.coachMessage = messages[symbol];
    this.smartRecommendation = recommendations[symbol];
  }

  openTradeModal(symbol: string, price: number, event: MouseEvent) {
    event.stopPropagation();
    this.currentTrade.symbol = symbol;
    this.currentTrade.price = price;
    this.shareQuantity = 1;
    this.isModalOpen = true;
    this.updateTradeSummary();
  }

  closeTradeModal() {
    this.isModalOpen = false;
  }

  updateTradeSummary() {
    this.currentTrade.quantity = this.shareQuantity || 1;
    this.totalCost = this.currentTrade.quantity * this.currentTrade.price;
    this.remainingCash = this.portfolio.cash - this.totalCost;
  }

  executeTrade() {
    const totalCost = this.currentTrade.quantity * this.currentTrade.price;
    if (totalCost > this.portfolio.cash) {
      alert('Insufficient funds! Please try a smaller amount.');
      return;
    }
    this.portfolio.cash -= totalCost;
    this.portfolio.holdings[this.currentTrade.symbol] = (this.portfolio.holdings[this.currentTrade.symbol] || 0) + this.currentTrade.quantity;
    this.updatePortfolioDisplay();
    this.closeTradeModal();
    this.showAchievement(this.currentTrade.symbol);
    this.updatePostTradeGuidance();
  }

  updatePortfolioDisplay() {
    this.investedAmount = Object.keys(this.portfolio.holdings).reduce((total, symbol) => {
        return total + (this.portfolio.holdings[symbol] * this.getEtf(symbol).price);
    }, 0);
    this.portfolio.totalValue = this.portfolio.cash + this.investedAmount;
    const performance = ((this.portfolio.totalValue - 10000) / 10000) * 100;
    this.portfolioPerformance = parseFloat(performance.toFixed(2));
  }

  getHoldings() {
    return Object.keys(this.portfolio.holdings).map(symbol => ({
      symbol,
      shares: this.portfolio.holdings[symbol],
      value: this.portfolio.holdings[symbol] * this.getEtf(symbol).price
    }));
  }

  showAchievement(symbol: string) {
    const achievements: { [key: string]: { title: string, desc: string } } = {
        'VTI': { title: 'US Market Investor!', desc: 'You now own a piece of the entire US stock market.' },
        'VXUS': { title: 'Global Investor!', desc: 'You\'ve successfully diversified with international stocks.' },
        'BND': { title: 'Safety First!', desc: 'You\'ve added a stable foundation to your portfolio with bonds.' }
    };
    const achievement = achievements[symbol] || { title: 'First Investment!', desc: 'Congratulations on starting your investment journey!' };
    this.achievementTitle = achievement.title;
    this.achievementDesc = achievement.desc;
    this.showAchievementPopup = true;
    setTimeout(() => this.showAchievementPopup = false, 4000);
  }

  updatePostTradeGuidance() {
    const holdingsCount = this.getHoldingsCount();
    const messages = [
        "Great first step! Now you're an investor. Consider adding a different type of asset to diversify.",
        "Excellent diversification! A balanced portfolio is key to long-term growth.",
        "Fantastic! You have a well-diversified portfolio. Now you can focus on making regular contributions."
    ];
    this.coachMessage = messages[Math.min(holdingsCount - 1, 2)];
  }

  showResearch(symbol: string, event: MouseEvent) {
    event.stopPropagation();
    const research: { [key: string]: string } = {
        'VTI': 'VTI is a low-cost ETF that tracks the entire US stock market, including large, mid, and small-cap stocks.',
        'VXUS': 'VXUS provides exposure to both developed and emerging international markets, excluding the US.',
        'BND': 'BND is a broad, investment-grade bond ETF that provides stable income and lowers portfolio risk.'
    };
    alert(`${symbol} Research:\n\n${research[symbol]}`);
  }

  initializeChart() {
    for (let i = 0; i < 20; i++) {
        this.chartBars.push({ height: 20 + Math.random() * 80 });
    }
  }

  simulateMarketMovement() {
    this.etfs.forEach(symbol => {
        const etf = this.getEtf(symbol);
        const change = (Math.random() - 0.5) * 0.02;
        etf.price *= (1 + change);
        etf.change = change * 100;
        etf.changeDirection = etf.change >= 0 ? 'up' : 'down';
    });
    if (this.getHoldingsCount() > 0) {
        this.updatePortfolioDisplay();
    }
  }
}