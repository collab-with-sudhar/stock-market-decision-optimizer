import argparse
from pathlib import Path
import pandas as pd
from stable_baselines3 import DQN
from stable_baselines3.common.vec_env import DummyVecEnv
from src.envs.gym_trading_env import SimpleTradingEnv

parser = argparse.ArgumentParser()
parser.add_argument('--csv', type=str, default='data/raw/^NSEI.csv')
parser.add_argument('--timesteps', type=int, default=20000)
parser.add_argument('--window', type=int, default=10)
parser.add_argument('--model-out', type=str, default='models/dqn_nifty')
args = parser.parse_args()

csv_path = Path(args.csv)
if not csv_path.exists():
    raise FileNotFoundError(f"CSV not found: {csv_path}")

df = pd.read_csv(csv_path)

env = DummyVecEnv([lambda: SimpleTradingEnv(df, window_size=args.window)])
model = DQN('MlpPolicy', env, verbose=1, buffer_size=10000, learning_starts=1000, batch_size=32)
model.learn(total_timesteps=args.timesteps)
model.save(args.model_out)
print('Training complete. Model saved to', args.model_out + '.zip')