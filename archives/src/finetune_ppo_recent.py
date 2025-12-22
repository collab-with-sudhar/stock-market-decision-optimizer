import argparse
import glob
from pathlib import Path

import numpy as np
import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from src.envs.trading_env_improved import TradingEnvImproved


def make_recent_env(processed_dir: Path, window_size: int, n_segments: int):
    """
    Build a DummyVecEnv using the last n_segments parquet files.
    Each env instance uses one segment.
    """
    seg_paths = sorted(glob.glob(str(processed_dir / "segment_*.parquet")))
    if not seg_paths:
        raise FileNotFoundError(f"No segments found in {processed_dir}")

    seg_paths = seg_paths[-n_segments:]  # last N segments

    def make_env_fn(path):
        def _init():
            df = pd.read_parquet(path)
            return TradingEnvImproved(df, window_size=window_size)
        return _init

    env_fns = [make_env_fn(p) for p in seg_paths]
    env = DummyVecEnv(env_fns)
    return env, seg_paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True,
                        help="Base PPO model to finetune (e.g. models/ppo_nifty.zip)")
    parser.add_argument("--processed_dir", type=str, default="data/processed",
                        help="Directory with segment_*.parquet")
    parser.add_argument("--window", type=int, default=64,
                        help="Window size for TradingEnvImproved")
    parser.add_argument("--n-segments", type=int, default=5,
                        help="How many recent segments to use for finetuning")
    parser.add_argument("--timesteps", type=int, default=200000,
                        help="Number of finetuning timesteps")
    parser.add_argument("--lr", type=float, default=5e-5,
                        help="Finetuning learning rate")
    parser.add_argument("--vecnorm", type=str, default="models/vecnormalize.pkl",
                        help="Path to VecNormalize stats from base training")
    parser.add_argument("--out-model", type=str, default="models/ppo_nifty_finetuned.zip",
                        help="Path to save the finetuned model")
    args = parser.parse_args()

    processed_dir = Path(args.processed_dir)

    print(f"Using recent {args.n_segments} segments from {processed_dir} for finetuning...")
    base_env, segs = make_recent_env(processed_dir, args.window, args.n_segments)
    print("Segments used:")
    for s in segs:
        print("  ", s)

    # Load VecNormalize stats if available; else create new
    if Path(args.vecnorm).exists():
        print("Loading VecNormalize stats from:", args.vecnorm)
        vec_env = VecNormalize.load(args.vecnorm, base_env)
        vec_env.training = True
        vec_env.norm_reward = True
    else:
        print("WARNING: VecNormalize stats not found, creating new normalizer.")
        vec_env = VecNormalize(base_env, norm_obs=True, norm_reward=True, training=True)

    # Load PPO model and override learning rate for finetune
    print("Loading base model:", args.model)
    model = PPO.load(
        args.model,
        env=vec_env,
        custom_objects={"learning_rate": args.lr}
    )

    print(f"Starting finetuning for {args.timesteps} timesteps with lr={args.lr} ...")
    model.learn(total_timesteps=args.timesteps)

    # Save updated VecNormalize stats and finetuned model
    vec_env.save("models/vecnormalize_finetuned.pkl")
    model.save(args.out_model)
    print("Saved finetuned model to:", args.out_model)
    print("Saved finetuned VecNormalize stats to: models/vecnormalize_finetuned.pkl")


if __name__ == "__main__":
    main()
