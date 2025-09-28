// src/app/stock-market.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Interfaces for Stock Data ---
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
}

export interface HistoricalDataPoint {
  date: string;
  close: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockMarketService {

  // --- Mock Data ---
  private mockStocks: { [key: string]: StockQuote } = {
    'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 172.25, change: 1.50, changePercent: 0.88, dayHigh: 173.00, dayLow: 171.50, yearHigh: 199.62, yearLow: 164.08, marketCap: 2660000000000, volume: 52000000 },
    'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.50, change: -0.75, changePercent: -0.54, dayHigh: 139.25, dayLow: 137.80, yearHigh: 155.20, yearLow: 115.83, marketCap: 1730000000000, volume: 25000000 },
    'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 370.80, change: 2.10, changePercent: 0.57, dayHigh: 371.50, dayLow: 369.00, yearHigh: 430.82, yearLow: 309.49, marketCap: 2750000000000, volume: 28000000 },
    'AMZN': { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 175.00, change: -1.20, changePercent: -0.68, dayHigh: 176.00, dayLow: 174.50, yearHigh: 191.70, yearLow: 118.35, marketCap: 1820000000000, volume: 45000000 },
  };

  private mockSearchResults: StockSearchResult[] = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  ];

  constructor() { }

  /**
   * Searches for stock symbols matching the query.
   * @param query - The search term.
   * @returns An observable of search results.
   */
  searchStocks(query: string): Observable<StockSearchResult[]> {
    const lowerQuery = query.toLowerCase();
    const results = this.mockSearchResults.filter(stock =>
      stock.symbol.toLowerCase().includes(lowerQuery) ||
      stock.name.toLowerCase().includes(lowerQuery)
    );
    return of(results);
  }

  /**
   * Gets the latest quote for a given stock symbol.
   * @param symbol - The stock symbol.
   * @returns An observable of the stock quote.
   */
  getQuote(symbol: string): Observable<StockQuote | null> {
    const stock = this.mockStocks[symbol.toUpperCase()];
    if (stock) {
      // Simulate real-time price fluctuation
      const newPrice = stock.price + (Math.random() - 0.5) * 2;
      return of({ ...stock, price: parseFloat(newPrice.toFixed(2)) });
    }
    return of(null);
  }

  /**
   * Gets historical data for a stock.
   * @param symbol - The stock symbol.
   * @param range - The time range (e.g., '1M', '6M', '1Y').
   * @returns An observable of historical data points.
   */
  getHistoricalData(symbol: string, range: string = '1Y'): Observable<HistoricalDataPoint[]> {
    const data: HistoricalDataPoint[] = [];
    let days: number;

    switch (range) {
      case '1M': days = 30; break;
      case '6M': days = 180; break;
      default: days = 365; break;
    }

    let lastClose = this.mockStocks[symbol.toUpperCase()]?.price || 150;
    for (let i = days; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      lastClose += (Math.random() - 0.5) * 3;
      if (lastClose < 0) lastClose = 0;
      data.push({ date: date.toISOString().split('T')[0], close: parseFloat(lastClose.toFixed(2)) });
    }
    return of(data);
  }
}