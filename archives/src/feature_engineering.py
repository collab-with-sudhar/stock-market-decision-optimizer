import numpy as np
import pandas as pd


def compute_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input df: columns ['Date','Open','High','Low','Close','Volume']
    Output df: adds feature columns; keeps Date, Open, High, Low, Close, Volume.
    Features are clipped to reduce outlier impact.
    """
    df = df.copy().reset_index(drop=True)

    # Basic returns
    df["ret_1"] = df["Close"].pct_change().fillna(0.0)
    df["ret_5"] = df["Close"].pct_change(5).fillna(0.0)
    df["ret_15"] = df["Close"].pct_change(15).fillna(0.0)

    # Rolling volatility
    df["vol_10"] = df["ret_1"].rolling(10).std().fillna(0.0)
    df["vol_30"] = df["ret_1"].rolling(30).std().fillna(0.0)

    # Moving averages and relative position
    df["ma_fast_10"] = df["Close"].rolling(10).mean().bfill()
    df["ma_slow_50"] = df["Close"].rolling(50).mean().bfill()
    df["ma_fast_10_ratio"] = (df["Close"] / (df["ma_fast_10"] + 1e-9)) - 1.0
    df["ma_slow_50_ratio"] = (df["Close"] / (df["ma_slow_50"] + 1e-9)) - 1.0

    # RSI(14)
    window = 14
    delta = df["Close"].diff()
    up = delta.clip(lower=0.0)
    down = -delta.clip(upper=0.0)
    roll_up = up.rolling(window).mean()
    roll_down = down.rolling(window).mean()
    rs = roll_up / (roll_down + 1e-9)
    df["rsi_14"] = 100.0 - (100.0 / (1.0 + rs))
    df["rsi_14"] = df["rsi_14"].fillna(50.0)

    # Volume z-score
    vol = df["Volume"].replace(0, np.nan)
    df["vol_zscore_20"] = (
        (vol - vol.rolling(20).mean()) / (vol.rolling(20).std() + 1e-9)
    ).fillna(0.0)

    # Close z-score
    df["close_zscore_50"] = (
        (df["Close"] - df["Close"].rolling(50).mean()) /
        (df["Close"].rolling(50).std() + 1e-9)
    ).fillna(0.0)

    feature_cols = [
        "ret_1",
        "ret_5",
        "ret_15",
        "vol_10",
        "vol_30",
        "ma_fast_10_ratio",
        "ma_slow_50_ratio",
        "rsi_14",
        "vol_zscore_20",
        "close_zscore_50",
    ]

    # Clip features to avoid insane outliers
    df[feature_cols] = df[feature_cols].clip(-5.0, 5.0)

    return df
