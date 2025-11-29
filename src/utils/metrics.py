# src/utils/metrics.py
import numpy as np
import pandas as pd

def annualized_return(portfolio_series, periods_per_year=252):
    total_return = portfolio_series.iloc[-1] / portfolio_series.iloc[0] - 1.0
    n = len(portfolio_series)
    if n <= 1:
        return 0.0
    return (1 + total_return) ** (periods_per_year / n) - 1

def sharpe(returns_series, periods_per_year=252):
    mean = returns_series.mean() * periods_per_year
    std = returns_series.std() * (periods_per_year ** 0.5)
    if std == 0:
        return float('nan')
    return mean / std

def max_drawdown(series):
    cummax = series.cummax()
    dd = (series - cummax) / cummax
    return float(dd.min())
