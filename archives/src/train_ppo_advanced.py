import argparse
import glob
import random
from pathlib import Path

import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from src.envs.trading_env_improved import TradingEnvImproved


class SegmentDataset:
    def __init__(self, segments_dir: Path):
        self.segments_dir = Path(segments_dir)
        self.paths = sorted(glob.glob(str(self.segments_dir / "segment_*.parquet")))
        if not self.paths:
            raise FileNotFoundError(f"No segments found in {self.segments_dir}")

    def sample(self) -> pd.DataFrame:
        path = random.choice(self.paths)
        return pd.read_parquet(path)


def make_env_fn(dataset: SegmentDataset, window_size: int, trading_cost_bps: float):
    def _init():
        df = dataset.sample()
        return TradingEnvImproved(
            df,
            window_size=window_size,
            trading_cost_bps=trading_cost_bps,
        )
    return _init


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed_dir", type=str, default="data/processed")
    parser.add_argument("--timesteps", type=int, default=1_000_000)
    parser.add_argument("--window", type=int, default=64)
    parser.add_argument("--n-envs", type=int, default=4)
    parser.add_argument("--eval-interval", type=int, default=50_000)
    parser.add_argument("--trading-cost-bps", type=float, default=1.0)
    parser.add_argument("--model-out", type=str, default="models/ppo_nifty_advanced.zip")
    args = parser.parse_args()

    processed_dir = Path(args.processed_dir)
    model_out = Path(args.model_out)
    models_dir = model_out.parent
    models_dir.mkdir(parents=True, exist_ok=True)

    ds = SegmentDataset(processed_dir)

    # ------------- Train env -------------
    env_fns = [
        make_env_fn(ds, window_size=args.window, trading_cost_bps=args.trading_cost_bps)
        for _ in range(args.n_envs)
    ]
    train_env = DummyVecEnv(env_fns)
    train_env = VecNormalize(
        train_env,
        norm_obs=True,
        norm_reward=False,  # IMPORTANT: no reward norm; rewards are already bounded
        training=True,
        gamma=0.99,
        clip_obs=10.0,
    )

    # ------------- Eval env -------------
    eval_env = DummyVecEnv(
        [make_env_fn(ds, window_size=args.window, trading_cost_bps=args.trading_cost_bps)]
    )
    eval_env = VecNormalize(
        eval_env,
        norm_obs=True,
        norm_reward=False,
        training=False,
        gamma=0.99,
        clip_obs=10.0,
    )

    # ------------- PPO hyperparams -------------
    policy_kwargs = dict(
        net_arch=dict(
            pi=[256, 256],
            vf=[256, 256],
        )
    )

    model = PPO(
        "MlpPolicy",
        train_env,
        verbose=1,
        n_steps=1024,          # shorter rollouts → faster updates
        batch_size=128,
        n_epochs=10,
        learning_rate=3e-5,    # safer for noisy markets
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.0,
        vf_coef=0.5,
        max_grad_norm=0.5,
        policy_kwargs=dict(net_arch=dict(pi=[256,256], vf=[256,256])),
    )

    checkpoint_callback = CheckpointCallback(
        save_freq=50_000,
        save_path=str(models_dir),
        name_prefix="ppo_adv_checkpoint",
    )

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(models_dir),
        log_path=str(Path("logs") / "ppo_advanced_eval"),
        eval_freq=args.eval_interval,
        deterministic=True,
        render=False,
    )

    model.learn(
        total_timesteps=args.timesteps,
        callback=[checkpoint_callback, eval_callback],
    )

    # Save normalizer and model
    train_env.save(str(models_dir / "vecnormalize_advanced.pkl"))
    model.save(str(model_out))

    # Compatibility copies for your backend
    model.save(str(models_dir / "ppo_nifty.zip"))
    train_env.save(str(models_dir / "vecnormalize.pkl"))

    print("Saved advanced PPO model to:", model_out)
    print("Also saved compatibility copies: models/ppo_nifty.zip and models/vecnormalize.pkl")


if __name__ == "__main__":
    main()
