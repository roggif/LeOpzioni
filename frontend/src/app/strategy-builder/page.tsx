'use client';

import { useState } from 'react';
import { apiService, OptionLeg, OptionsStrategyRequest } from '@/api/api';
import { Calculator, Plus, Trash2, TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface GreeksData {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

interface StrategyDetail {
  strike: number;
  premium: number;
  type: string;
  position: string;
  quantity: number;
  greeks: GreeksData;
}

interface StrategyParameters {
  spot_price: number;
  volatility_pct: number;
  rate_pct: number;
  days_to_expiry: number;
}

interface StrategyResults {
  strategy_parameters: StrategyParameters;
  strategy_details: StrategyDetail[];
  total_greeks: GreeksData;
  simulation: {
    price_range: number[];
    payoff_at_expiry: number[];
    current_pnl: number[];
  };
  max_profit: number | string;
  max_loss: number | string;
}

export default function StrategyBuilder() {
  const [formData, setFormData] = useState({
    ticker: 'AAPL',
    spotPrice: 150,
    volatility: 25,
    riskFreeRate: 5,
    daysToExpiry: 30
  });

  const [useSpotPrice, setUseSpotPrice] = useState(true);

  const [optionLegs, setOptionLegs] = useState<OptionLeg[]>([
    {
      strike: 150,
      premium: 5,
      option_type: 'call',
      position: 1
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StrategyResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addOptionLeg = () => {
    setOptionLegs([...optionLegs, {
      strike: formData.spotPrice,
      premium: 5,
      option_type: 'call',
      position: 1
    }]);
  };

  const removeOptionLeg = (index: number) => {
    setOptionLegs(optionLegs.filter((_, i) => i !== index));
  };

  const updateOptionLeg = (index: number, field: keyof OptionLeg, value: string | number) => {
    const updated = [...optionLegs];
    updated[index] = { ...updated[index], [field]: value };
    setOptionLegs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestData: OptionsStrategyRequest = {
        ticker: formData.ticker,
        spot_price: useSpotPrice ? formData.spotPrice : null,
        volatility: formData.volatility,
        rate: formData.riskFreeRate,
        days_to_expiry: formData.daysToExpiry,
        options: optionLegs
      };

      const response = await apiService.simulateStrategy(requestData);
      setResults(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err && err.response 
        ? (err.response as { data?: { detail?: string } }).data?.detail || 'An error occurred while simulating strategy'
        : 'An error occurred while simulating strategy';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = results ? results.simulation.price_range.map((price, index) => ({
    price: price,
    payoff: results.simulation.payoff_at_expiry[index],
    current: results.simulation.current_pnl[index]
  })) : [];

  const formatGreek = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return value.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <Calculator className="inline-block mr-3 h-10 w-10 text-blue-600" />
            Options Strategy Builder
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Build complex options strategies, visualize payoff diagrams, and analyze Greeks for risk management
          </p>
        </div>

        {/* Strategy Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Strategy Parameters</h2>
          <h3 className="text-lg text-gray-900 mb-6">Remember to run a new simulation when you change the parameters</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Parameters */}
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AAPL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spot Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.spotPrice}
                  onChange={(e) => setFormData({...formData, spotPrice: parseFloat(e.target.value)})}
                  disabled={!useSpotPrice}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !useSpotPrice ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                  }`}
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="useSpotPrice"
                    checked={useSpotPrice}
                    onChange={(e) => setUseSpotPrice(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useSpotPrice" className="ml-2 text-sm text-gray-700">
                    Use manual spot price
                  </label>
                </div>
                {!useSpotPrice && (
                  <p className="text-xs text-gray-500 mt-1">
                    Spot price will be automatically fetched from {formData.ticker}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volatility (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.volatility}
                  onChange={(e) => setFormData({...formData, volatility: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk-Free Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.riskFreeRate}
                  onChange={(e) => setFormData({...formData, riskFreeRate: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days to Expiry</label>
                <input
                  type="number"
                  value={formData.daysToExpiry}
                  onChange={(e) => setFormData({...formData, daysToExpiry: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Option Legs */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Option Legs</h3>
                <button
                  type="button"
                  onClick={addOptionLeg}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Leg</span>
                </button>
              </div>

              <div className="space-y-4">
                {optionLegs.map((leg, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid md:grid-cols-6 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Strike ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={leg.strike}
                          onChange={(e) => updateOptionLeg(index, 'strike', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Premium ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={leg.premium}
                          onChange={(e) => updateOptionLeg(index, 'premium', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={leg.option_type}
                          onChange={(e) => updateOptionLeg(index, 'option_type', e.target.value as 'call' | 'put')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="call">Call</option>
                          <option value="put">Put</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                        <select
                          value={leg.position}
                          onChange={(e) => updateOptionLeg(index, 'position', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={1}>Buy</option>
                          <option value={-1}>Sell</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          value={Math.abs(leg.position)}
                          onChange={(e) => updateOptionLeg(index, 'position', leg.position > 0 ? parseInt(e.target.value) : -parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                      <div>
                        {optionLegs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOptionLeg(index)}
                            className="w-full bg-red-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Simulating...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5" />
                    <span>Simulate Strategy</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8">
            
            {/* Strategy Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Strategy Summary</h3>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-300 border-2">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">Max Profit</h4>
                  <p className="text-2xl font-bold text-green-800">
                    {typeof results.max_profit === 'number' ? `$${results.max_profit.toFixed(2)}` : results.max_profit}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-300 border-2">
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Max Loss</h4>
                  <p className="text-2xl font-bold text-red-800">
                    {typeof results.max_loss === 'number' ? `$${results.max_loss.toFixed(2)}` : results.max_loss}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-300 border-2">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">Current Spot</h4>
                  <p className="text-2xl font-bold text-blue-800">${results.strategy_parameters.spot_price}</p>
                  {!useSpotPrice && (
                    <p className="text-xs text-blue-600 mt-1">Auto-fetched from {formData.ticker}</p>
                  )}
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-300 border-2">
                  <h4 className="text-lg font-semibold text-purple-900 mb-2">Days to Expiry</h4>
                  <p className="text-2xl font-bold text-purple-800">{formData.daysToExpiry}</p>
                </div>
              </div>
            </div>

            {/* Greeks Table */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Greeks Analysis</h3>
              
              <div className="grid md:grid-cols-5 gap-4">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Delta</h4>
                  <p className="text-xl font-bold text-gray-900">{formatGreek(results.total_greeks.delta)}</p>
                  <p className="text-xs text-gray-500">Price sensitivity</p>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Gamma</h4>
                  <p className="text-xl font-bold text-gray-900">{formatGreek(results.total_greeks.gamma)}</p>
                  <p className="text-xs text-gray-500">Delta sensitivity</p>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Vega</h4>
                  <p className="text-xl font-bold text-gray-900">{formatGreek(results.total_greeks.vega)}</p>
                  <p className="text-xs text-gray-500">Volatility sensitivity</p>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Theta</h4>
                  <p className="text-xl font-bold text-gray-900">{formatGreek(results.total_greeks.theta)}</p>
                  <p className="text-xs text-gray-500">Time decay</p>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Rho</h4>
                  <p className="text-xl font-bold text-gray-900">{formatGreek(results.total_greeks.rho)}</p>
                  <p className="text-xs text-gray-500">Interest rate sensitivity</p>
                </div>
              </div>
            </div>

            {/* Payoff Diagram */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Payoff Diagram</h3>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="price" 
                      type="number"
                      scale="linear"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'payoff' ? 'At Expiry' : 'Current P&L']}
                      labelFormatter={(value: number) => `Price: $${value.toFixed(2)}`}
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                    <ReferenceLine x={results.strategy_parameters.spot_price} stroke="#8884d8" strokeDasharray="5 5" />
                    <Line 
                      type="monotone" 
                      dataKey="payoff" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      name="At Expiry"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Current P&L"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• Blue line: Payoff at expiry</p>
                <p>• Green line: Current P&L (including time value)</p>
                <p>• Vertical dashed line: Current spot price</p>
              </div>
            </div>

            {/* Strategy Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Strategy Details</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gamma</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vega</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theta</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.strategy_details.map((detail, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${detail.strike}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {detail.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detail.position} x{detail.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${detail.premium}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatGreek(detail.greeks.delta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatGreek(detail.greeks.gamma)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatGreek(detail.greeks.vega)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatGreek(detail.greeks.theta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
} 