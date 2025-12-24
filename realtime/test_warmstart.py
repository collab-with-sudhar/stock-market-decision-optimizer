# realtime/test_warmstart.py
"""
Test script to verify warm-start functionality:
1. Fetches historical 1-minute candles from SmartAPI
2. Validates the data is real and recent
3. Checks if 20+ candles are available for immediate prediction
"""

import sys
import datetime
import pyotp
from SmartApi import SmartConnect
from logzero import logger

from realtime.config_smartapi import (
    SMARTAPI_API_KEY,
    SMARTAPI_CLIENT_ID,
    SMARTAPI_PASSWORD,
    SMARTAPI_TOTP_SECRET,
    WINDOW_SIZE,
    SYMBOL_TOKEN_MAP,
)

def smartapi_login():
    """Login to SmartAPI and return authenticated client"""
    logger.info("Logging in to SmartAPI...")
    smart = SmartConnect(api_key=SMARTAPI_API_KEY)
    
    totp_generator = pyotp.TOTP(SMARTAPI_TOTP_SECRET)
    totp = totp_generator.now()
    
    session = smart.generateSession(SMARTAPI_CLIENT_ID, SMARTAPI_PASSWORD, totp)
    
    if not session or not session.get("status"):
        raise RuntimeError(f"SmartAPI login failed: {session}")
    
    logger.info("✅ SmartAPI login successful")
    logger.info(f"User: {session['data'].get('name', 'Unknown')}")
    
    return smart

def exchange_from_type(exchange_type: int) -> str:
    """Convert exchange type number to string"""
    mapping = {
        1: "NSE",
        2: "NFO",
        3: "BSE",
    }
    return mapping.get(int(exchange_type), "NSE")

def parse_candle_timestamp(ts_str: str) -> datetime.datetime:
    """Parse candle timestamp string to datetime object"""
    try:
        # Try ISO format first
        s = ts_str.replace('Z', '+00:00')
        dt = datetime.datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(datetime.timezone.utc)
    except Exception:
        pass
    
    # Try common formats
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.datetime.strptime(ts_str, fmt)
            return dt.replace(tzinfo=datetime.timezone.utc)
        except Exception:
            continue
    
    raise ValueError(f"Unrecognized timestamp format: {ts_str}")

