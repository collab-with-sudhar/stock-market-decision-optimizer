import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd

class SimpleTradingEnv(gym.Env):
    metadata = {"render_modes": ["human"]}

    def __init__(self, df: pd.DataFrame, window_size: int = 10, transaction_cost: float = 0.001):
        super().__init__()
        df = df.copy()
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df['Close'] = pd.to_numeric(df['Close'], errors='coerce')
        df = df.dropna(subset=['Close']).reset_index(drop=True)
        if len(df) < window_size + 2:
            raise ValueError('Dataframe too small after cleaning. Need more rows.')

        self.df = df
        self.window = window_size
        self.transaction_cost = transaction_cost
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(window_size+1,), dtype=np.float32)
        self.action_space = spaces.Discrete(3)  # 0=hold,1=buy,2=sell

        self._reset_state()

    def _reset_state(self):
        self.current_step = self.window
        self.position = 0
        self.cash = 1.0
        self.holdings = 0.0
        self.last_price = float(self.df.loc[self.current_step-1, 'Close'])

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_state()
        return self._get_obs(), {}

    def _get_obs(self):
        start = self.current_step - self.window
        prices = self.df.loc[start:self.current_step-1, 'Close'].values.astype(float)
        base = prices[0] if prices[0] != 0 else 1.0
        prices = prices / base - 1.0
        obs = np.concatenate([prices, [float(self.position)]])
        return obs.astype(np.float32)

    def step(self, action):
        price = float(self.df.loc[self.current_step, 'Close'])
        prev_portfolio = self._portfolio_value(self.last_price)

        if action == 1 and self.position == 0:
            self.holdings = self.cash / price
            self.cash = 0.0
            self.position = 1
            self.cash -= self.transaction_cost
        elif action == 2 and self.position == 1:
            self.cash = self.holdings * price
            self.holdings = 0.0
            self.position = 0
            self.cash -= self.transaction_cost

        self.current_step += 1
        self.last_price = price

        curr_portfolio = self._portfolio_value(price)
        reward = curr_portfolio - prev_portfolio

        done = False
        if self.current_step >= len(self.df) - 1:
            done = True

        info = {"portfolio_value": curr_portfolio}
        return self._get_obs(), float(reward), done, False, info

    def _portfolio_value(self, price):
        return float(self.cash + self.holdings * price)

    def render(self):
        pv = self._portfolio_value(self.last_price)
        print(f"Step: {self.current_step}, Position: {self.position}, Portfolio: {pv:.4f}")