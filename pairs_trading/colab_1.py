import yfinance as yf
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller
from funzioni import (
    analisi_comparata_completa_con_asimmetria_graduale,
    analisi_statistiche,
    analisi_statistiche_TAB,
)
from datetime import datetime
from scipy.stats import gaussian_kde
import gc

def cleanup_matplotlib():
    """Comprehensive matplotlib cleanup"""
    try:
        plt.close('all')
        gc.collect()
    except Exception:
        pass


######## INPUT!##########
# Modifica qui sotto i parametri per il tuo caso d'uso
########################
# Ticker e data di inizio E PERIODO (TIMEFRAME)
stocks1 = ["MSFT"]
stocks2 = ["TSLA"]

start_date = datetime(2022, 1, 3)
end_date = datetime(2025, 5, 1)

period = "1d"  # weekly, orario, giornaliero (default)
########################


# Scarichiamo i dati
data1 = yf.download(stocks1, start=start_date, end=end_date, period=period)
data2 = yf.download(stocks2, start=start_date, end=end_date, period=period)

# Estraiamo le chiusure giornaliere
close1 = data1["Close"].squeeze()
close2 = data2["Close"].squeeze()

# Calcoliamo log-rendimenti (variazioni tra un giorno e l'altro)
log_returns1 = np.log(close1 / close1.shift(1)).dropna()
log_returns2 = np.log(close2 / close2.shift(1)).dropna()


# Calcola le statistiche descrittive per ciascun titolo
stat1 = analisi_statistiche(stocks1[0], log_returns1)
stat2 = analisi_statistiche(stocks2[0], log_returns2)

# Aggiungi l'autocorrelazione (lag 1)
stat1["acf"] = log_returns1.autocorr(lag=1)
stat2["acf"] = log_returns2.autocorr(lag=1)


#########################       COMPARAZIONE TRA I DUE TITOLI
# Genera l'analisi comparata tra i due titoli
output = analisi_comparata_completa_con_asimmetria_graduale(
    stocks1[0],
    stat1,
    stocks2[0],
    stat2,
)

# Stampa le frasi di output comparazione
print("\n\nAnalisi comparativa tra i due titoli:")
print("----------------------------------------")
for frase in output:
    print(frase)


##############
#### SUPERPLOT - ANALISI ASSET: PREZZI, RENDIMENTI, DISTRIBUZIONE
###############
import pandas as pd
import yfinance as yf
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from scipy.stats import gaussian_kde

# --- Input ---
stocks1 = ["MSFT"]
stocks2 = ["TSLA"]
start_date = datetime(2022, 1, 3)
end_date = datetime(2025, 5, 1)
period = "1d"

# --- Scarica i dati ---
data1 = yf.download(stocks1, start=start_date, end=end_date, period=period)
data2 = yf.download(stocks2, start=start_date, end=end_date, period=period)
close1 = data1["Close"].squeeze()
close2 = data2["Close"].squeeze()

# --- Calcola log-rendimenti ---
log_returns1 = np.log(close1 / close1.shift(1)).dropna()
log_returns2 = np.log(close2 / close2.shift(1)).dropna()


# --- Correlazioni mobili lisce ---
corr_60 = close1.rolling(60).corr(close2)
corr_120 = close1.rolling(120).corr(close2)
corr_240 = close1.rolling(240).corr(close2)
smooth_corr_60 = corr_60.rolling(10).mean()
smooth_corr_120 = corr_120.rolling(10).mean()
smooth_corr_240 = corr_240.rolling(10).mean()
y_corr_min = min(smooth_corr_60.min(), smooth_corr_120.min(), smooth_corr_240.min())
y_corr_max = max(smooth_corr_60.max(), smooth_corr_120.max(), smooth_corr_240.max())
corr_margin = 0.05 * (y_corr_max - y_corr_min)


# --- Statistiche per istogrammi ---
x_min = min(log_returns1.min(), log_returns2.min())
x_max = max(log_returns1.max(), log_returns2.max())
density1 = gaussian_kde(log_returns1)
density2 = gaussian_kde(log_returns2)
density_max = max(density1(density1.dataset).max(), density2(density2.dataset).max())
# --- Intervallo comune asse y log-rendimenti ---
y_ret_min = min(log_returns1.min(), log_returns2.min())
y_ret_max = max(log_returns1.max(), log_returns2.max())
ret_margin = 0.05 * (y_ret_max - y_ret_min)


# --- Setup figura con GridSpec ---
import matplotlib.gridspec as gridspec

