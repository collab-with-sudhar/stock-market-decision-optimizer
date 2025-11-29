# src/walkforward.py
"""
Walk-forward evaluation for trading RL models.
Trains PPO on rolling windows and evaluates out-of-sample performance.

Usage example:
python -m src.walkforward \
    --csv data/raw/^NSEI.csv \
    --window-days 504 \
    --test-days 252 \
    --step-days 252 \
    --train-timesteps 50000
"""

import argparse
from pathlib import Path
import pandas as pd
from subprocess import run


parser = argparse.ArgumentParser()

parser.add_argument("--csv", type=str, required=True, help="Full dataset CSV path")
parser.add_argument("--window-days", type=int, default=504, help="Training window size (days)")
parser.add_argument("--test-days", type=int, default=252, help="Test window size (days)")
parser.add_argument("--step-days", type=int, default=252, help="Rolling step size")
parser.add_argument("--train-timesteps", type=int, default=50000)
parser.add_argument("--model-out-dir", type=str, default="models/walk")
parser.add_argument("--tmp-train", type=str, default="data/tmp_train_slice.csv")
parser.add_argument("--tmp-test", type=str, default="data/tmp_test_slice.csv")

args = parser.parse_args()


# Load full dataset
csv_path = Path(args.csv)
assert csv_path.exists(), f"CSV not found: {csv_path}"

df = pd.read_csv(csv_path)
n = len(df)

train_window = args.window_days
test_window = args.test_days
step = args.step_days

out_dir = Path(args.model_out_dir)
out_dir.mkdir(parents=True, exist_ok=True)

print(f"Loaded dataset rows: {n}")
print(f"Train window: {train_window} days | Test window: {test_window} days\n")

start = 0

while True:
    train_start = start
    train_end = start + train_window

    test_start = train_end
    test_end = train_end + test_window

    if test_end > n:
        print("Reached end of dataset. Stopping walk-forward analysis.")
        break

    # Slice data
    train_df = df.iloc[train_start:train_end].reset_index(drop=True)
    test_df = df.iloc[test_start:test_end].reset_index(drop=True)

    # Save temp slices
    train_slice_path = Path(args.tmp_train)
    test_slice_path = Path(args.tmp_test)

    train_df.to_csv(train_slice_path, index=False)
    test_df.to_csv(test_slice_path, index=False)

    model_name = out_dir / f"ppo_{train_start}_{train_end}"

    print("\n==============================")
    print(f"Training slice {train_start} → {train_end}")
    print("==============================")

    # Train PPO on this slice
    train_cmd = [
        "python", "-m", "src.train_ppo",
        "--csv", str(train_slice_path),
        "--timesteps", str(args.train_timesteps),
        "--model-out", str(model_name)
    ]
    run(train_cmd)

    print("------------------------------")
    print(f"Evaluating test slice {test_start} → {test_end}")
    print("------------------------------")

    # Evaluate on test slice
    eval_cmd = [
        "python", "-m", "src.evaluate_ppo",
        "--model", f"{model_name}.zip",
        "--csv", str(test_slice_path),
        "--window", "20"
    ]
    run(eval_cmd)

    # Move forward
    start += step

print("\nWalk-forward evaluation complete!")
