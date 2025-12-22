# src/train_chunked.py
import argparse
import glob
import random
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback

from src.envs.trading_env_improved import TradingEnvImproved

def make_env_from_path(path, window_size, trading_cost_bps):
    def _init():
        df = pd.read_parquet(path)
        return TradingEnvImproved(df, window_size=window_size, trading_cost_bps=trading_cost_bps)
    return _init

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed_dir", type=str, default="data/processed")
    parser.add_argument("--model_in", type=str, default=None, help="Existing model to resume from")
    parser.add_argument("--out_dir", type=str, default="models/chunked")
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--trading-cost-bps", type=float, default=1.0)
    parser.add_argument("--segment_steps", type=int, default=100000,
                        help="timesteps to train per segment iteration")
    parser.add_argument("--n-envs", type=int, default=4)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    set_seed(args.seed)
    out_dir = Path(args.out_dir); out_dir.mkdir(parents=True, exist_ok=True)

    seg_paths = sorted(glob.glob(str(Path(args.processed_dir) / "segment_*.parquet")))
    if len(seg_paths) == 0:
        raise FileNotFoundError("No segments found in processed_dir")

    # Build vectorized training env from random segments (n_envs)
    def sample_env_fns():
        chosen = random.choices(seg_paths, k=args.n_envs)
        return [make_env_from_path(p, args.window, args.trading_cost_bps) for p in chosen]

    train_env = DummyVecEnv(sample_env_fns())
    # normalize observations only (do NOT normalize reward)
    train_env = VecNormalize(train_env, norm_obs=True, norm_reward=False, training=True)

    # Load or create model
    if args.model_in:
        print("Loading base model:", args.model_in)
        model = PPO.load(args.model_in, env=train_env)
        # override the env inside model for continued training
        model.set_env(train_env)
    else:
        policy_kwargs = dict(net_arch=dict(pi=[256,256], vf=[256,256]))
        model = PPO("MlpPolicy",
                    train_env,
                    verbose=1,
                    n_steps=1024,
                    batch_size=128,
                    n_epochs=10,
                    learning_rate=3e-5,
                    policy_kwargs=policy_kwargs)

    # optional checkpoint callback saving per X timesteps
    checkpoint_cb = CheckpointCallback(save_freq=args.segment_steps, save_path=str(out_dir), name_prefix="chk")
    # simple loop over segments: for each segment, re-create envs sampling new segments for diversity
    iteration = 0
    try:
        while True:
            iteration += 1
            print(f"\n=== Chunked training iteration {iteration} | training {args.segment_steps} timesteps ===")
            model.learn(total_timesteps=args.segment_steps, reset_num_timesteps=False, callback=checkpoint_cb)

            # after each chunk, save model + vecnormalize
            model_path = out_dir / f"model_chunk_iter{iteration}.zip"
            vecnorm_path = out_dir / f"vecnormalize_chunk_iter{iteration}.pkl"
            model.save(str(model_path))
            train_env.save(str(vecnorm_path))
            print("Saved:", model_path, vecnorm_path)

            # re-sample env_fns to get different segments for next chunk
            train_env.close()
            train_env = DummyVecEnv(sample_env_fns())
            train_env = VecNormalize(train_env, norm_obs=True, norm_reward=False, training=True)
            model.set_env(train_env)

    except KeyboardInterrupt:
        print("Interrupted by user. Saving final model.")
        model.save(str(out_dir / "model_chunk_final.zip"))
        train_env.save(str(out_dir / "vecnormalize_chunk_final.pkl"))

if __name__ == "__main__":
    main()
