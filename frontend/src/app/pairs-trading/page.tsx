'use client';

import { useState } from 'react';
import { apiService, StockAnalysisRequest } from '@/api/api';
import { TrendingUp, BarChart2, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface StatisticsData {
  mean: number;
  std: number;
  skew: number;
  kurtosis: number;
}

interface ComparativeResults {
  stocks: {
    stock1: string;
    stock2: string;
  };
  statistics: {
    stock1: StatisticsData;
    stock2: StatisticsData;
  };
  comparative_analysis: string[];
}

interface VisualizationResults {
  visualization: string;
}

interface RegressionModel {
  r_squared: number;
  adf_statistic: number;
  adf_p_value: number;
}

interface CointegrationResults {
  cointegration_results: {
    interpretation: string;
  };
  regression_1: RegressionModel;
  regression_2: RegressionModel;
}

interface RegressionPlot {
  title: string;
  image: string;
  r_squared: number;
}

interface CointegrationPlotResults {
  regression_plots: {
    plot1: RegressionPlot;
    plot2: RegressionPlot;
  };
}

interface AnalysisResults {
  comparative?: ComparativeResults;
  visualizations?: VisualizationResults;
  cointegration?: CointegrationResults;
  cointegrationPlots?: CointegrationPlotResults;
}

const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2 text-gray-600">Loading Analysis...</p>
    </div>
);

