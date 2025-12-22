# src/feature_builder.py

"""
Feature builder for the trading RL agent.

This module converts price data (historical or real-time) into the observation
vector expected by TradingEnvImproved and your trained PPO model.

Observation format (matches TradingEnvImproved._get_obs exactly):
    - window of normalized returns (Close-to-Close)
    - + 1 position flag (0 = flat, 1 = long)

Total length = window_size + 1
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd


# ============================
# Low-level: pure math helpers
# ============================

def _compute_returns_from_prices(prices: np.ndarray) -> np.ndarray:
    """
    Given an array of prices [p0, p1, ..., pN-1],
    returns an array of returns:
        r_t = (p_t - p_{t-1}) / p_{t-1}
    length = len(prices) - 1
    """
    prices = prices.astype(float)
    if len(prices) < 2:
        return np.zeros(0, dtype=np.float32)
    returns = np.diff(prices) / prices[:-1]
    return returns.astype(np.float32)


def _normalize_returns(returns: np.ndarray) -> np.ndarray:
    """
    Normalize returns by their standard deviation (like TradingEnvImproved).

    If std == 0 -> divide by 1 (no scaling).
    """
    if returns.size == 0:
        return returns.astype(np.float32)
    std = returns.std()
    if std <= 0:
        std = 1.0
    return (returns / std).astype(np.float32)


def build_obs_from_prices(
    prices: Sequence[float],
    position: int,
    window_size: int = 20,
) -> Optional[np.ndarray]:
    """
    Build a single observation vector from a sequence of close prices.

    This function mirrors TradingEnvImproved._get_obs:

        - take the last `window_size` closes (or fewer if not enough)
        - compute returns: r_t = (p_t - p_{t-1}) / p_{t-1}
        - if returns length < window_size -> left-pad with zeros
        - normalize returns by their own std
        - append position flag at the end

    Args:
        prices: 1D sequence of recent close prices, in chronological order
                (oldest -> newest).
        position: 0 (flat) or 1 (long), matching your env.
        window_size: same as env.window_size during training.

    Returns:
        obs: np.ndarray of shape (window_size + 1,) or
             None if there is not enough price data to compute
             at least one return.
    """
    prices_arr = np.asarray(prices, dtype=float)

    if prices_arr.size < 2:
        # cannot compute even a single return
        return None

    # Pick the latest window_size prices if we have more
    if prices_arr.size > window_size:
        prices_arr = prices_arr[-window_size:]

    returns = _compute_returns_from_prices(prices_arr)  # length = len(prices_arr) - 1

    # Pad on the left if needed to reach window_size
    if returns.size < window_size:
        pad_len = window_size - returns.size
        returns = np.pad(returns, (pad_len, 0), mode="constant", constant_values=0.0)

    returns = _normalize_returns(returns)
    obs = np.concatenate([returns[-window_size:], [float(position)]])
    return obs.astype(np.float32)


def build_obs_from_df_row(
    df: pd.DataFrame,
    current_index: int,
    position: int,
    window_size: int = 20,
    close_col: str = "Close",
) -> Optional[np.ndarray]:
    """
    Build an observation from a pandas DataFrame row index,
    using the same logic as TradingEnvImproved.

    This is useful for:
        - offline evaluation
        - backtests
        - generating obs from historical CSVs

    Args:
        df: DataFrame with at least a 'Close' column.
        current_index: index of the *current* time step (like env.current_step).
        position: 0/1 as in the env.
        window_size: training window.
        close_col: column name for closing price.

    Returns:
        obs or None if not enough history is available.
    """
    if current_index <= 0:
        return None

    start = current_index - window_size
    if start < 0:
        start = 0
    # slice close prices from [start, current_index-1]
    prices = df.loc[start:current_index - 1, close_col].values.astype(float)
    if prices.size < 2:
        return None

    # If we have more than window_size prices, keep only the last window_size
    if prices.size > window_size:
        prices = prices[-window_size:]

    return build_obs_from_prices(prices, position=position, window_size=window_size)


# ======================================
# Real-time: stateful per-symbol builder
# ======================================

@dataclass
class SymbolState:
    closes: Deque[float]


class RealTimeFeatureBuilder:
    """
    Stateful helper to build obs vectors from real-time price streams.

    For each symbol, we maintain a deque of recent close prices.

    Typical usage (pseudo-code):

        from src.feature_builder import RealTimeFeatureBuilder

        fb = RealTimeFeatureBuilder(window_size=20)

        # in your SmartAPI tick handler:
        def on_tick(symbol, last_traded_price, current_position):
            obs = fb.update(symbol, last_traded_price, current_position)
            if obs is not None:
                # send obs to model server / PPO
                action = get_action_from_model(obs)
    """

    def __init__(self, window_size: int = 20, min_history: Optional[int] = None):
        """
        Args:
            window_size: must match your training env.window_size
            min_history: minimum number of close prices required before we start
                         returning obs. If None, defaults to window_size.
        """
        self.window_size = int(window_size)
        self.min_history = int(min_history) if min_history is not None else self.window_size
        self._symbol_state: Dict[str, SymbolState] = defaultdict(
            lambda: SymbolState(closes=deque(maxlen=self.window_size + 1))
        )

    def update(
        self,
        symbol: str,
        close_price: float,
        position: int,
    ) -> Optional[np.ndarray]:
        """
        Update the state for a symbol with a new close price, and
        return an obs vector if enough data is available.

        Args:
            symbol: e.g. "NIFTY", "INFY", "RELIANCE-EQ".
            close_price: latest close or last traded price.
            position: current position flag for this symbol (0 or 1).

        Returns:
            obs: np.ndarray (window_size + 1,) or None if not enough history yet.
        """
        state = self._symbol_state[symbol]
        state.closes.append(float(close_price))

        # ensure we have at least min_history prices recorded
        if len(state.closes) < max(2, self.min_history):
            return None

        # Note: deque is in arrival order (oldest -> newest)
        prices = list(state.closes)
        obs = build_obs_from_prices(prices, position=position, window_size=self.window_size)
        return obs

    def get_closes(self, symbol: str) -> List[float]:
        """Return the stored close prices for the symbol (for debugging)."""
        return list(self._symbol_state[symbol].closes)

    def reset_symbol(self, symbol: str):
        """Clear the history for a symbol (e.g., at session boundary)."""
        if symbol in self._symbol_state:
            self._symbol_state[symbol].closes.clear()

    def reset_all(self):
        """Clear history for all symbols."""
        for state in self._symbol_state.values():
            state.closes.clear()
