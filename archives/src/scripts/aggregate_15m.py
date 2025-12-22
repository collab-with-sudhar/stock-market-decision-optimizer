# scripts/aggregate_15m.py
import pandas as pd
import glob
from pathlib import Path
import math

RAW = Path("data/raw")
OUT = Path("data/processed_15m")
OUT.mkdir(parents=True, exist_ok=True)

# adjust this to your CSV name
CSV = RAW / "NIFTY 50_minute.csv"

if not CSV.exists():
    raise FileNotFoundError(f"{CSV} not found. Put your CSV at data/raw/")

print("Reading CSV (may take a while)...")
df = pd.read_csv(CSV, parse_dates=["date", "Date"] if "Date" in pd.read_csv(CSV, nrows=1).columns else ["date"])
# unify column name
if "date" in df.columns:
    df.rename(columns={"date": "Date"}, inplace=True)

df = df[["Date", "open", "high", "low", "close", "volume"]].copy()
df.columns = ["Date", "Open", "High", "Low", "Close", "Volume"]
df = df.set_index("Date").sort_index()

# resample to 15 minutes
df15 = df.resample("15T").agg({
    "Open": "first",
    "High": "max",
    "Low": "min",
    "Close": "last",
    "Volume": "sum"
}).dropna().reset_index()

# If volume is all zeros, set to 1 as placeholder so no divide-by-zero in feature code
if (df15["Volume"] == 0).all():
    df15["Volume"] = 1

# Split into segments of roughly X rows
rows_per_segment = 5000  # ~52 days if 15m bars, tune if needed
n_segments = math.ceil(len(df15) / rows_per_segment)
print(f"Total 15m rows: {len(df15)}, will write {n_segments} segments (~{rows_per_segment} rows each)")

for i in range(n_segments):
    start = i * rows_per_segment
    end = start + rows_per_segment
    seg = df15.iloc[start:end].copy()
    if len(seg) < 64:
        continue
    outp = OUT / f"segment_{i:03d}.parquet"
    seg.to_parquet(outp)
    print("Wrote", outp)

print("Done.")
