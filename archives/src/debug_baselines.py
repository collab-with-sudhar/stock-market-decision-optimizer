import argparse
import glob
from pathlib import Path

import numpy as np
import pandas as pd
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from src.envs.trading_env_improved import TradingEnvImproved


def make_env(df, window, trading_cost_bps):
    def _init():
        return TradingEnvImproved(df, window_size=window, trading_cost_bps=trading_cost_bps)
    return _init


def run_policy(env, policy_fn, max_steps=20000):
    obs = env.reset()
    done = False
    total_reward = 0.0
    steps = 0
    last_equity = None

    while not done and steps < max_steps:
        action = policy_fn(obs)
        obs, rewards, dones, infos = env.step([action])  # env is DummyVecEnv

        reward = float(rewards[0])
        done = bool(dones[0])
        info = infos[0]

        total_reward += reward
        steps += 1

        if isinstance(info, dict) and "equity" in info:
            last_equity = float(info["equity"])

    return total_reward, steps, last_equity


def always_flat_policy(_obs):
    return 0  # always no position


def random_policy(env):
    def _policy(_obs):
        return env.action_space.sample()
    return _policy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed_dir", type=str, default="data/processed")
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--trading-cost-bps", type=float, default=1.0)
    parser.add_argument("--vecnorm", type=str, default="models/vecnormalize_advanced.pkl")
    parser.add_argument("--n", type=int, default=5)
    args = parser.parse_args()

    seg_paths = sorted(glob.glob(str(Path(args.processed_dir) / "segment_*.parquet")))
    if not seg_paths:
        raise FileNotFoundError("No segments found in processed_dir")

    seg_paths = seg_paths[-args.n:]
    print(f"Testing baselines on {len(seg_paths)} segments...")

    flat_rewards, flat_eqs = [], []
    rand_rewards, rand_eqs = [], []

    for p in seg_paths:
        df = pd.read_parquet(p)
        base_env = DummyVecEnv(
            [make_env(df, window=args.window, trading_cost_bps=args.trading_cost_bps)]
        )

        # Load same VecNormalize as PPO uses for obs, or use raw
        if Path(args.vecnorm).exists():
            env = VecNormalize.load(args.vecnorm, base_env)
            env.training = False
            env.norm_reward = False
        else:
            env = base_env

        # Always flat
        r_flat, steps_flat, eq_flat = run_policy(env, always_flat_policy)
        flat_rewards.append(r_flat)
        flat_eqs.append(eq_flat)

        # Random
        r_rand, steps_rand, eq_rand = run_policy(env, random_policy(env.envs[0]))
        rand_rewards.append(r_rand)
        rand_eqs.append(eq_rand)

        print(f"Segment: {p}")
        print(f"  Flat   -> R={r_flat:.6f}, Eq={eq_flat}")
        print(f"  Random -> R={r_rand:.6f}, Eq={eq_rand}")
        print("-" * 40)

    print("\n===== Baseline Summary =====")
    print("Flat policy:")
    print(f"  Mean Reward: {np.mean(flat_rewards):.6f}, Mean Eq: {np.mean(flat_eqs):.6f}")
    print("Random policy:")
    print(f"  Mean Reward: {np.mean(rand_rewards):.6f}, Mean Eq: {np.mean(rand_eqs):.6f}")
    print("============================\n")


if __name__ == "__main__":
    main()
