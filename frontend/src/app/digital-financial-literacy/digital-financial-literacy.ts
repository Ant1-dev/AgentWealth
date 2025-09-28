// src/app/digital-financial-literacy/digital-financial-literacy.ts
import { Component, OnInit, OnDestroy, signal, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { StockMarketService, StockQuote, StockSearchResult, HistoricalDataPoint } from '../stock-market.service';
import { debounceTime, Subject, Subscription } from 'rxjs';

Chart.register(...registerables);

interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

@Component({
  selector: 'app-digital-financial-literacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-financial-literacy.html',
  styleUrls: ['./digital-financial-literacy.css']
})
export class DigitalFinancialLiteracy implements OnInit, OnDestroy {
  // --- State Signals ---
  cashBalance = signal<number>(10000); // Start with $10,000
  portfolio = signal<PortfolioHolding[]>([]);
  selectedStock = signal<StockQuote | null>(null);
  
  searchTerm: string = 'AAPL';
  searchResults = signal<StockSearchResult[]>([]);
  
  buyQuantity: number | null = null;
  sellQuantity: number | null = null;
  
  chartRange = signal<string>('1Y');
  mockQuotes: { [key: string]: StockQuote } = {};

  topMovers = signal<{ gainers: StockQuote[], losers: StockQuote[] }>({ gainers: [], losers: [] });

  // --- Computed Values ---
  portfolioValue = computed(() => {
    return this.portfolio().reduce((total, holding) => {
      const currentPrice = this.mockQuotes[holding.symbol]?.price || 0;
      return total + (holding.quantity * currentPrice);
    }, 0) + this.cashBalance();
  });
  
  // --- Chart and Search ---
  private stockChart: Chart | null = null;
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  constructor(private stockMarketService: StockMarketService) {}

  ngOnInit(): void {
    // Debounce search input to avoid excessive API calls
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(query => {
      if (query) {
        this.stockMarketService.searchStocks(query).subscribe(results => {
          this.searchResults.set(results);
        });
      } else {
        this.searchResults.set([]);
      }
    });

    // Load default stock
    this.selectStock('AAPL');
    
    // Load top movers
    this.loadTopMovers();

    // Simulate real-time updates for portfolio
    setInterval(() => this.updatePortfolioQuotes(), 5000);
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.stockChart?.destroy();
  }

  // --- Stock Interaction ---
  searchStocks(): void {
    this.searchSubject.next(this.searchTerm);
  }

  selectStock(symbol: string): void {
    this.stockMarketService.getQuote(symbol).subscribe(quote => {
      if (quote) {
        this.selectedStock.set(quote);
        this.mockQuotes[symbol] = quote; // Cache quote
        this.updateChart();
      }
    });
    this.searchResults.set([]);
    this.searchTerm = symbol;
  }

  buyStock(): void {
    const stock = this.selectedStock();
    const quantity = this.buyQuantity;

    if (!stock || !quantity || quantity <= 0) return;

    const cost = stock.price * quantity;
    if (this.cashBalance() < cost) {
      alert('Not enough cash to complete this purchase.');
      return;
    }

    this.cashBalance.update(balance => balance - cost);
    this.portfolio.update(currentPortfolio => {
      const existingHolding = currentPortfolio.find(h => h.symbol === stock.symbol);
      if (existingHolding) {
        // Update existing holding
        const totalCost = (existingHolding.averagePrice * existingHolding.quantity) + cost;
        const totalQuantity = existingHolding.quantity + quantity;
        existingHolding.quantity = totalQuantity;
        existingHolding.averagePrice = totalCost / totalQuantity;
      } else {
        // Add new holding
        currentPortfolio.push({
          symbol: stock.symbol,
          quantity: quantity,
          averagePrice: stock.price
        });
      }
      return [...currentPortfolio]; // Return new array to trigger signal update
    });
    
    this.buyQuantity = null; // Reset input
  }

  sellStock(): void {
    const stock = this.selectedStock();
    const quantity = this.sellQuantity;
    const holding = this.portfolio().find(h => h.symbol === stock?.symbol);

    if (!stock || !quantity || quantity <= 0 || !holding) return;

    if (holding.quantity < quantity) {
      alert('You do not own enough shares to sell.');
      return;
    }

    const value = stock.price * quantity;
    this.cashBalance.update(balance => balance + value);
    this.portfolio.update(currentPortfolio => {
      holding.quantity -= quantity;
      if (holding.quantity === 0) {
        // Remove holding if all shares are sold
        return currentPortfolio.filter(h => h.symbol !== stock.symbol);
      }
      return [...currentPortfolio];
    });

    this.sellQuantity = null; // Reset input
  }

  // --- Charting ---
  updateChartRange(range: string): void {
    this.chartRange.set(range);
    this.updateChart();
  }

  private updateChart(): void {
    const symbol = this.selectedStock()?.symbol;
    if (!symbol) return;
    
    this.stockMarketService.getHistoricalData(symbol, this.chartRange()).subscribe(data => {
      this.renderChart(data);
    });
  }
  
  private renderChart(data: HistoricalDataPoint[]): void {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    const ctx = document.getElementById('stockChart') as HTMLCanvasElement;

    if (this.stockChart) {
      this.stockChart.destroy();
    }

    this.stockChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: this.selectedStock()?.symbol,
          data: prices,
          borderColor: prices[prices.length - 1] >= prices[0] ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)',
          backgroundColor: prices[prices.length - 1] >= prices[0] ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)',
          fill: true,
          pointRadius: 0,
          tension: 0.1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { beginAtZero: false }
        }
      }
    });
  }
  
  // --- Portfolio Updates ---
  private updatePortfolioQuotes(): void {
    this.portfolio().forEach(holding => {
      this.stockMarketService.getQuote(holding.symbol).subscribe(quote => {
        if (quote) {
          this.mockQuotes[holding.symbol] = quote;
        }
      });
    });
    // Trigger portfolio value recalculation by creating a new array
    this.portfolio.set([...this.portfolio()]); 
  }

  private loadTopMovers(): void {
    this.stockMarketService.getTopMovers().subscribe(movers => {
      this.topMovers.set(movers);
    });
  }
}