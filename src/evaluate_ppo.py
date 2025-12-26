
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

from src.envs.trading_env_improved import TradingEnvImproved


def build_env(df, window):
    def make():
        return TradingEnvImproved(
            df=df,
            window_size=window,
            transaction_cost=0.001,
            slippage=0.0005,
            trade_penalty=0.0002,
            risk_aversion=0.0,
            reward_norm=True
        )
    return DummyVecEnv([make])
parser = argparse.ArgumentParser()
parser.add_argument("--model", type=str, required=True)
parser.add_argument("--csv", type=str, required=True)
parser.add_argument("--window", type=int, default=20)
parser.add_argument("--norm", type=str, default=None, help="VecNormalize stats file (optional)")
parser.add_argument("--plots-dir", type=str, default="plots")
args = parser.parse_args()

MODEL = Path(args.model)
CSV = Path(args.csv)
PLOTS = Path(args.plots_dir)
PLOTS.mkdir(parents=True, exist_ok=True)
df = pd.read_csv(CSV)
df.rename(columns={c: c.capitalize() for c in df.columns}, inplace=True)

if "Date" in df.columns:
    df["Date"] = pd.to_datetime(df["Date"])
eval_env = build_env(df, args.window)
if args.norm:
    if Path(args.norm).exists():
        eval_env = VecNormalize.load(args.norm, eval_env)
        eval_env.training = False
        eval_env.norm_reward = False
    else:
        print(f"[WARNING] Norm file {args.norm} not found. Skipping normalization.")
model = PPO.load(str(MODEL), env=eval_env)
obs = eval_env.reset()
records = []
step = 0
inner = eval_env.envs[0]

while True:
    action, _ = model.predict(obs, deterministic=True)
    obs, rewards, dones, infos = eval_env.step(action)

    done = bool(dones[0])
    a = int(action[0])
    r = float(rewards[0])
    info = infos[0]

    idx = getattr(inner, "current_step", step + args.window)
    price = float(df.loc[idx, "Close"]) if idx < len(df) else np.nan
    date = df.loc[idx, "Date"] if "Date" in df.columns and idx < len(df) else None
    pv = float(info.get("portfolio_value", np.nan))

    records.append({
        "step": step,
        "env_step": idx,
        "date": date,
        "price": price,
        "action": a,
        "reward": r,
        "portfolio": pv
    })

    step += 1
    if done or step > len(df):
        break
results = pd.DataFrame(records)
results.to_csv(PLOTS / "ppo_evaluation_results.csv", index=False)
results["portfolio"] = pd.to_numeric(results["portfolio"], errors="coerce")
results = results.dropna(subset=["portfolio"]).reset_index(drop=True)

start = results["portfolio"].iloc[0]
end = results["portfolio"].iloc[-1]
total_return = end / start - 1
period_returns = results["portfolio"].pct_change().fillna(0)

annual_factor = 252
annual_return = (1 + total_return) ** (annual_factor / len(results)) - 1
sharpe = period_returns.mean() / period_returns.std() * np.sqrt(annual_factor)
mdd = (results["portfolio"] / results["portfolio"].cummax() - 1).min()

pd.DataFrame([{
    "start_value": start,
    "end_value": end,
    "total_return": total_return,
    "annual_return": annual_return,
    "sharpe": sharpe,
    "max_drawdown": mdd
}]).to_csv(PLOTS / "ppo_metrics_summary.csv", index=False)
plt.figure(figsize=(10, 5))
x = results["date"] if results["date"].notna().any() else results["env_step"]
plt.plot(x, results["portfolio"])
plt.title("PPO Equity Curve")
plt.grid(True)
plt.tight_layout()
plt.savefig(PLOTS / "ppo_equity_curve.png")
plt.close()
plt.figure(figsize=(12, 5))
plt.plot(x, results["price"])
buys = results[results["action"] == 1]
sells = results[results["action"] == 2]
plt.scatter(buys["env_step"], buys["price"], marker="^", label="Buy")
plt.scatter(sells["env_step"], sells["price"], marker="v", label="Sell")
plt.title("Price with PPO Buy/Sell Actions")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig(PLOTS / "ppo_price_actions.png")
plt.close()

print("Evaluation complete!")
print("Files saved to:", PLOTS.resolve())
