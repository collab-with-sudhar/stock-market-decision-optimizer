
import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd

class TradingEnvImproved(gym.Env):
    """
    Improved single-asset trading environment.
    - actions: Discrete(3) -> 0:hold, 1:buy (go long), 2:sell (go to cash)
    - supports: transaction_cost (proportional), slippage (fraction), trade_penalty (per trade),
      risk_penalty (penalize large drawdowns), reward normalization.
    - observation: window of normalized closes/indicators + position flag
    """
    metadata = {"render_modes": ["human"]}

    def __init__(self,
                 df: pd.DataFrame,
                 window_size: int = 20,
                 transaction_cost: float = 0.001,
                 slippage: float = 0.0005,
                 trade_penalty: float = 0.0,
                 risk_aversion: float = 0.0,
                 reward_norm: bool = True):
        super().__init__()
        df = df.copy()
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df['Close'] = pd.to_numeric(df['Close'], errors='coerce')
        df = df.dropna(subset=['Close']).reset_index(drop=True)
        if len(df) < window_size + 2:
            raise ValueError("Dataframe too small after cleaning. Need more rows.")
        self.df = df
        self.window = window_size
        self.transaction_cost = transaction_cost
        self.slippage = slippage
        self.trade_penalty = trade_penalty
        self.risk_aversion = risk_aversion
        self.reward_norm = reward_norm
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(window_size + 1,), dtype=np.float32)
        self.action_space = spaces.Discrete(3)

        self._reset_state()

    def _reset_state(self):
        self.current_step = self.window
        self.position = 0  # 0 cash, 1 long
        self.cash = 1.0
        self.holdings = 0.0
        self.equity_curve = [self._portfolio_value(self.df.loc[self.current_step-1, 'Close'])]
        self.peak = self.equity_curve[-1]

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_state()
        return self._get_obs(), {}

    def _get_obs(self):
        start = self.current_step - self.window
        prices = self.df.loc[start:self.current_step-1, 'Close'].values.astype(float)
        returns = np.diff(prices) / prices[:-1]
        if len(returns) < self.window:
            returns = np.pad(returns, (self.window - len(returns), 0), 'constant')
        std = returns.std() if returns.std() > 0 else 1.0
        returns = returns / std
        obs = np.concatenate([returns[-self.window:], [float(self.position)]])
        return obs.astype(np.float32)

    def step(self, action):
        price = float(self.df.loc[self.current_step, 'Close'])
        prev_val = self._portfolio_value(self.df.loc[self.current_step-1, 'Close'])

        traded = False
        if action == 1 and self.position == 0:  # buy
            exec_price = price * (1.0 + self.slippage)
            self.holdings = self.cash / exec_price
            self.cash = 0.0
            self.position = 1
            traded = True
        elif action == 2 and self.position == 1:  # sell
            exec_price = price * (1.0 - self.slippage)
            self.cash = self.holdings * exec_price
            self.holdings = 0.0
            self.position = 0
            traded = True
        if traded and self.transaction_cost > 0:
            if action == 1:
                cost = self.transaction_cost * 1.0
                self.cash = max(0.0, self.cash - cost)
            else:
                cost = self.transaction_cost * self.cash
                self.cash = max(0.0, self.cash - cost)
        self.current_step += 1
        new_price = float(self.df.loc[self.current_step, 'Close'])
        curr_val = self._portfolio_value(new_price)
        raw_reward = curr_val - prev_val
        trade_penalty = self.trade_penalty if traded else 0.0
        self.equity_curve.append(curr_val)
        if curr_val > self.peak:
            self.peak = curr_val
        drawdown = (self.peak - curr_val) / self.peak if self.peak > 0 else 0.0
        risk_penalty = self.risk_aversion * drawdown

        reward = raw_reward - trade_penalty - risk_penalty
        if self.reward_norm and prev_val != 0:
            reward = reward / prev_val

        done = False
        if self.current_step >= len(self.df) - 1:
            done = True

        info = {"portfolio_value": curr_val, "drawdown": drawdown, "traded": traded}
        return self._get_obs(), float(reward), done, False, info

    def _portfolio_value(self, price):
        return float(self.cash + self.holdings * price)

    def render(self):
        pv = self._portfolio_value(self.df.loc[self.current_step, 'Close'])
        print(f"Step: {self.current_step}, Position: {self.position}, Portfolio: {pv:.4f}")
