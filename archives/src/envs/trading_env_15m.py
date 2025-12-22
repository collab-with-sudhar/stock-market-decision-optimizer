# src/envs/trading_env_15m.py
import gym
import numpy as np
import pandas as pd
from gym import spaces
from typing import Dict, Any, Optional

from src.feature_engineering import compute_technical_features

class TradingEnv15m(gym.Env):
    """
    3-action env for 15m data: 0=Hold, 1=Buy, 2=Sell.
    Reward is percentage return per step (bounded), with small penalties.
    """
    metadata = {"render.modes": ["human"]}

    def __init__(self, df: pd.DataFrame, window_size: int = 64, trading_cost_bps: float = 1.0, max_episode_steps: Optional[int]=None):
        super().__init__()
        required = ["Date","Open","High","Low","Close","Volume"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError("Missing columns: " + ", ".join(missing))

        df = df.copy().reset_index(drop=True)
        df = compute_technical_features(df)  # uses feature_engineering module
        self.df = df
        self.window_size = max(2, int(window_size))
        self.trading_cost_bps = float(trading_cost_bps)
        self._initial_equity = 1.0
        self.max_episode_steps = int(max_episode_steps) if max_episode_steps else len(self.df) - self.window_size - 1
        self.feature_cols = [
            "ret_1","ret_5","ret_15","vol_10","vol_30",
            "ma_fast_10_ratio","ma_slow_50_ratio","rsi_14","vol_zscore_20","close_zscore_50"
        ]
        self.n_features = len(self.feature_cols)
        self.action_space = spaces.Discrete(3)  # Hold, Buy, Sell
        low = np.array([-5.0]*self.n_features + [-1.0], dtype=np.float32)
        high = np.array([5.0]*self.n_features + [1.0], dtype=np.float32)
        self.observation_space = spaces.Box(low=low, high=high, dtype=np.float32)

        # internal state
        self._step_index = self.window_size
        self._position = 0  # -1 short, 0 flat, +1 long
        self._equity = self._initial_equity
        self._peak_equity = self._initial_equity
        self._steps_taken = 0

    def reset(self):
        self._step_index = self.window_size
        self._position = 0
        self._equity = self._initial_equity
        self._peak_equity = self._initial_equity
        self._steps_taken = 0
        return self._get_observation()

    def step(self, action: int):
        action = int(action)
        prev_idx = self._step_index
        prev_price = float(self.df["Close"].iloc[prev_idx])
        prev_position = self._position
        # map action to target position
        if action == 0:
            target_pos = 0
        elif action == 1:
            target_pos = +1
        else:
            target_pos = -1

        position_change = target_pos - prev_position
        self._position = target_pos

        # transaction cost as fraction of equity
        trade_cost_frac = abs(position_change) * (self.trading_cost_bps * 1e-4)

        # advance bar
        self._step_index += 1
        self._steps_taken += 1
        if self._step_index >= len(self.df):
            return self._get_observation(), 0.0, True, {"equity": self._equity}

        current_price = float(self.df["Close"].iloc[self._step_index])
        price_ret = (current_price / (prev_price + 1e-9)) - 1.0
        step_return = self._position * price_ret

        equity_after_cost = self._equity * (1.0 - trade_cost_frac)
        new_equity = equity_after_cost * (1.0 + step_return)
        self._equity = new_equity

        if self._equity > self._peak_equity:
            self._peak_equity = self._equity
        drawdown = max(0.0, (self._peak_equity - self._equity) / (self._peak_equity + 1e-9))

        # penalties (weaker than 1m)
        risk_penalty = 0.002 * abs(self._position)
        dd_penalty = 0.03 * drawdown
        turnover_penalty = 0.0001 * abs(position_change)

        reward = step_return - risk_penalty - dd_penalty - turnover_penalty
        reward = float(np.clip(reward, -0.05, 0.05))

        done = False
        if self._equity <= 0.5 * self._initial_equity or self._equity >= 2.0 * self._initial_equity:
            done = True
        if self._steps_taken >= self.max_episode_steps:
            done = True

        info = {"equity": self._equity, "drawdown": drawdown, "step_return": step_return}
        return self._get_observation(), reward, done, info

    def _get_observation(self):
        row = self.df.iloc[self._step_index]
        feats = [row[c] for c in self.feature_cols]
        obs = np.array(feats + [float(self._position)], dtype=np.float32)
        obs = np.clip(obs, self.observation_space.low, self.observation_space.high)
        return obs

    def render(self, mode="human"):
        print(f"t={self._step_index}, pos={self._position}, eq={self._equity:.4f}")
