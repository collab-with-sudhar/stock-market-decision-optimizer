# src/inference_15m.py
import numpy as np
import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from src.envs.trading_env_15m import TradingEnv15m
from src.feature_engineering import compute_technical_features

class ModelServer15m:
    def __init__(self, model_path="models/best_model.zip", vecnorm_path="models/vecnormalize.pkl", window=64):
        self.model = PPO.load(model_path)
        self.window = window
        self.vecnorm = None
        self.dummy_env = DummyVecEnv([lambda: TradingEnv15m(pd.DataFrame({
            "Date":[], "Open":[], "High":[], "Low":[], "Close":[], "Volume":[]
        }), window_size=window)])
        if Path(vecnorm_path).exists():
            self.vecnorm = VecNormalize.load(vecnorm_path, self.dummy_env)
            self.vecnorm.training = False
            self.vecnorm.norm_reward = False
            self.model.set_env(self.vecnorm)
        else:
            self.model.set_env(self.dummy_env)

    def make_obs_from_history(self, df_last):
        # df_last: pandas DataFrame with last `window` rows of 15m candles with same columns
        df = compute_technical_features(df_last.copy().reset_index(drop=True))
        row = df.iloc[-1]
        feat_cols = ["ret_1","ret_5","ret_15","vol_10","vol_30","ma_fast_10_ratio","ma_slow_50_ratio","rsi_14","vol_zscore_20","close_zscore_50"]
        obs = np.array([row[c] for c in feat_cols] + [0.0], dtype=np.float32)  # position=0 default
        # if vecnorm present, normalize:
        if self.vecnorm:
            obs = np.expand_dims(obs, axis=0)
            try:
                obs = self.vecnorm.normalize_obs(obs)
            except Exception:
                pass
            obs = obs[0]
        return obs

    def decide(self, df_last):
        obs = self.make_obs_from_history(df_last)
        action, state = self.model.predict(
            np.expand_dims(obs, axis=0),
            deterministic=False
        )

        # PPO policy outputs action distribution internally
        # We approximate confidence using action probability
        dist = self.model.policy.get_distribution(
            self.model.policy.obs_to_tensor(np.expand_dims(obs, axis=0))[0]
        )
        probs = dist.distribution.probs.detach().cpu().numpy()[0]

        confidence = probs[action[0]]

        CONF_THRESHOLD = 0.60   # tune between 0.55–0.65

        if confidence < CONF_THRESHOLD:
            return 0  # HOLD
        return int(action[0])
