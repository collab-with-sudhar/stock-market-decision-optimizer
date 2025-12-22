import numpy as np
import pandas as pd
import glob
import random
from pathlib import Path
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
from src.envs.trading_env_improved import TradingEnvImproved
from pathlib import Path

RAW_CSV = Path("data/raw/NIFTY 50_minute.csv")
PROCESSED_DIR = Path("data/processed")
MODEL_OUT = Path("models/ppo_nifty.zip")
SEGMENT_ROWS = 20000


def preprocess():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    df_iter = pd.read_csv(RAW_CSV, chunksize=500_000)
    buffer = []
    seg_id = 0

    for chunk in df_iter:
        chunk.columns = [c.capitalize() for c in chunk.columns]
        if "Volume" not in chunk or chunk["Volume"].sum() == 0:
            chunk["Volume"] = chunk["Close"].pct_change().abs().fillna(0) * 1e6

        buffer.append(chunk)
        big = pd.concat(buffer)

        while len(big) >= SEGMENT_ROWS:
            seg = big.iloc[:SEGMENT_ROWS]
            seg.to_parquet(PROCESSED_DIR / f"segment_{seg_id:03d}.parquet")
            seg_id += 1
            big = big.iloc[SEGMENT_ROWS:]

        buffer = [big]

    print(f"Preprocessed {seg_id} segments")


class SegmentDataset:
    def __init__(self, path):
        self.files = sorted(glob.glob(str(path / "segment_*.parquet")))

    def sample(self):
        return pd.read_parquet(random.choice(self.files))


def make_env(ds, window):
    def _init():
        return TradingEnvImproved(ds.sample(), window)
    return _init


def train(timesteps=800_000, window=64):
    ds = SegmentDataset(PROCESSED_DIR)

    env = DummyVecEnv([make_env(ds, window) for _ in range(2)])
    env = VecNormalize(env, norm_obs=True, norm_reward=True)

    policy_kwargs = dict(
        net_arch=dict(pi=[128, 128], vf=[256, 256])
    )

    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=1e-4,
        n_steps=1024,
        batch_size=256,
        n_epochs=15,
        gamma=0.99,
        ent_coef=0.001,
        clip_range=0.15,
        policy_kwargs=policy_kwargs,
        verbose=1
    )

    ckpt = CheckpointCallback(50_000, "models", "ppo_checkpoint")

    eval_env = DummyVecEnv([make_env(ds, window)])
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=True, training=False)
    eval_cb = EvalCallback(
        eval_env,
        best_model_save_path=Path("models"),
        log_path=Path("logs/ppo_eval"),
        eval_freq=50_000,
        deterministic=True
    )

    model.learn(timesteps, callback=[ckpt, eval_cb])

    env.save("models/vecnormalize.pkl")
    model.save(MODEL_OUT)


if __name__ == "__main__":
    preprocess()
    train()
