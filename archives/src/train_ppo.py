# src/train_ppo.py
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
import os
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
from src.envs.trading_env_improved import TradingEnvImproved
import yfinance as yf

def download_if_missing(ticker, csv_path, start="2010-01-01", end=None):
    if not csv_path.exists():
        print(f"Downloading {ticker} to {csv_path}")
        df = yf.download(ticker, start=start, end=end, progress=False)
        if df.empty:
            raise RuntimeError("No data downloaded")
        df.reset_index(inplace=True)
        df.to_csv(csv_path, index=False)
    return pd.read_csv(csv_path)

parser = argparse.ArgumentParser()
parser.add_argument('--ticker', type=str, default="^NSEI")
parser.add_argument('--csv', type=str, default=None)
parser.add_argument('--timesteps', type=int, default=100000)
parser.add_argument('--window', type=int, default=20)
parser.add_argument('--model-out', type=str, default='models/ppo_nifty')
parser.add_argument('--transaction-cost', type=float, default=0.001)
parser.add_argument('--slippage', type=float, default=0.0005)
parser.add_argument('--trade-penalty', type=float, default=0.0002)
parser.add_argument('--risk-aversion', type=float, default=0.0)
parser.add_argument('--eval-interval', type=int, default=10000)
args = parser.parse_args()

# paths
model_out = Path(args.model_out)
model_out.parent.mkdir(parents=True, exist_ok=True)

# load data
if args.csv:
    csv_path = Path(args.csv)
    df = pd.read_csv(csv_path)
else:
    csv_path = Path(f"data/raw/{args.ticker.replace('/','_')}.csv")
    df = download_if_missing(args.ticker, csv_path)

# env
def make_env():
    return TradingEnvImproved(df,
                              window_size=args.window,
                              transaction_cost=args.transaction_cost,
                              slippage=args.slippage,
                              trade_penalty=args.trade_penalty,
                              risk_aversion=args.risk_aversion,
                              reward_norm=True)

env = DummyVecEnv([make_env])
# optional normalization wrapper
env = VecNormalize(env, norm_obs=True, norm_reward=False)

# model
policy_kwargs = dict(net_arch=[dict(pi=[256,128], vf=[256,128])])
model = PPO("MlpPolicy", env, verbose=1, policy_kwargs=policy_kwargs, tensorboard_log="tensorboard/ppo")

# callbacks
# callbacks
checkpoint_callback = CheckpointCallback(
    save_freq=5000, 
    save_path=model_out.parent, 
    name_prefix="ppo_model"
)

# evaluation environment MUST match training wrappers
eval_env = DummyVecEnv([make_env])
eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)

eval_callback = EvalCallback(
    eval_env,
    best_model_save_path=model_out.parent,
    log_path="logs/",
    eval_freq=args.eval_interval,
    deterministic=True,
    render=False
)
# train
model.learn(total_timesteps=args.timesteps, callback=[checkpoint_callback, eval_callback])
model.save(str(model_out))
print("Saved PPO model to", model_out)