export default function PairsTrading() {
  const [formData, setFormData] = useState({
    ticker1: 'MSFT',
    ticker2: 'TSLA',
    startDate: '2022-01-01',
    endDate: '2024-12-31',
    period: '1d'
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults>({});
  const [error, setError] = useState<string | null>(null);
  const [showRegressionPlots, setShowRegressionPlots] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults({});
    setShowRegressionPlots(false);
    setAnalysisRun(true);

    const requestData: StockAnalysisRequest = {
      stocks1: [formData.ticker1],
      stocks2: [formData.ticker2],
      start_date: formData.startDate,
      end_date: formData.endDate,
      period: formData.period
    };

    const comparativePromise = apiService.comparativeAnalysis(requestData)
      .then(response => {
        setResults(prev => ({ ...prev, comparative: response.data }));
      })
      .catch(() => {
        setError(prev => (prev ? prev + "\n" : "") + "Comparative analysis failed.");
      });

    const visualizationsPromise = apiService.generateVisualizations(requestData)
      .then(response => {
        setResults(prev => ({ ...prev, visualizations: response.data }));
      })
      .catch(() => {
        setError(prev => (prev ? prev + "\n" : "") + "Visualization chart failed.");
      });

    const cointegrationPromise = apiService.cointegrationAnalysis(requestData)
      .then(response => {
        setResults(prev => ({ ...prev, cointegration: response.data }));
      })
      .catch(() => {
        setError(prev => (prev ? prev + "\n" : "") + "Cointegration analysis failed.");
      });

    const cointegrationPlotsPromise = apiService.cointegrationPlots(requestData)
      .then(response => {
        setResults(prev => ({ ...prev, cointegrationPlots: response.data }));
      })
      .catch(() => {
        setError(prev => (prev ? prev + "\n" : "") + "Regression plots failed.");
      });

    Promise.all([
      comparativePromise,
      visualizationsPromise,
      cointegrationPromise,
      cointegrationPlotsPromise
    ]).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <TrendingUp className="inline-block mr-3 h-10 w-10 text-purple-600" />
            Pairs Trading Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Analyze correlations between stocks, perform cointegration tests, and discover statistical-based opportunities
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis Parameters</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Ticker 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker 1
                </label>
                <input
                  type="text"
                  value={formData.ticker1}
                  onChange={(e) => setFormData({...formData, ticker1: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="MSFT"
                  required
                />
              </div>

              {/* Ticker 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker 2
                </label>
                <input
                  type="text"
                  value={formData.ticker2}
                  onChange={(e) => setFormData({...formData, ticker2: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="TSLA"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Period/Timeframe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeframe
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="1d">Daily (1D)</option>
                  <option value="5d">Weekly (5D)</option>
                  <option value="1mo">Monthly (1M)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Analysis</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-800 whitespace-pre-line">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysisRun && (
          <div className="space-y-8">
            
            {/* Visualizations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Price and Returns Analysis</h3>
              {loading && !results.visualizations && <LoadingSpinner />}
              {results.visualizations && results.visualizations.visualization ? (
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                  <div className="text-center">
                    <Image
                      src={`data:image/png;base64,${results.visualizations.visualization}`}
                      alt="Comprehensive Analysis Charts"
                      width={800}
                      height={600}
                      className="mx-auto max-w-full h-auto rounded-lg shadow-md"
                      priority
                    />
                  </div>
                  <div className="text-sm text-gray-700 lg:flex lg:flex-col lg:h-full">
                    <div className="mb-6 lg:mb-0 lg:flex-1 lg:flex lg:items-center">
                      <p>
                        The use of a dual-axis chart provides an effective visual representation of the relative dynamics between two time series with different price scales. Specifically, in the context of market-neutral strategies such as pair trading, this type of visualization is useful for identifying cointegration or, more simply, the temporary directional correlation of price movements, regardless of the absolute price levels
                      </p>
                    </div>
                    <div className="mb-6 lg:mb-0 lg:flex-1 lg:flex lg:items-center">
                      <p>
                        The analysis of rolling correlations allows for the evaluation of not only the degree of correlation between two assets, but also its stability over time. Using different lookback periods helps distinguish between short-term dynamics and longer-term relationships, which tend to be more stable and structural.
                      </p>
                    </div>
                    <div className="mb-6 lg:mb-0 lg:flex-1 lg:flex lg:items-center">
                      <p>
                        The visualization of log returns enables a direct assessment of the volatility profiles of the two assets. Higher amplitude in return fluctuations corresponds to greater market volatility. Logarithmic returns are employed instead of arithmetic returns because they are time-additive and more suitable for continuous-time stochastic models
                      </p>
                    </div>
                    <div className="lg:flex-1 lg:flex lg:items-center">
                      <p>
                        An empirical estimate of the probability density function of logarithmic returns enables the analysis of the statistical characteristics of asset return distributions. This allows for the assessment of whether the distribution resembles a Gaussian  shape or exhibits deviations such as asymmetry and heavy tails. A tighter distribution generally indicates lower dispersion in returns, suggesting a more stable and less volatile asset
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                !loading && <p className="text-center text-gray-500">Visualization data not available.</p>
              )}
            </div>

            {/* Comparative Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                <BarChart2 className="inline-block mr-2 h-6 w-6 text-blue-600" />
                Comparative Analysis
              </h3>
              {loading && !results.comparative && <LoadingSpinner />}
              {results.comparative ? (
                <>
                  {/* Statistics Table */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">{formData.ticker1} Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Mean:</span>
                          <span className="font-mono">{results.comparative.statistics.stock1.mean?.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Std Dev:</span>
                          <span className="font-mono">{results.comparative.statistics.stock1.std?.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Skewness:</span>
                          <span className="font-mono">{results.comparative.statistics.stock1.skew?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kurtosis:</span>
                          <span className="font-mono">{results.comparative.statistics.stock1.kurtosis?.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">{formData.ticker2} Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Mean:</span>
                          <span className="font-mono">{results.comparative.statistics.stock2.mean?.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Std Dev:</span>
                          <span className="font-mono">{results.comparative.statistics.stock2.std?.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Skewness:</span>
                          <span className="font-mono">{results.comparative.statistics.stock2.skew?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kurtosis:</span>
                          <span className="font-mono">{results.comparative.statistics.stock2.kurtosis?.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Insights */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3">Analysis Insights</h4>
                    <div className="space-y-2">
                      {results.comparative.comparative_analysis.map((insight: string, index: number) => (
                        <p key={index} className="text-blue-800 text-sm">{insight}</p>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                !loading && <p className="text-center text-gray-500">Comparative analysis data not available.</p>
              )}
            </div>

            {/* Cointegration Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Cointegration Analysis</h3>
              {loading && !results.cointegration && <LoadingSpinner />}
              {results.cointegration ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-300 border-2">
                      <h4 className="text-lg font-semibold text-green-900 mb-3">
                        {formData.ticker2} ~ {formData.ticker1}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>R²:</span>
                          <span className="font-mono">{results.cointegration.regression_1?.r_squared?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ADF Statistic:</span>
                          <span className="font-mono">{results.cointegration.regression_1?.adf_statistic?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-value:</span>
                          <span className="font-mono">{results.cointegration.regression_1?.adf_p_value?.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-300 border-2">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3">
                        {formData.ticker1} ~ {formData.ticker2}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>R²:</span>
                          <span className="font-mono">{results.cointegration.regression_2?.r_squared?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ADF Statistic:</span>
                          <span className="font-mono">{results.cointegration.regression_2?.adf_statistic?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-value:</span>
                          <span className="font-mono">{results.cointegration.regression_2?.adf_p_value?.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cointegration Conclusion */}
                  <div className="mt-6 bg-yellow-100 rounded-lg p-4 border border-yellow-300 border-2">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-2">Cointegration Test Result</h4>
                    <p className="text-yellow-800">
                      {results.cointegration.cointegration_results.interpretation}
                    </p>
                  </div>

                  {/* Toggle Button for Regression Plots */}
                  {results.cointegrationPlots && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowRegressionPlots(!showRegressionPlots)}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2 mx-auto"
                      >
                        <BarChart2 className="h-5 w-5" />
                        <span>
                          {showRegressionPlots ? 'Hide' : 'Show'} Regression Analysis Plots
                        </span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                 !loading && <p className="text-center text-gray-500">Cointegration analysis data not available.</p>
              )}
            </div>

            {/* Regression Plots - Show on demand */}
            {showRegressionPlots && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Regression Analysis Plots</h3>
                <p className="text-sm text-gray-700 mb-6">
                  Directional linear regression estimates the dependence of one asset on another; the coefficient of determination (R²) quantifies the proportion of variance explained by the model.
                  <br/>
                  Residuals —deviations from fitted values— highlight potential nonlinearity or unmodeled dynamics. Time series analysis of residuals helps assess mean-reverting behavior.
                </p>
                {loading && !results.cointegrationPlots && <LoadingSpinner />}
                {results.cointegrationPlots ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        {results.cointegrationPlots.regression_plots.plot1?.title}
                      </h4>
                      <Image
                        src={`data:image/png;base64,${results.cointegrationPlots.regression_plots.plot1?.image}`}
                        alt="Regression Plot 1"
                        width={500}
                        height={400}
                        className="w-full rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        R² = {results.cointegrationPlots.regression_plots.plot1?.r_squared?.toFixed(4)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        {results.cointegrationPlots.regression_plots.plot2?.title}
                      </h4>
                      <Image
                        src={`data:image/png;base64,${results.cointegrationPlots.regression_plots.plot2?.image}`}
                        alt="Regression Plot 2"
                        width={500}
                        height={400}
                        className="w-full rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        R² = {results.cointegrationPlots.regression_plots.plot2?.r_squared?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  !loading && <p className="text-center text-gray-500">Regression plots not available.</p>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
} 