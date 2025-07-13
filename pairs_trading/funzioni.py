import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import shapiro, jarque_bera, skew, kurtosis


################
###############
# --- funzione ANALISI COMPARATIVE x DIDASCALIE ---
################


def analisi_comparata_completa_con_asimmetria_graduale(
    ticker_a,
    dev_a,
    ticker_b,
    dev_b,
    soglia_alta=1.25,
    soglia_bassa=0.8,
    acf_threshold=0.05,
    soglia_skew_leggera=0.1,
    soglia_skew_forte=0.4,
):
    """
    Analisi comparata completa tra due asset, includendo intensità dell'asimmetria.
    """

    a = ticker_a
    b = ticker_b
    sa = dev_a
    sb = dev_b
    r = []

    # --- VOLATILITÀ ---
    if sa["std"] > soglia_alta * sb["std"]:
        r.append(f"{a} è significativamente più volatile di {b}.")
    elif sa["std"] < soglia_bassa * sb["std"]:
        r.append(f"{a} è significativamente meno volatile di {b}.")
    else:
        r.append(f"{a} e {b} hanno una volatilità simile.")

    # --- KURTOSI ---
    if sa["kurtosis"] > 3 and sb["kurtosis"] > 3:
        r.append(
            f"Entrambi ({a} e {b}) mostrano code pesanti: forti variazioni dei prezzi si verificano più frequentemente."
        )
    elif sa["kurtosis"] > 3 and sb["kurtosis"] <= 3:
        r.append(
            f"{a} è maggiormente soggetto a variazioni estreme, mentre {b} segue una distribuzione più simile alla normale."
        )
    elif sa["kurtosis"] <= 3 and sb["kurtosis"] > 3:
        r.append(
            f"{b} è soggetto a eventi estremi, mentre {a} segue una distribuzione più simile alla normale."
        )
    else:
        r.append(
            f"{a} e {b} non mostrano particolare pesantezza nelle code e mantengono un livello di Kurtosi che riporta alla normale."
        )

    # --- SKEWNESS (ASIMMETRIA) con intensità ---
    skew_a = sa["skew"]
    skew_b = sb["skew"]

    def descrivi_skew(ticker, skew):
        if abs(skew) < soglia_skew_leggera:
            return f"{ticker} ha una distribuzione simmetrica"
        elif skew > soglia_skew_forte:
            return f"{ticker} è fortemente asimmetrico, mostra un'esposizione verso i rendimenti positivi"
        elif skew > soglia_skew_leggera:
            return (
                f"{ticker} mostra una asimmetria moderata verso i rendimenti positivi"
            )
        elif skew < -soglia_skew_forte:
            return f"{ticker} è fortemente asimmetrico. I rendimenti negativi sono più frequenti"
        elif skew < -soglia_skew_leggera:
            return f"{ticker} è moderatamente sbilanciato verso i rendimenti negativi"
        else:
            return f"{ticker} ha una distribuzione quasi simmetrica"

    skew_descrizione_a = descrivi_skew(a, skew_a)
    skew_descrizione_b = descrivi_skew(b, skew_b)

    if skew_descrizione_a == skew_descrizione_b:
        r.append(f"{skew_descrizione_a}, come anche {b}.")
    else:
        r.append(f"{skew_descrizione_a}, mentre {skew_descrizione_b}.")

    # --- AUTOCORRELAZIONE ---
    acf_a = sa["acf"]
    acf_b = sb["acf"]

    if acf_a > acf_threshold and acf_b < acf_threshold:
        r.append(f"{a} mostra autocorrelazione significativa, mentre {b} no.")
    elif acf_a < acf_threshold and acf_b > acf_threshold:
        r.append(f"{b} mostra autocorrelazione significativa, mentre {a} no.")
    elif acf_a > acf_threshold and acf_b > acf_threshold:
        if abs(acf_a - acf_b) < 0.01:
            r.append(f"{a} e {b} mostrano autocorrelazione simile.")
        elif acf_a > acf_b:
            r.append(f"{a} mostra autocorrelazione più marcata rispetto a {b}.")
        else:
            r.append(f"{b} mostra autocorrelazione più marcata rispetto a {a}.")
    else:
        r.append(f"Nessuno dei due ({a}, {b}) mostra autocorrelazione significativa.")

    # --- PROFILO GENERALE SIMILE ---
    if (
        abs(sa["std"] - sb["std"]) < 0.01
        and abs(sa["kurtosis"] - sb["kurtosis"]) < 0.2
        and abs(sa["skew"] - sb["skew"]) < 0.1
    ):
        r.append(
            f"{a} e {b} hanno un profilo statistico molto simile: rischio e rendimento comparabili."
        )

    return r


###############
###############
# --- funzione STATISTICHE DESCRITTIVE E TEST DI NORMALITÀ ---
################


def analisi_statistiche(titolo, returns):
    media = returns.mean()
    dev_std = returns.std()
    asimmetria = skew(returns)
    curtosi = kurtosis(returns)  # Curtosi in eccesso

    # Test di normalità
    shapiro_stat, shapiro_p = shapiro(returns)
    jb_stat, jb_p = jarque_bera(returns)
    # Restituisce un dizionario con le statistiche
    return {
        "mean": media,
        "std": dev_std,
        "skew": asimmetria,
        "kurtosis": curtosi,
        "shapiro_stat": shapiro_stat,
        "shapiro_p": shapiro_p,
        "jb_stat": jb_stat,
        "jb_p": jb_p,
    }


def analisi_statistiche_TAB(
    nome1, returns1, nome2, returns2, salva_immagine=False, nome_file="statistiche.png"
):
    def compute_stats(returns):
        return {
            "Mean": returns.mean(),
            "Std Dev": returns.std(),
            "Skewness": skew(returns),
            "Kurtosis": kurtosis(returns),
            "Shapiro-Wilk p-value": shapiro(returns)[1],
            "Jarque-Bera p-value": jarque_bera(returns)[1],
        }

    stats1 = compute_stats(returns1)
    stats2 = compute_stats(returns2)
    df = pd.DataFrame({nome1: stats1, nome2: stats2})
    df = df.round(4)  # Tutto arrotondato a 4 decimali

    # Crea immagine con matplotlib
    fig, ax = plt.subplots(figsize=(6, 3))
    ax.axis("off")
    ax.axis("tight")

    tabella = ax.table(
        cellText=df.values,
        colLabels=df.columns,
        rowLabels=df.index,
        loc="center",
        cellLoc="center",
        colLoc="center",
    )

    tabella.auto_set_font_size(False)
    tabella.set_fontsize(10)
    tabella.scale(1.2, 1.5)
    plt.title("Confronto Statistico", fontsize=14, fontweight="bold", pad=20)

    plt.tight_layout()

    if salva_immagine:
        plt.savefig(nome_file, dpi=300, bbox_inches="tight")
        print(f"📁 Tabella salvata come immagine: {nome_file}")
    else:
        plt.show()
    
    # Cleanup matplotlib
    plt.close(fig)
    plt.close('all')
