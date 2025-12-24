# realtime/test_candle_fetch.py
"""
Simple test to verify SmartAPI getCandleData returns real historical data
"""
import datetime
import json
from realtime.config_smartapi import SYMBOL_TOKEN_MAP, WINDOW_SIZE

def test_candle_fetch():
    print("=" * 80)
    print("TESTING SMARTAPI HISTORICAL CANDLE FETCH")
    print("=" * 80)
    print()
    
    # Import SmartAPI components
    try:
        import pyotp
        from SmartApi import SmartConnect
        from realtime.config_smartapi import (
            SMARTAPI_API_KEY,
            SMARTAPI_CLIENT_ID,
            SMARTAPI_PASSWORD,
            SMARTAPI_TOTP_SECRET,
        )
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("  pip install smartapi-python pyotp")
        return
    
    # Login
    print("📱 Logging in to SmartAPI...")
    try:
        smart = SmartConnect(api_key=SMARTAPI_API_KEY)
        totp = pyotp.TOTP(SMARTAPI_TOTP_SECRET).now()
        session = smart.generateSession(SMARTAPI_CLIENT_ID, SMARTAPI_PASSWORD, totp)
        
        if not session or not session.get("status"):
            print(f"❌ Login failed: {session}")
            return
        
        print(f"✅ Login successful: {session['data'].get('name', 'Unknown')}")
        print()
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return
    
    # Test each symbol
    for symbol, (exchange_type, token) in SYMBOL_TOKEN_MAP.items():
        print("-" * 80)
        print(f"📊 Testing: {symbol}")
        print(f"   Exchange Type: {exchange_type}, Token: {token}")
        
        # Determine exchange name
        exchange_map = {1: "NSE", 2: "NFO", 3: "BSE"}
        exchange = exchange_map.get(int(exchange_type), "NSE")
        print(f"   Exchange: {exchange}")
        
        # Calculate time range
        now = datetime.datetime.now()
        end = now
        start = end - datetime.timedelta(minutes=WINDOW_SIZE + 10)
        
        print(f"   Time Range:")
        print(f"     From: {start.strftime('%Y-%m-%d %H:%M')}")
        print(f"     To:   {end.strftime('%Y-%m-%d %H:%M')}")
        print(f"     Duration: {WINDOW_SIZE + 10} minutes")
        print()
        
        # Make API call
        params = {
            "exchange": exchange,
            "symboltoken": str(token),
            "interval": "ONE_MINUTE",
            "fromdate": start.strftime("%Y-%m-%d %H:%M"),
            "todate": end.strftime("%Y-%m-%d %H:%M"),
        }
        
        print(f"   📤 Requesting historical candles...")
        print(f"   API Params: {json.dumps(params, indent=6)}")
        print()
        
        try:
            response = smart.getCandleData(params)
            
            # Check response
            if not response:
                print(f"   ❌ No response received")
                print()
                continue
            
            print(f"   📥 Response received")
            print(f"   Status: {response.get('status', 'N/A')}")
            print(f"   Message: {response.get('message', 'N/A')}")
            
            if not response.get("status"):
                print(f"   ❌ Request failed")
                print(f"   Full response: {json.dumps(response, indent=6)}")
                print()
                continue
            
            # Parse data
            data = response.get("data", [])
            print(f"   ✅ Candles received: {len(data)}")
            print()
            
            if not data:
                print(f"   ⚠️  No candles in response (market may be closed)")
                print()
                continue
            
            # Show first and last candles
            print(f"   📈 First 3 candles:")
            for i, candle in enumerate(data[:3]):
                ts, o, h, l, c = candle[0], candle[1], candle[2], candle[3], candle[4]
                # Convert from paise if needed
                if float(c) > 100000:
                    o, h, l, c = float(o)/100, float(h)/100, float(l)/100, float(c)/100
                    unit = " (converted from paise)"
                else:
                    o, h, l, c = float(o), float(h), float(l), float(c)
                    unit = ""
                print(f"      [{i}] {ts} | O:{o:8.2f} H:{h:8.2f} L:{l:8.2f} C:{c:8.2f}{unit}")
            
            if len(data) > 6:
                print(f"      ... ({len(data) - 6} more candles) ...")
            
            print(f"   📉 Last 3 candles:")
            for i, candle in enumerate(data[-3:]):
                idx = len(data) - 3 + i
                ts, o, h, l, c = candle[0], candle[1], candle[2], candle[3], candle[4]
                if float(c) > 100000:
                    o, h, l, c = float(o)/100, float(h)/100, float(l)/100, float(c)/100
                    unit = " (converted from paise)"
                else:
                    o, h, l, c = float(o), float(h), float(l), float(c)
                    unit = ""
                print(f"      [{idx}] {ts} | O:{o:8.2f} H:{h:8.2f} L:{l:8.2f} C:{c:8.2f}{unit}")
            
            print()
            
            # Analyze close prices
            closes = [float(c[4]) for c in data]
            # Convert from paise if needed
            if closes[0] > 100000:
                closes = [c/100 for c in closes]
            
            min_close = min(closes)
            max_close = max(closes)
            avg_close = sum(closes) / len(closes)
            variation = max_close - min_close
            variation_pct = (variation / min_close * 100) if min_close > 0 else 0
            
            print(f"   📊 Statistics (all {len(closes)} candles):")
            print(f"      Min Close:  ₹{min_close:,.2f}")
            print(f"      Max Close:  ₹{max_close:,.2f}")
            print(f"      Avg Close:  ₹{avg_close:,.2f}")
            print(f"      Latest:     ₹{closes[-1]:,.2f}")
            print(f"      Variation:  ₹{variation:,.2f} ({variation_pct:.2f}%)")
            
            # Verify real data
            if variation_pct > 0.01:
                print(f"      ✅ REAL MARKET DATA (prices are varying)")
            else:
                print(f"      ⚠️  FLAT DATA (may be outside trading hours)")
            
            # Check if enough for model
            last_21 = data[-21:] if len(data) >= 21 else data
            print()
            print(f"   🤖 Model Readiness:")
            print(f"      Need 21 candles for prediction")
            print(f"      Have {len(last_21)} recent candles")
            if len(last_21) >= 21:
                print(f"      ✅ READY - Can predict immediately")
            else:
                padding = 21 - len(last_21)
                print(f"      ⚠️  Need {padding} candles of left-padding")
                print(f"      Will use earliest close (₹{closes[0]:.2f}) for padding")
            
            print()
            print(f"   ✅ Test PASSED for {symbol}")
            print()
            
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            import traceback
            traceback.print_exc()
            print()
            continue
    
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    test_candle_fetch()
