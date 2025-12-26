import argparse
from pathlib import Path
import yfinance as yf
import pandas as pd
import numpy as np

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
NIFTY50_TICKERS = [
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
    "KOTAKBANK.NS","HINDUNILVR.NS","SBIN.NS","HDFC.NS","AXISBANK.NS",
    "LT.NS","ITC.NS","BHARTIARTL.NS","ASIANPAINT.NS","MARUTI.NS",
    "BAJFINANCE.NS","HCLTECH.NS","WIPRO.NS","ONGC.NS","ULTRACEMCO.NS",
    "TITAN.NS","NTPC.NS","SUNPHARMA.NS","POWERGRID.NS","TATASTEEL.NS",
    "COALINDIA.NS","BPCL.NS","TECHM.NS","DIVISLAB.NS","ADANIENT.NS",
    "BRITANNIA.NS","EICHERMOT.NS","HEROMOTOCO.NS","HDFC_LIFE.NS","BERGEPAINT.NS",
    "INDUSINDBK.NS","GRASIM.NS","CIPLA.NS","UPL.NS","SHREECEM.NS",
    "DRREDDY.NS","JSWSTEEL.NS","SBILIFE.NS","TATAMOTORS.NS","GAIL.NS",
    "M&M.NS","PNB.NS","BPCL.NS"  # note: ensure dedupe if needed
]

INDEX_TICKER = "^NSEI"


def download_ticker(ticker: str, start: str = "2010-01-01", end: str = None):
    out = RAW_DIR / f"{ticker.replace('/','_')}.csv"
    print(f"Downloading {ticker} → {out}")
    df = yf.download(ticker, start=start, end=end, progress=False)
    if df.empty:
        raise RuntimeError(f"No data for {ticker}. Check ticker or network.")
    df.reset_index(inplace=True)
    df.to_csv(out, index=False)
    return out


def process_ticker_csv(in_path: Path):
    df = pd.read_csv(in_path)
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df['Close'] = pd.to_numeric(df['Close'], errors='coerce')
    df = df.dropna(subset=['Close']).reset_index(drop=True)
    df['ret'] = df['Close'].pct_change().fillna(0)
    df['logret'] = np.log1p(df['ret'])
    df['ma_5'] = df['Close'].rolling(window=5).mean()
    df['ma_10'] = df['Close'].rolling(window=10).mean()
    df['vol_10'] = df['ret'].rolling(window=10).std()
    df = df.dropna().reset_index(drop=True)
    outp = PROCESSED_DIR / (in_path.stem + '.parquet')
    df.to_parquet(outp, index=False)
    print(f"Processed {in_path.name} → {outp.name} rows={len(df)}")
    return outp


def download_all(tickers=None):
    if tickers is None:
        tickers = NIFTY50_TICKERS
    download_ticker(INDEX_TICKER)
    for t in tickers:
        try:
            download_ticker(t)
        except Exception as e:
            print(f"Warning: failed {t}: {e}")


def process_all():
    for f in sorted(RAW_DIR.glob('*.csv')):
        try:
            process_ticker_csv(f)
        except Exception as e:
            print(f"Processing failed for {f}: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--process', action='store_true')
    parser.add_argument('--list', action='store_true')
    args = parser.parse_args()

    if args.list:
        print('Index ticker:', INDEX_TICKER)
        print('Sample tickers:', NIFTY50_TICKERS[:10])
    if args.download:
        download_all()
    if args.process:
        process_all()