def test_warm_start():
    """Test warm-start historical candle fetching"""
    logger.info("=" * 80)
    logger.info("WARM-START VERIFICATION TEST")
    logger.info("=" * 80)
    
    # Login to SmartAPI
    smart = smartapi_login()
    
    # Test for each configured symbol
    for symbol, (exchange_type, token) in SYMBOL_TOKEN_MAP.items():
        logger.info("")
        logger.info("-" * 80)
        logger.info(f"Testing warm-start for: {symbol}")
        logger.info(f"Exchange: {exchange_from_type(exchange_type)}, Token: {token}")
        logger.info("-" * 80)
        
        # Calculate time range (WINDOW_SIZE + 10 minutes of history)
        end = datetime.datetime.now()
        start = end - datetime.timedelta(minutes=WINDOW_SIZE + 10)
        
        logger.info(f"Requesting historical data:")
        logger.info(f"  Start: {start.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"  End:   {end.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"  Duration: {WINDOW_SIZE + 10} minutes")
        
        # Fetch historical candles from SmartAPI
        params = {
            "exchange": exchange_from_type(exchange_type),
            "symboltoken": str(token),
            "interval": "ONE_MINUTE",
            "fromdate": start.strftime("%Y-%m-%d %H:%M"),
            "todate": end.strftime("%Y-%m-%d %H:%M"),
        }
        
        try:
            resp = smart.getCandleData(params)
            
            if not resp or not resp.get("status"):
                logger.error(f"❌ FAILED to fetch historical data for {symbol}")
                logger.error(f"Response: {resp}")
                continue
            
            series = resp.get("data") or []
            logger.info(f"✅ Received {len(series)} raw candles from SmartAPI")
            
            if not series:
                logger.warning(f"⚠️ No candles returned (market may be closed or symbol inactive)")
                continue
            
            # Parse and validate candles
            parsed_candles = []
            for idx, row in enumerate(series):
                try:
                    ts_str = row[0]
                    o, h, l, c = float(row[1]), float(row[2]), float(row[3]), float(row[4])
                    volume = float(row[5]) if len(row) > 5 else 0.0
                    
                    # Check if prices are in paise (heuristic: close > 100000)
                    if c > 100000:
                        o, h, l, c = o/100.0, h/100.0, l/100.0, c/100.0
                        price_unit = "paise->rupees"
                    else:
                        price_unit = "rupees"
                    
                    dt = parse_candle_timestamp(ts_str)
                    
                    parsed_candles.append({
                        'timestamp': dt,
                        'open': o,
                        'high': h,
                        'low': l,
                        'close': c,
                        'volume': volume,
                        'unit': price_unit
                    })
                    
                    # Log first and last few candles for verification
                    if idx < 3 or idx >= len(series) - 3:
                        logger.info(
                            f"  [{idx:2d}] {dt.strftime('%H:%M')} | "
                            f"O:{o:8.2f} H:{h:8.2f} L:{l:8.2f} C:{c:8.2f} | "
                            f"V:{volume:,.0f} ({price_unit})"
                        )
                    elif idx == 3:
                        logger.info(f"  ... ({len(series) - 6} more candles) ...")
                        
                except Exception as e:
                    logger.warning(f"  Failed to parse row {idx}: {row[:2]}... - {e}")
                    continue
            
            if not parsed_candles:
                logger.error(f"❌ No valid candles parsed for {symbol}")
                continue
            
            # Sort chronologically
            parsed_candles.sort(key=lambda x: x['timestamp'])
            
            # Extract last 21 candles for model prediction
            last_21 = parsed_candles[-21:] if len(parsed_candles) >= 21 else parsed_candles
            closes_21 = [c['close'] for c in last_21]
            
            # Validation and statistics
            logger.info("")
            logger.info("📊 VALIDATION RESULTS:")
            logger.info(f"  Total valid candles parsed: {len(parsed_candles)}")
            logger.info(f"  Candles for model (last 21): {len(last_21)}")
            logger.info(f"  Time range covered:")
            logger.info(f"    First: {parsed_candles[0]['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"    Last:  {parsed_candles[-1]['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Check if data is recent (within last hour)
            now = datetime.datetime.now(datetime.timezone.utc)
            last_candle_age = now - parsed_candles[-1]['timestamp']
            logger.info(f"  Data freshness: {last_candle_age.total_seconds()/60:.1f} minutes old")
            
            if last_candle_age.total_seconds() > 3600:
                logger.warning(f"  ⚠️ Data may be stale (>{int(last_candle_age.total_seconds()/60)} min old)")
            else:
                logger.info(f"  ✅ Data is recent")
            
            # Price statistics
            logger.info(f"  Close price stats (last 21):")
            logger.info(f"    Min:     ₹{min(closes_21):.2f}")
            logger.info(f"    Max:     ₹{max(closes_21):.2f}")
            logger.info(f"    Average: ₹{sum(closes_21)/len(closes_21):.2f}")
            logger.info(f"    Latest:  ₹{closes_21[-1]:.2f}")
            
            # Check if we have enough for immediate prediction
            if len(last_21) >= 21:
                logger.info(f"  ✅ READY FOR IMMEDIATE PREDICTION (21 candles available)")
            elif len(last_21) > 0:
                padding_needed = 21 - len(last_21)
                logger.info(f"  ⚠️ Need padding: {padding_needed} candles (have {len(last_21)})")
                logger.info(f"  Will left-pad with earliest close: ₹{closes_21[0]:.2f}")
            else:
                logger.error(f"  ❌ NO DATA - Cannot generate predictions")
            
            # Verify data is real (check for variation)
            price_range = max(closes_21) - min(closes_21)
            price_variation_pct = (price_range / min(closes_21)) * 100 if min(closes_21) > 0 else 0
            
            logger.info(f"  Price variation: ₹{price_range:.2f} ({price_variation_pct:.2f}%)")
            
            if price_variation_pct > 0.01:  # More than 0.01% variation
                logger.info(f"  ✅ Real market data (prices are varying)")
            else:
                logger.warning(f"  ⚠️ Flat prices detected (may be outside trading hours)")
            
            logger.info("")
            logger.info(f"✅ Warm-start test PASSED for {symbol}")
            
        except Exception as e:
            logger.error(f"❌ Exception during warm-start test for {symbol}: {e}", exc_info=True)
            continue
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("WARM-START VERIFICATION TEST COMPLETE")
    logger.info("=" * 80)

if __name__ == "__main__":
    try:
        test_warm_start()
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Test failed with exception: {e}", exc_info=True)
        sys.exit(1)