fig = plt.figure(figsize=(18, 16))
gs = gridspec.GridSpec(4, 2, height_ratios=[1, 1, 1, 1])

#############################
# === RIGA 1: Prezzi con doppio asse ===
ax0 = plt.subplot(gs[0, :])
ax0b = ax0.twinx()
(l1,) = ax0.plot(close1, color="blue", label="MSFT")
(l2,) = ax0b.plot(close2, color="red", label="TSLA")
ax0.set_ylabel("MSFT", color="blue")
ax0.tick_params(axis="y", labelcolor="blue")
ax0b.set_ylabel("TSLA", color="red")
ax0b.tick_params(axis="y", labelcolor="red")
ax0.set_title("Prezzi MSFT (sinistra) & TSLA (destra)")
ax0.set_xlabel("Data")
ax0.legend([l1, l2], ["MSFT", "TSLA"], loc="upper left")
########################
###== RIGA 2: Correlazioni mobili lisce (grafico unico) ===
ax1 = plt.subplot(gs[1, :])
ax1.plot(smooth_corr_60, label="60d", color="red")
ax1.plot(smooth_corr_120, label="120d", color="green")
ax1.plot(smooth_corr_240, label="240d", color="blue")
ax1.set_ylim(y_corr_min - corr_margin, y_corr_max + corr_margin)
ax1.axhline(0, color="gray", linestyle="--", linewidth=0.8)
ax1.set_title("Correlazioni Mobili Lisce tra MSFT e TSLA")
ax1.set_xlabel("Data")
ax1.set_ylabel("Correlazione")
ax1.legend()
ax1.grid(True)

#########################
###à= RIGA 3: Log-Rendimenti (con y condiviso) ===
ax2 = plt.subplot(gs[2, 0])
ax2.plot(log_returns1.index, log_returns1, color="blue")
ax2.set_title("Log-Rendimenti MSFT")
ax2.set_xlabel("Data")
ax2.set_ylabel("Log-Rendimento")
ax2.set_ylim(y_ret_min - ret_margin, y_ret_max + ret_margin)
ax2.grid(True)

ax3 = plt.subplot(gs[2, 1])
ax3.plot(log_returns2.index, log_returns2, color="red")
ax3.set_title("Log-Rendimenti TSLA")
ax3.set_xlabel("Data")
ax3.set_ylabel("Log-Rendimento")
ax3.set_ylim(y_ret_min - ret_margin, y_ret_max + ret_margin)
ax3.grid(True)

##############################
# === RIGA 4: Distribuzioni ===
ax4 = plt.subplot(gs[3, 0])
sns.histplot(log_returns1, bins=30, kde=True, color="blue", stat="density", ax=ax4)
ax4.set_title("Distribuzione Log-Rendimenti MSFT")
ax4.set_ylim(0, density_max * 1.1)
ax4.set_xlim(x_min, x_max)

ax5 = plt.subplot(gs[3, 1])
sns.histplot(log_returns2, bins=30, kde=True, color="red", stat="density", ax=ax5)
ax5.set_title("Distribuzione Log-Rendimenti TSLA")
ax5.set_ylim(0, density_max * 1.1)
ax5.set_xlim(x_min, x_max)

# === Finalizza layout ===
plt.tight_layout()
plt.show()

# Cleanup matplotlib
cleanup_matplotlib()

# Cleanup matplotlib
cleanup_matplotlib()


#############################
####### TABELLA STATISTICHE DESCRITTIVE
analisi_statistiche_TAB(stocks1[0], log_returns1, stocks2[0], log_returns2)


##############################
###### COINTEGRAZIONE: REGRESSIONI LINEARI E ANALISI DEI RESIDUI
#############################


# Regressione TSLA ~ MSFT
X1 = close1.values.reshape(-1, 1)
y1 = close2.values
X1_ols = sm.add_constant(X1)
model1 = sm.OLS(y1, X1_ols).fit()
y1_pred = model1.predict(X1_ols)
residuals1 = y1 - y1_pred
r2_1 = model1.rsquared
adf_result1 = adfuller(residuals1)


# Regressione MSFT ~ TSLA
X2 = close2.values.reshape(-1, 1)
y2 = close1.values
X2_ols = sm.add_constant(X2)
model2 = sm.OLS(y2, X2_ols).fit()
y2_pred = model2.predict(X2_ols)
residuals2 = y2 - y2_pred
r2_2 = model2.rsquared
adf_result2 = adfuller(residuals2)

# --- Primo subplot: TSLA ~ MSFT ---
fig1, axs1 = plt.subplots(3, 1, figsize=(10, 12))

