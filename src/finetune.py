
import argparse
from pathlib import Path
import pandas as pd
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from src.envs.trading_env_improved import TradingEnvImproved

parser = argparse.ArgumentParser()
parser.add_argument('--model-in', type=str, required=True)
parser.add_argument('--csv', type=str, required=True)
parser.add_argument('--window', type=int, default=20)
parser.add_argument('--timesteps', type=int, default=2000)
parser.add_argument('--lr', type=float, default=3e-5)
parser.add_argument('--model-out', type=str, default='models/finetuned')
args = parser.parse_args()

model_in = Path(args.model_in)
csv_path = Path(args.csv)
model_out = Path(args.model_out)
model_out.parent.mkdir(parents=True, exist_ok=True)

assert model_in.exists(), "Model not found"
assert csv_path.exists(), "CSV not found"

df = pd.read_csv(csv_path)

def make_env():
    return TradingEnvImproved(df, window_size=args.window,
                              transaction_cost=0.001, slippage=0.0005,
                              trade_penalty=0.0002, risk_aversion=0.0)

env = DummyVecEnv([make_env])
env = VecNormalize(env, norm_obs=True, norm_reward=False)
model = PPO.load(str(model_in), env=env)
model.learning_rate = args.lr

print(f"Fine-tuning {model_in} on {csv_path} for {args.timesteps} timesteps")
model.learn(total_timesteps=args.timesteps)
model.save(str(model_out))
print("Saved fine-tuned model to", model_out)
