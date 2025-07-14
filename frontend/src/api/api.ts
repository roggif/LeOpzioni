import axios from 'axios';

// Update this URL with your actual Render deployment URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for analysis requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for API requests and responses
export interface StockAnalysisRequest {
  stocks1: string[];
  stocks2: string[];
  start_date: string;
  end_date: string;
  period?: string;
}

export interface CompanyInfoRequest {
  ticker: string;
}

export interface OptionChainRequest {
  ticker: string;
  expiry?: string;
}

export interface OptionLeg {
  strike: number;
  premium: number;
  option_type: 'call' | 'put';
  position: number; // 1 for buy, -1 for sell
}

export interface OptionsStrategyRequest {
  ticker: string;
  spot_price?: number | null;
  volatility: number;
  rate: number;
  days_to_expiry: number;
  options: OptionLeg[];
}

// API Functions
export const apiService = {
  // Health check
  health: () => api.get('/health'),

  // Stock Analysis
  comparativeAnalysis: (data: StockAnalysisRequest) => 
    api.post('/analysis/comparative', data),

  generateVisualizations: (data: StockAnalysisRequest) => 
    api.post('/analysis/visualizations', data),

  cointegrationAnalysis: (data: StockAnalysisRequest) => 
    api.post('/analysis/cointegration', data),

  cointegrationPlots: (data: StockAnalysisRequest) => 
    api.post('/analysis/cointegration/plots', data),

  // Company Info
  getCompanyInfo: (data: CompanyInfoRequest) => 
    api.post('/company/info', data),

  // Options
  getOptionChain: (data: OptionChainRequest) => 
    api.post('/options/chain', data),

  simulateStrategy: (data: OptionsStrategyRequest) => 
    api.post('/options/strategy', data),
};

export default api; 