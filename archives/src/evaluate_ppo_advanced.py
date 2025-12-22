import argparse
import glob
from pathlib import Path

import numpy as np
import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from src.envs.trading_env_improved import TradingEnvImproved


def make_eval_env(df: pd.DataFrame, window: int, trading_cost_bps: float):
    def _init():
        return TradingEnvImproved(
            df,
            window_size=window,
            trading_cost_bps=trading_cost_bps,
        )
    return _init


def run_episode(model, env) -> tuple[float, int, float | None]:
    """
    Run a single deterministic episode on a VecEnv (n_envs=1).
    Properly unwraps rewards/dones/infos from vectorized format.
    """
    obs = env.reset()
    done = False
    total_reward = 0.0
    steps = 0
    last_equity: float | None = None

    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, rewards, dones, infos = env.step(action)

        # unwrap
        if isinstance(rewards, (np.ndarray, list)):
            reward = float(rewards[0])
        else:
            reward = float(rewards)

        if isinstance(dones, (np.ndarray, list)):
            done = bool(dones[0])
        else:
            done = bool(dones)

        if isinstance(infos, (list, tuple)):
            info = infos[0]
        else:
            info = infos

        total_reward += reward
        steps += 1

        if isinstance(info, dict) and "equity" in info:
            last_equity = float(info["equity"])

        if steps > 50_000:
            break

    return total_reward, steps, last_equity


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True)
    parser.add_argument("--processed_dir", type=str, default="data/processed")
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--n", type=int, default=10)
    parser.add_argument("--trading-cost-bps", type=float, default=1.0)
    parser.add_argument("--vecnorm", type=str, default="models/vecnormalize_advanced.pkl")
    args = parser.parse_args()

    model = PPO.load(str(Path(args.model)))

    seg_paths = sorted(glob.glob(str(Path(args.processed_dir) / "segment_*.parquet")))
    if not seg_paths:
        raise FileNotFoundError("No segments found in processed_dir")

    seg_paths = seg_paths[-args.n:]

    print(f"Evaluating on {len(seg_paths)} segments...")

    rewards = []
    equities = []
    lengths = []

    for p in seg_paths:
        df = pd.read_parquet(p)
        base_env = DummyVecEnv(
            [make_eval_env(df, window=args.window, trading_cost_bps=args.trading_cost_bps)]
        )

        if Path(args.vecnorm).exists():
            env = VecNormalize.load(args.vecnorm, base_env)
            env.training = False
            env.norm_reward = False
        else:
            env = base_env

        ep_rew, ep_len, last_eq = run_episode(model, env)
        rewards.append(ep_rew)
        lengths.append(ep_len)
        equities.append(last_eq)

        print(f"Segment: {p}")
        print(f"  Reward: {ep_rew:.6f}, Steps: {ep_len}, Final equity: {last_eq}")
        print("-" * 40)

    rewards_arr = np.array(rewards, dtype=float)
    lengths_arr = np.array(lengths, dtype=float)
    equities_arr = np.array(
        [e if e is not None else np.nan for e in equities],
        dtype=float,
    )

    print("\n====== Advanced Evaluation Summary ======")
    print(f"Mean Reward:   {np.nanmean(rewards_arr):.6f}")
    print(f"Std Reward:    {np.nanstd(rewards_arr):.6f}")
    print(f"Max Reward:    {np.nanmax(rewards_arr):.6f}")
    print(f"Min Reward:    {np.nanmin(rewards_arr):.6f}")
    print(f"Mean Ep Length:{np.nanmean(lengths_arr):.1f}")
    print(f"Mean Final Eq: {np.nanmean(equities_arr):.6f}")

    if np.nanstd(rewards_arr) > 0:
        sharpe = np.nanmean(rewards_arr) / np.nanstd(rewards_arr)
        print(f"Sharpe (approx, reward units): {sharpe:.6f}")
    else:
        print("Sharpe: undefined (zero variance)")
    print("=========================================\n")


if __name__ == "__main__":
    main()
