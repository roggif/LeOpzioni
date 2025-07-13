from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import yfinance as yf
import numpy as np
import matplotlib
matplotlib.use('Agg')
matplotlib.rcParams['figure.max_open_warning'] = 0
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller
from scipy.stats import gaussian_kde
import matplotlib.gridspec as gridspec
import base64
import io
import gc
import contextlib
import weakref
from pairs_trading.funzioni import analisi_comparata_completa_con_asimmetria_graduale, analisi_statistiche
from options_utils import black_scholes, black_scholes_greeks

app = FastAPI(title="Stock Analysis API", description="API for stock analysis and cointegration", version="1.0.0")

# Track figures for cleanup
_active_figures = weakref.WeakSet()

@contextlib.contextmanager
def safe_figure_context(*args, **kwargs):
    """Context manager for safe figure creation and cleanup"""
    fig = None
    try:
        fig = plt.figure(*args, **kwargs)
        _active_figures.add(fig)
        yield fig
    except Exception as e:
        if fig is not None:
            plt.close(fig)
        raise
    finally:
        if fig is not None:
            plt.close(fig)
        cleanup_matplotlib()

@contextlib.contextmanager
def safe_subplots_context(*args, **kwargs):
    """Context manager for safe subplots creation and cleanup"""
    fig = None
    axes = None
    try:
        fig, axes = plt.subplots(*args, **kwargs)
        _active_figures.add(fig)
        yield fig, axes
    except Exception as e:
        if fig is not None:
            plt.close(fig)
        raise
    finally:
        if fig is not None:
            plt.close(fig)
        cleanup_matplotlib()

def cleanup_matplotlib():
    """Comprehensive matplotlib cleanup"""
    try:
        # Close all figures
        plt.close('all')
        
        # Clear any remaining figures from the figure manager
        try:
            import matplotlib._pylab_helpers as pylab_helpers
            if hasattr(pylab_helpers, 'Gcf'):
                pylab_helpers.Gcf.destroy_all()
        except ImportError:
            pass
        
        # Clear matplotlib cache
        if hasattr(plt, 'rcdefaults'):
            plt.rcdefaults()
        
        # Force garbage collection
        gc.collect()
        
        # Clear seaborn cache if available
        try:
            import seaborn as sns
            if hasattr(sns, 'reset_defaults'):
                sns.reset_defaults()
        except:
            pass
            
    except Exception:
        # Silently ignore cleanup errors
        pass

def safe_plot_to_base64(fig):
    """Convert matplotlib figure to base64 string with safe cleanup"""
    buffer = None
    try:
        with io.BytesIO() as buffer:
            fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return image_base64
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate plot: {str(e)}")
    finally:
        if fig is not None:
            plt.close(fig)
        if buffer is not None:
            buffer.close()
        cleanup_matplotlib()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://oply.vercel.app",
        "http://localhost:3000",
        "https://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockAnalysisRequest(BaseModel):
    stocks1: List[str]
    stocks2: List[str]
    start_date: str  # Format: "YYYY-MM-DD"
    end_date: str    # Format: "YYYY-MM-DD"
    period: Optional[str] = "1d"

class CointegrationRequest(BaseModel):
    stocks1: List[str]
    stocks2: List[str]
    start_date: str
    end_date: str
    period: Optional[str] = "1d"

class CompanyInfoRequest(BaseModel):
    ticker: str

class OptionChainRequest(BaseModel):
    ticker: str
    expiry: Optional[str] = None

class BlackScholesRequest(BaseModel):
    S: float  # Current stock price
    K: float  # Strike price
    T: float  # Time to expiration (in years)
    r: float  # Risk-free rate
    sigma: float  # Volatility
    option_type: str = 'call'  # 'call' or 'put'

class OptionLeg(BaseModel):
    strike: float
    premium: float
    option_type: str  # 'call' or 'put'
    position: int     # 1 for buy, -1 for sell
    
