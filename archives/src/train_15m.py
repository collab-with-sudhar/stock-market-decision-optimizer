# src/train_15m.py
import argparse
import glob
import random
from pathlib import Path

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback

from src.envs.trading_env_15m import TradingEnv15m

class SegmentDataset:
    def __init__(self, seg_dir):
        self.paths = sorted(glob.glob(str(Path(seg_dir) / "segment_*.parquet")))
        if not self.paths:
            raise FileNotFoundError("No 15m segments found in " + str(seg_dir))

    def sample(self):
        return random.choice(self.paths)

def make_env_fn(path, window, trading_cost_bps):
    def _init():
        import pandas as pd
        df = pd.read_parquet(path)
        return TradingEnv15m(df, window_size=window, trading_cost_bps=trading_cost_bps)
    return _init

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed_dir", type=str, default="data/processed_15m")
    parser.add_argument("--timesteps", type=int, default=500_000)
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--n-envs", type=int, default=4)
    parser.add_argument("--eval-interval", type=int, default=50_000)
    parser.add_argument("--trading-cost-bps", type=float, default=1.0)
    parser.add_argument("--model-out", type=str, default="models/best_model_15m.zip")
    args = parser.parse_args()

    seg_paths = sorted(glob.glob(str(Path(args.processed_dir) / "segment_*.parquet")))
    if not seg_paths:
        raise FileNotFoundError("No segments in processed_dir")

    # build env fns using random segments for vectorized env
    env_fns = []
    for _ in range(args.n_envs):
        p = random.choice(seg_paths)
        env_fns.append(make_env_fn(p, args.window, args.trading_cost_bps))

    train_env = DummyVecEnv(env_fns)
    train_env = VecNormalize(train_env, norm_obs=True, norm_reward=False, training=True)

    # eval env uses last segment(s) as holdout
    eval_path = seg_paths[-1]
    eval_env = DummyVecEnv([make_env_fn(eval_path, args.window, args.trading_cost_bps)])
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)

    policy_kwargs = dict(net_arch=dict(pi=[256,256], vf=[256,256]))

    model = PPO(
        "MlpPolicy",
        train_env,
        verbose=1,
        n_steps=4096,      # was 2048
        batch_size=512,   # was 256
        n_epochs=15,      # was 10
        learning_rate=2e-5,  # was 3e-5
        policy_kwargs=policy_kwargs,
    )

    checkpoint_cb = CheckpointCallback(save_freq=100_000, save_path="models", name_prefix="ppo_15m_chk")
    eval_cb = EvalCallback(eval_env, best_model_save_path=str(Path("models") / "best_15m"), log_path=str(Path("logs") / "15m_eval"), eval_freq=args.eval_interval, deterministic=True)

    model.learn(total_timesteps=args.timesteps, callback=[checkpoint_cb, eval_cb])

    # final save
    model.save(args.model_out)
    train_env.save("models/vecnormalize.pkl")
    # also save a compatibility copy
    model.save("models/best_model.zip")
    print("Saved model ->", args.model_out)
    print("Saved compatibility -> models/best_model.zip and models/vecnormalize.pkl")

if __name__ == "__main__":
    main()