# Scatter con retta di regressione
axs1[0].scatter(close1, close2, alpha=0.5, label="Dati")
axs1[0].plot(close1, y1_pred, color="red", label="Regressione")
axs1[0].set_title("TSLA ~ MSFT - Regressione")
axs1[0].set_xlabel("Prezzo MSFT")
axs1[0].set_ylabel("Prezzo TSLA")
axs1[0].legend()
axs1[0].grid(True)
axs1[0].text(
    0.95,
    0.05,
    f"R² = {r2_1:.2f}",
    transform=axs1[0].transAxes,
    fontsize=12,
    verticalalignment="bottom",
    horizontalalignment="right",
    bbox=dict(boxstyle="round", facecolor="white", edgecolor="gray"),
)

# Scatter dei residui
axs1[1].scatter(close1, residuals1, alpha=0.5, label="Residui")
axs1[1].axhline(0, color="red", linestyle="--")
axs1[1].set_title("Residui - TSLA ~ MSFT")
axs1[1].set_xlabel("Prezzo MSFT")
axs1[1].set_ylabel("Residuo")
axs1[1].legend()
axs1[1].grid(True)

# Serie temporale dei residui
axs1[2].plot(close1.index, residuals1, label="Residui", color="purple")
axs1[2].axhline(0, color="red", linestyle="--")
axs1[2].set_title("Serie temporale dei residui ")
axs1[2].set_xlabel("Data")
axs1[2].set_ylabel("Residuo")
axs1[2].legend()
axs1[2].grid(True)

plt.tight_layout()
plt.show()

# --- Secondo subplot: MSFT ~ TSLA ---
fig2, axs2 = plt.subplots(3, 1, figsize=(10, 12))

# Scatter con retta di regressione
axs2[0].scatter(close2, close1, alpha=0.5, label="Dati")
axs2[0].plot(close2, y2_pred, color="blue", label="Regressione")
axs2[0].set_title("MSFT ~ TSLA - Regressione")
axs2[0].set_xlabel("Prezzo TSLA")
axs2[0].set_ylabel("Prezzo MSFT")
axs2[0].legend()
axs2[0].grid(True)
axs2[0].text(
    0.95,
    0.05,
    f"R² = {r2_2:.2f}",
    transform=axs2[0].transAxes,
    fontsize=12,
    verticalalignment="bottom",
    horizontalalignment="right",
    bbox=dict(boxstyle="round", facecolor="white", edgecolor="gray"),
)

# Scatter dei residui
axs2[1].scatter(close2, residuals2, alpha=0.5, label="Residui")
axs2[1].axhline(0, color="red", linestyle="--")
axs2[1].set_title("Residui - MSFT ~ TSLA")
axs2[1].set_xlabel("Prezzo TSLA")
axs2[1].set_ylabel("Residuo")
axs2[1].legend()
axs2[1].grid(True)

# Serie temporale dei residui
axs2[2].plot(close2.index, residuals2, label="Residui", color="green")
axs2[2].axhline(0, color="red", linestyle="--")
axs2[2].set_title("Serie temporale dei residui - MSFT ~ TSLA")
axs2[2].set_xlabel("Data")
axs2[2].set_ylabel("Residuo")
axs2[2].legend()
axs2[2].grid(True)

plt.tight_layout()
plt.show()


#########################
########################## TEST DI COINTEGRAZIONE: ADF SUI RESIDUI
# --- Risultati dei test ADF ---
print("\nTest ADF per i residui della regressione TSLA ~ MSFT:")
print("ADF Statistic:", adf_result1[0])
print("p-value:", adf_result1[1])

print("\nTest ADF per i residui della regressione MSFT ~ TSLA:")
print("ADF Statistic:", adf_result2[0])
print("p-value:", adf_result2[1])


#### if adf_result_resid12[1] < adf_result_resid21[1]      MODELLO 1 MIGLIORE, ALTRIMENTI MODELLO 2 MIGLIORE

'''
se IL PVALUE IN GENERALE DI UNA QUALUNQUE COPPIA è MINORE DI 0.05 ALLORA I DUE ASSET 
SONO COINTEGRATI. Quindi prima verificare cghe almeno UNO dei due p-value < 0.05, 
ALTRIMENTI ENTRAMBI NON COINTEGRATI.
SE INVECE ENTRAMBI I P-VALUE SONO MINORI DI 0.05, prendi quello con pvalue minore. 
e di " PINCO E PALLO SONO COINTEGRATI SECONDO LA REGRESSIONE 1 è Y e l'altro è X"
'''