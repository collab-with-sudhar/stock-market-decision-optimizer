def is_trade_allowed(df, idx):
    """
    Deterministic market regime filter
    """
    trend_strength = abs(df["ma_slow_50_ratio"].iloc[idx])
    volatility = df["vol_30"].iloc[idx]

    if trend_strength > 0.0010 and volatility > 0.0005:
        return True
    return False
