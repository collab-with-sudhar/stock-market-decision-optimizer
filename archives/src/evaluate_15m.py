# src/evaluate_15m.py
import argparse
import glob
from pathlib import Path
import numpy as np
import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from src.envs.trading_env_15m import TradingEnv15m

def make_env(df, window, trading_cost_bps):
    return DummyVecEnv([lambda: TradingEnv15m(df, window_size=window, trading_cost_bps=trading_cost_bps)])

def run_episode(model, env):
    obs = env.reset()
    done = False
    total = 0.0
    steps = 0
    last_eq = None
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, rewards, dones, infos = env.step(action)
        r = float(rewards[0]) if hasattr(rewards, "__len__") else float(rewards)
        total += r
        steps += 1
        done = bool(dones[0]) if hasattr(dones, "__len__") else bool(dones)
        info = infos[0] if isinstance(infos, (list, tuple)) else infos
        if isinstance(info, dict) and "equity" in info:
            last_eq = float(info["equity"])
        if steps > 10000:
            break
    return total, steps, last_eq

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--processed_dir", default="data/processed_15m")
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--n", type=int, default=5)
    args = parser.parse_args()

    segs = sorted(glob.glob(str(Path(args.processed_dir) / "segment_*.parquet")))
    if not segs:
        raise FileNotFoundError("no segments")
    segs = segs[-args.n:]
    model = PPO.load(args.model)
    rewards = []
    eqs = []
    lens = []
    for s in segs:
        df = pd.read_parquet(s)
        base_env = make_env(df, window=args.window, trading_cost_bps=1.0)
        if Path("models/vecnormalize.pkl").exists():
            env = VecNormalize.load("models/vecnormalize.pkl", base_env)
            env.training=False; env.norm_reward=False
        else:
            env = base_env
        tr, ln, eq = run_episode(model, env)
        rewards.append(tr); lens.append(ln); eqs.append(eq)
        print(s, tr, ln, eq)
    rewards = np.array(rewards); lens = np.array(lens); eqs = np.array([e if e is not None else np.nan for e in eqs])
    print("=== Summary ===")
    print("Mean Reward:", np.nanmean(rewards))
    print("Std Reward:", np.nanstd(rewards))
    print("Mean Final Eq:", np.nanmean(eqs))
    print("Sharpe:", (np.nanmean(rewards)/np.nanstd(rewards)) if np.nanstd(rewards)>0 else float("nan"))

if __name__ == "__main__":
    main()
