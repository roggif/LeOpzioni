'use client';

import { useState } from 'react';
import { apiService, OptionChainRequest } from '@/api/api';
import { BarChart3, Search, Loader2 } from 'lucide-react';

interface OptionInfo {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
}

interface OptionData {
  ticker: string;
  available_expiries: string[];
  expiry?: string;
  calls?: OptionInfo[];
  puts?: OptionInfo[];
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export default function OptionChain() {
  const [formData, setFormData] = useState({
    ticker: 'AAPL',
    expiry: ''
  });

  const [expiriesLoading, setExpiriesLoading] = useState(false);
  const [chainLoading, setChainLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [optionData, setOptionData] = useState<OptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchExpiries = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpiriesLoading(true);
    setLoadingMessage('Fetching available expiry dates...');
    setError(null);
    setOptionData(null);
    setFormData(prev => ({ ...prev, expiry: '' }));

    try {
      const requestData: OptionChainRequest = { ticker: formData.ticker };
      const response = await apiService.getOptionChain(requestData);
      setOptionData(response.data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError.response?.data?.detail ||
        'An error occurred while fetching expiry dates.';
      setError(errorMessage);
    } finally {
      setExpiriesLoading(false);
      setLoadingMessage('');
    }
  };

  const handleExpiryChange = async (newExpiry: string) => {
    setFormData(prev => ({ ...prev, expiry: newExpiry }));

    if (!newExpiry) {
      if (optionData) {
        const { available_expiries, ticker } = optionData;
        setOptionData({ available_expiries, ticker });
      }
      return;
    }

    setChainLoading(true);
    setLoadingMessage(`Fetching option chain for ${newExpiry}...`);
    setError(null);
    
    try {
      const requestData: OptionChainRequest = { ticker: formData.ticker, expiry: newExpiry };
      const response = await apiService.getOptionChain(requestData);
      setOptionData(response.data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError.response?.data?.detail ||
        'An error occurred while fetching the option chain.';
      setError(errorMessage);
    } finally {
      setChainLoading(false);
      setLoadingMessage('');
    }
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2);
  };

  const formatVolume = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString();
  };

  let combinedOptions: {
    strike: number;
    call: OptionInfo | undefined;
    put: OptionInfo | undefined;
  }[] = [];

  if (optionData && optionData.calls && optionData.puts) {
    const { calls, puts } = optionData;
    const callStrikes = calls.map(c => c.strike);
    const putStrikes = puts.map(p => p.strike);
    const strikes = [...new Set([...callStrikes, ...putStrikes])];
    strikes.sort((a, b) => a - b);

    combinedOptions = strikes.map(strike => {
      const call = calls.find(c => c.strike === strike);
      const put = puts.find(p => p.strike === strike);
      return { strike, call, put };
    });
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <BarChart3 className="inline-block mr-3 h-10 w-10 text-green-600" />
            Option Chain
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            View live options data, analyze strike prices, and examine option volumes and open interest
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Option Chain Parameters</h2>
          
          <form onSubmit={handleFetchExpiries} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4 items-end">
              
              {/* Ticker */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => {
                    setFormData({ticker: e.target.value.toUpperCase(), expiry: ''});
                    setOptionData(null);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="AAPL"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={expiriesLoading || chainLoading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {expiriesLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>Get Expiries</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Expiry Dates Chips */}
          {optionData?.available_expiries && optionData.available_expiries.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Available Expiry Dates</h3>
              <div className="flex flex-wrap gap-3">
                {optionData.available_expiries.map((date) => (
                  <button
                    key={date}
                    onClick={() => handleExpiryChange(date)}
                    disabled={expiriesLoading || chainLoading}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.expiry === date
                        ? 'bg-green-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading indicator for chain data */}
        {chainLoading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="ml-3 text-gray-600">{loadingMessage}</p>
          </div>
        )}

        {/* Option Chain Data */}
        {optionData && optionData.calls && optionData.puts && !chainLoading && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Option Chain - {optionData.ticker} ({optionData.expiry})
            </h3>
            
            <div>
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th colSpan={5} className="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider bg-green-100">Calls</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                      <th colSpan={5} className="px-6 py-3 text-center text-xs font-medium text-red-700 uppercase tracking-wider bg-red-100">Puts</th>
                    </tr>
                    <tr>
                      {/* Calls */}
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bid</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ask</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Open Int</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Implied Vol</th>
                      
                      <th className="px-2 py-3"></th>
                      
                      {/* Puts */}
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bid</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ask</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Open Int</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Implied Vol</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {combinedOptions.slice(0, 40).map(({ strike, call, put }, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {/* Call data */}
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">${formatNumber(call?.bid)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">${formatNumber(call?.ask)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{formatVolume(call?.volume)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{formatVolume(call?.openInterest)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{call?.impliedVolatility ? (call.impliedVolatility * 100).toFixed(1) + '%' : 'N/A'}</td>
                        
                        <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-100 text-center">
                          ${formatNumber(strike)}
                        </td>
                        
                        {/* Put data */}
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">${formatNumber(put?.bid)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">${formatNumber(put?.ask)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{formatVolume(put?.volume)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{formatVolume(put?.openInterest)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{put?.impliedVolatility ? (put.impliedVolatility * 100).toFixed(1) + '%' : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
} 