class OptionsStrategyRequest(BaseModel):
    ticker: str
    spot_price: Optional[float] = None
    volatility: float  # in percentage
    rate: float       # in percentage
    days_to_expiry: int
    options: List[OptionLeg]

def download_stock_data(stocks, start_date, end_date, period="1d"):
    """Download stock data with error handling"""
    data = yf.download(stocks, start=start_date, end=end_date, period=period)
    if data is None or data.empty:
        raise HTTPException(status_code=400, detail=f"Failed to download data for {stocks}")
    return data



@app.get("/")
async def root():
    return {"message": "Stock Analysis API", "version": "1.0.0", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Lightweight health check endpoint for Render"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "port": "ready"}

@app.get("/ready")
async def readiness_check():
    """Readiness probe for container orchestration"""
    return {"status": "ready", "service": "Stock Analysis API"}

@app.get("/memory/status")
async def memory_status():
    """Get memory usage and matplotlib figure status"""
    try:
        import psutil
        import os
        
        # Get process memory info
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        
        # Get matplotlib figure count
        fig_count = len(plt.get_fignums())
        
        # Get active figures count from our tracking
        active_figs = len(_active_figures)
        
        return {
            "memory_mb": memory_info.rss / 1024 / 1024,
            "virtual_memory_mb": memory_info.vms / 1024 / 1024,
            "matplotlib_figures": fig_count,
            "tracked_figures": active_figs,
            "status": "healthy" if fig_count == 0 else "warning"
        }
    except ImportError:
        return {
            "memory_mb": "unavailable",
            "virtual_memory_mb": "unavailable",
            "matplotlib_figures": len(plt.get_fignums()),
            "tracked_figures": len(_active_figures),
            "status": "partial"
        }

@app.post("/memory/cleanup")
async def force_cleanup():
    """Force comprehensive cleanup of matplotlib resources"""
    try:
        initial_figs = len(plt.get_fignums())
        cleanup_matplotlib()
        final_figs = len(plt.get_fignums())
        
        return {
            "status": "success",
            "figures_closed": initial_figs - final_figs,
            "remaining_figures": final_figs
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/analysis/comparative")
async def comparative_analysis(request: StockAnalysisRequest):
    """Perform comparative analysis between two stocks"""
    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        # Download data
        period = request.period or "1d"
        data1 = download_stock_data(request.stocks1, start_date, end_date, period)
        data2 = download_stock_data(request.stocks2, start_date, end_date, period)
        
        # Extract closing prices
        close1 = data1["Close"].squeeze()
        close2 = data2["Close"].squeeze()
        
        # Calculate log returns
        log_returns1 = np.log(close1 / close1.shift(1)).dropna()
        log_returns2 = np.log(close2 / close2.shift(1)).dropna()
        
        # Calculate statistics
        stat1 = analisi_statistiche(request.stocks1[0], log_returns1)
        stat2 = analisi_statistiche(request.stocks2[0], log_returns2)
        
        # Add autocorrelation
        stat1['acf'] = log_returns1.autocorr(lag=1)
        stat2['acf'] = log_returns2.autocorr(lag=1)
        
        # Generate comparative analysis
        comparative_output = analisi_comparata_completa_con_asimmetria_graduale(
            request.stocks1[0], stat1,
            request.stocks2[0], stat2,
        )
        
        return {
            "stocks": {
                "stock1": request.stocks1[0],
                "stock2": request.stocks2[0]
            },
            "statistics": {
                "stock1": stat1,
                "stock2": stat2
            },
            "comparative_analysis": comparative_output,
            "data_points": {
                "stock1_count": len(log_returns1),
                "stock2_count": len(log_returns2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/visualizations")
async def generate_visualizations(request: StockAnalysisRequest):
    """Generate comprehensive visualizations for stock analysis"""
    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        # Download data
        period = request.period or "1d"
        data1 = download_stock_data(request.stocks1, start_date, end_date, period)
        data2 = download_stock_data(request.stocks2, start_date, end_date, period)
        
        close1 = data1["Close"].squeeze()
        close2 = data2["Close"].squeeze()
        log_returns1 = np.log(close1 / close1.shift(1)).dropna()
        log_returns2 = np.log(close2 / close2.shift(1)).dropna()
        
        # Calculate correlations
        corr_60 = close1.rolling(60).corr(close2)
        corr_120 = close1.rolling(120).corr(close2)
        corr_240 = close1.rolling(240).corr(close2)
        smooth_corr_60 = corr_60.rolling(10).mean()
        smooth_corr_120 = corr_120.rolling(10).mean()
        smooth_corr_240 = corr_240.rolling(10).mean()
        
        # Statistics for plotting
        x_min = min(log_returns1.min(), log_returns2.min())
        x_max = max(log_returns1.max(), log_returns2.max())
        density1 = gaussian_kde(log_returns1)
        density2 = gaussian_kde(log_returns2)
        density_max = max(density1(density1.dataset).max(), density2(density2.dataset).max())
        
        y_ret_min = min(log_returns1.min(), log_returns2.min())
        y_ret_max = max(log_returns1.max(), log_returns2.max())
        ret_margin = 0.05 * (y_ret_max - y_ret_min)
        
        # Create comprehensive plot with safe context
        plt.style.use('default')
        with safe_figure_context(figsize=(18, 16), dpi=100) as fig:
            gs = gridspec.GridSpec(4, 2, height_ratios=[1, 1, 1, 1])
            
            # Row 1: Prices with dual axis
            ax0 = plt.subplot(gs[0, :])
            ax0b = ax0.twinx()
            l1, = ax0.plot(close1, color='blue', label=request.stocks1[0])
            l2, = ax0b.plot(close2, color='red', label=request.stocks2[0])
            ax0.set_ylabel(request.stocks1[0], color='blue')
            ax0.tick_params(axis='y', labelcolor='blue')
            ax0b.set_ylabel(request.stocks2[0], color='red')
            ax0b.tick_params(axis='y', labelcolor='red')
            ax0.set_title(f'Prices {request.stocks1[0]} (left) & {request.stocks2[0]} (right)')
            ax0.set_xlabel('Date')
            ax0.legend([l1, l2], [request.stocks1[0], request.stocks2[0]], loc='upper left')
            
            # Row 2: Moving correlations
            ax1 = plt.subplot(gs[1, :])
            ax1.plot(smooth_corr_60, label='60d', color='red')
            ax1.plot(smooth_corr_120, label='120d', color='green')
            ax1.plot(smooth_corr_240, label='240d', color='blue')
            ax1.axhline(0, color='gray', linestyle='--', linewidth=0.8)
            ax1.set_title(f'Moving Correlations between {request.stocks1[0]} and {request.stocks2[0]}')
            ax1.set_xlabel('Date')
            ax1.set_ylabel('Correlation')
            ax1.legend()
            ax1.grid(True)
            
            # Row 3: Log returns
            ax2 = plt.subplot(gs[2, 0])
            ax2.plot(log_returns1.index, log_returns1, color='blue')
            ax2.set_title(f'Log Returns {request.stocks1[0]}')
            ax2.set_xlabel('Date')
            ax2.set_ylabel('Log Return')
            ax2.set_ylim(y_ret_min - ret_margin, y_ret_max + ret_margin)
            ax2.grid(True)
            
            ax3 = plt.subplot(gs[2, 1])
            ax3.plot(log_returns2.index, log_returns2, color='red')
            ax3.set_title(f'Log Returns {request.stocks2[0]}')
            ax3.set_xlabel('Date')
            ax3.set_ylabel('Log Return')
            ax3.set_ylim(y_ret_min - ret_margin, y_ret_max + ret_margin)
            ax3.grid(True)
            
            # Row 4: Distributions
            ax4 = plt.subplot(gs[3, 0])
            sns.histplot(log_returns1, bins=30, kde=True, color='blue', stat='density', ax=ax4)
            ax4.set_title(f'Distribution Log Returns {request.stocks1[0]}')
            ax4.set_ylim(0, density_max * 1.1)
            ax4.set_xlim(x_min, x_max)
            
            ax5 = plt.subplot(gs[3, 1])
            sns.histplot(log_returns2, bins=30, kde=True, color='red', stat='density', ax=ax5)
            ax5.set_title(f'Distribution Log Returns {request.stocks2[0]}')
            ax5.set_ylim(0, density_max * 1.1)
            ax5.set_xlim(x_min, x_max)
            
            plt.tight_layout()
            
            # Convert to base64
            visualization_base64 = safe_plot_to_base64(fig)
        
        return {
            "visualization": visualization_base64,
            "format": "png",
            "description": "Comprehensive stock analysis visualization including prices, correlations, returns, and distributions"
        }
        
    except Exception as e:
        cleanup_matplotlib()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_matplotlib()

@app.post("/analysis/cointegration")
async def cointegration_analysis(request: CointegrationRequest):
    """Perform cointegration analysis between two stocks"""
    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        # Download data
        period = request.period or "1d"
        data1 = download_stock_data(request.stocks1, start_date, end_date, period)
        data2 = download_stock_data(request.stocks2, start_date, end_date, period)
        
        close1 = data1["Close"].squeeze()
        close2 = data2["Close"].squeeze()
        
        # Regression 1: stock2 ~ stock1
        X1 = close1.values.reshape(-1, 1)
        y1 = close2.values
        X1_ols = sm.add_constant(X1)
        model1 = sm.OLS(y1, X1_ols).fit()
        y1_pred = model1.predict(X1_ols)
        residuals1 = y1 - y1_pred
        r2_1 = model1.rsquared
        adf_result1 = adfuller(residuals1)
        
        # Regression 2: stock1 ~ stock2
        X2 = close2.values.reshape(-1, 1)
        y2 = close1.values
        X2_ols = sm.add_constant(X2)
        model2 = sm.OLS(y2, X2_ols).fit()
        y2_pred = model2.predict(X2_ols)
        residuals2 = y2 - y2_pred
        r2_2 = model2.rsquared
        adf_result2 = adfuller(residuals2)
        
        # Determine cointegration
        cointegrated = False
        best_model = None
        interpretation = ""
        
        if adf_result1[1] < 0.05 or adf_result2[1] < 0.05:
            cointegrated = True
            if adf_result1[1] < adf_result2[1]:
                best_model = 1
                interpretation = f"{request.stocks2[0]} and {request.stocks1[0]} are cointegrated according to regression 1 where {request.stocks2[0]} is Y and {request.stocks1[0]} is X"
            else:
                best_model = 2
                interpretation = f"{request.stocks1[0]} and {request.stocks2[0]} are cointegrated according to regression 2 where {request.stocks1[0]} is Y and {request.stocks2[0]} is X"
        else:
            interpretation = f"{request.stocks1[0]} and {request.stocks2[0]} are not cointegrated"
        
        return {
            "stocks": {
                "stock1": request.stocks1[0],
                "stock2": request.stocks2[0]
            },
            "cointegration_results": {
                "cointegrated": cointegrated,
                "best_model": best_model,
                "interpretation": interpretation
            },
            "regression_1": {
                "dependent": request.stocks2[0],
                "independent": request.stocks1[0],
                "r_squared": r2_1,
                "adf_statistic": adf_result1[0],
                "adf_p_value": adf_result1[1],
                "adf_critical_values": {
                    "1%": adf_result1[4].get("1%", None) if len(adf_result1) > 4 else None,
                    "5%": adf_result1[4].get("5%", None) if len(adf_result1) > 4 else None,
                    "10%": adf_result1[4].get("10%", None) if len(adf_result1) > 4 else None
                }
            },
            "regression_2": {
                "dependent": request.stocks1[0],
                "independent": request.stocks2[0],
                "r_squared": r2_2,
                "adf_statistic": adf_result2[0],
                "adf_p_value": adf_result2[1],
                "adf_critical_values": {
                    "1%": adf_result2[4].get("1%", None) if len(adf_result2) > 4 else None,
                    "5%": adf_result2[4].get("5%", None) if len(adf_result2) > 4 else None,
                    "10%": adf_result2[4].get("10%", None) if len(adf_result2) > 4 else None
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/cointegration/plots")
async def cointegration_plots(request: CointegrationRequest):
    """Generate cointegration analysis plots"""
    try:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        # Download data and perform calculations (same as above)
        period = request.period or "1d"
        data1 = download_stock_data(request.stocks1, start_date, end_date, period)
        data2 = download_stock_data(request.stocks2, start_date, end_date, period)
        
        close1 = data1["Close"].squeeze()
        close2 = data2["Close"].squeeze()
        
        # Regression analysis
        X1 = close1.values.reshape(-1, 1)
        y1 = close2.values
        X1_ols = sm.add_constant(X1)
        model1 = sm.OLS(y1, X1_ols).fit()
        y1_pred = model1.predict(X1_ols)
        residuals1 = y1 - y1_pred
        r2_1 = model1.rsquared
        
        X2 = close2.values.reshape(-1, 1)
        y2 = close1.values
        X2_ols = sm.add_constant(X2)
        model2 = sm.OLS(y2, X2_ols).fit()
        y2_pred = model2.predict(X2_ols)
        residuals2 = y2 - y2_pred
        r2_2 = model2.rsquared
        
        # Plot 1: Regression 1
        plt.style.use('default')
        with safe_subplots_context(3, 1, figsize=(10, 12), dpi=100) as (fig1, axs1):
            axs1[0].scatter(close1, close2, alpha=0.5, label='Data')
            axs1[0].plot(close1, y1_pred, color='red', label='Regression')
            axs1[0].set_title(f'{request.stocks2[0]} ~ {request.stocks1[0]} - Regression')
            axs1[0].set_xlabel(f'Price {request.stocks1[0]}')
            axs1[0].set_ylabel(f'Price {request.stocks2[0]}')
            axs1[0].legend()
            axs1[0].grid(True)
            axs1[0].text(0.95, 0.05, f'R² = {r2_1:.2f}', transform=axs1[0].transAxes,
                         fontsize=12, verticalalignment='bottom', horizontalalignment='right',
                         bbox=dict(boxstyle='round', facecolor='white', edgecolor='gray'))
            
            axs1[1].scatter(close1, residuals1, alpha=0.5, label='Residuals')
            axs1[1].axhline(0, color='red', linestyle='--')
            axs1[1].set_title(f'Residuals - {request.stocks2[0]} ~ {request.stocks1[0]}')
            axs1[1].set_xlabel(f'Price {request.stocks1[0]}')
            axs1[1].set_ylabel('Residual')
            axs1[1].legend()
            axs1[1].grid(True)
            
            axs1[2].plot(close1.index, residuals1, label='Residuals', color='purple')
            axs1[2].axhline(0, color='red', linestyle='--')
            axs1[2].set_title('Time series of residuals')
            axs1[2].set_xlabel('Date')
            axs1[2].set_ylabel('Residual')
            axs1[2].legend()
            axs1[2].grid(True)
            
            plt.tight_layout()
            plot1_base64 = safe_plot_to_base64(fig1)
        
        # Plot 2: Regression 2
        plt.style.use('default')
        with safe_subplots_context(3, 1, figsize=(10, 12), dpi=100) as (fig2, axs2):
            axs2[0].scatter(close2, close1, alpha=0.5, label='Data')
            axs2[0].plot(close2, y2_pred, color='blue', label='Regression')
            axs2[0].set_title(f'{request.stocks1[0]} ~ {request.stocks2[0]} - Regression')
            axs2[0].set_xlabel(f'Price {request.stocks2[0]}')
            axs2[0].set_ylabel(f'Price {request.stocks1[0]}')
            axs2[0].legend()
            axs2[0].grid(True)
            axs2[0].text(0.95, 0.05, f'R² = {r2_2:.2f}', transform=axs2[0].transAxes,
                         fontsize=12, verticalalignment='bottom', horizontalalignment='right',
                         bbox=dict(boxstyle='round', facecolor='white', edgecolor='gray'))
            
            axs2[1].scatter(close2, residuals2, alpha=0.5, label='Residuals')
            axs2[1].axhline(0, color='red', linestyle='--')
            axs2[1].set_title(f'Residuals - {request.stocks1[0]} ~ {request.stocks2[0]}')
            axs2[1].set_xlabel(f'Price {request.stocks2[0]}')
            axs2[1].set_ylabel('Residual')
            axs2[1].legend()
            axs2[1].grid(True)
            
            axs2[2].plot(close2.index, residuals2, label='Residuals', color='green')
            axs2[2].axhline(0, color='red', linestyle='--')
            axs2[2].set_title(f'Time series of residuals - {request.stocks1[0]} ~ {request.stocks2[0]}')
            axs2[2].set_xlabel('Date')
            axs2[2].set_ylabel('Residual')
            axs2[2].legend()
            axs2[2].grid(True)
            
            plt.tight_layout()
            plot2_base64 = safe_plot_to_base64(fig2)
        
        return {
            "regression_plots": {
                "plot1": {
                    "title": f"{request.stocks2[0]} ~ {request.stocks1[0]} Analysis",
                    "image": plot1_base64,
                    "r_squared": r2_1
                },
                "plot2": {
                    "title": f"{request.stocks1[0]} ~ {request.stocks2[0]} Analysis", 
                    "image": plot2_base64,
                    "r_squared": r2_2
                }
            },
            "format": "png"
        }
        
    except Exception as e:
        cleanup_matplotlib()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_matplotlib()

@app.post("/company/info")
async def get_company_info(request: CompanyInfoRequest):
    """Get comprehensive company information"""
    try:
        ticker = yf.Ticker(request.ticker)
        info = ticker.info
        officers = info.get('companyOfficers', [])
        executives = [o for o in officers if 'CEO' in o.get('title', '') or 'CFO' in o.get('title', '')]

        return {
            "ticker": request.ticker,
            "basic_info": {
                "shortName": info.get('shortName'),
                "longName": info.get('longName'),
                "country": info.get('country'),
                "industry": info.get('industry'),
                "sector": info.get('sector'),
                "longBusinessSummary": info.get('longBusinessSummary'),
                "fullTimeEmployees": info.get('fullTimeEmployees'),
                "exchange": info.get('exchange')
            },
            "price_data": {
                "previousClose": info.get('previousClose'),
                "open": info.get('open'),
                "dayLow": info.get('dayLow'),
                "dayHigh": info.get('dayHigh'),
                "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow'),
                "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
                "twoHundredDayAverage": info.get('twoHundredDayAverage'),
                "marketCap": info.get('marketCap'),
                "marketState": info.get('marketState')
            },
            "dividend_info": {
                "dividendRate": info.get('dividendRate'),
                "dividendYield": info.get('dividendYield'),
                "fiveYearAvgDividendYield": info.get('fiveYearAvgDividendYield'),
                "trailingAnnualDividendRate": info.get('trailingAnnualDividendRate')
            },
            "executives": executives
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch company info: {str(e)}")

@app.post("/options/chain")
async def get_option_chain(request: OptionChainRequest):
    """Get option chain data for a specific ticker and expiry"""
    try:
        stock = yf.Ticker(request.ticker)
        expiries = stock.options
        
        if not expiries:
            raise HTTPException(status_code=404, detail="No options available for this ticker")
        
        result = {
            "ticker": request.ticker,
            "available_expiries": list(expiries)
        }
        
        if request.expiry:
            if request.expiry not in expiries:
                raise HTTPException(status_code=400, detail=f"Expiry {request.expiry} not available")
            
            options = stock.option_chain(request.expiry)
            
            # Replace NaN with None for JSON compatibility
            calls_df = options.calls.replace({np.nan: None})
            puts_df = options.puts.replace({np.nan: None})

            result["expiry"] = request.expiry
            result["calls"] = calls_df.to_dict(orient='records')
            result["puts"] = puts_df.to_dict(orient='records')
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch option chain: {str(e)}")

@app.post("/options/blackscholes")
async def calculate_black_scholes(request: BlackScholesRequest):
    """Calculate Black-Scholes option price and Greeks"""
    try:
        price = black_scholes(request.S, request.K, request.T, request.r, request.sigma, request.option_type)
        greeks = black_scholes_greeks(request.S, request.K, request.T, request.r, request.sigma, request.option_type)
        
        return {
            "parameters": {
                "spot_price": request.S,
                "strike_price": request.K,
                "time_to_expiry": request.T,
                "risk_free_rate": request.r,
                "volatility": request.sigma,
                "option_type": request.option_type
            },
            "option_price": price,
            "greeks": greeks
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to calculate Black-Scholes: {str(e)}")

@app.post("/options/strategy")
async def simulate_options_strategy(request: OptionsStrategyRequest):
    """Simulate options strategy with payoff and Greeks"""
    try:
        T = request.days_to_expiry / 365  # Convert days to years
        sigma = request.volatility / 100
        r = request.rate / 100
        spot_price = request.spot_price

        if spot_price is None:
            ticker = yf.Ticker(request.ticker)
            info = ticker.info
            spot_price = info.get("ask")
            if spot_price is None:
                raise HTTPException(status_code=400, detail=f"Could not fetch current price for {request.ticker}")
        
        # Create price range for simulation
        buffer = spot_price * 0.75
        S_min = max(0, spot_price - buffer)
        S_max = spot_price + buffer
        S_range = np.linspace(S_min, S_max, 100)
        
        # Initialize arrays
        payoff_at_expiry = np.zeros_like(S_range)
        current_pnl = np.zeros_like(S_range)
        
        # Initialize total greeks
        total_greeks = {'delta': 0, 'gamma': 0, 'vega': 0, 'theta': 0, 'rho': 0}
        
        strategy_details = []
        
        for option in request.options:
            # Calculate greeks at current spot
            greeks = black_scholes_greeks(spot_price, option.strike, T, r, sigma, option.option_type)
            
            # Add to total greeks (weighted by position)
            for key in total_greeks:
                total_greeks[key] += option.position * greeks[key]
            
            # Payoff at expiry
            if option.option_type == 'call':
                payoff_leg = np.maximum(S_range - option.strike, 0)
            else:
                payoff_leg = np.maximum(option.strike - S_range, 0)
            
            payoff_at_expiry += option.position * (payoff_leg - option.premium)
            
            # Current theoretical value (Black-Scholes)
            bs_values = np.array([black_scholes(S, option.strike, T, r, sigma, option.option_type) for S in S_range])
            current_pnl += option.position * (bs_values - option.premium)
            
            strategy_details.append({
                "strike": option.strike,
                "premium": option.premium,
                "type": option.option_type,
                "position": "Long" if option.position > 0 else "Short",
                "quantity": abs(option.position),
                "greeks": greeks
            })
        
        return {
            "strategy_parameters": {
                "spot_price": spot_price,
                "volatility_pct": request.volatility,
                "rate_pct": request.rate,
                "days_to_expiry": request.days_to_expiry
            },
            "strategy_details": strategy_details,
            "total_greeks": total_greeks,
            "simulation": {
                "price_range": S_range.tolist(),
                "payoff_at_expiry": payoff_at_expiry.tolist(),
                "current_pnl": current_pnl.tolist()
            },
            "max_profit": float(np.max(payoff_at_expiry)) if np.max(payoff_at_expiry) < np.inf else "Unlimited",
            "max_loss": float(np.min(payoff_at_expiry)) if np.min(payoff_at_expiry) > -np.inf else "Unlimited",
            "breakeven_points": []  # Could calculate specific breakeven points if needed
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to simulate strategy: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Initial cleanup
    cleanup_matplotlib()
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 