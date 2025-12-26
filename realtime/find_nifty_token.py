
"""
Helper script to find the correct NIFTY 50 index token from SmartAPI.
SmartAPI provides a symbol master file that contains all valid tokens.
"""

import pyotp
from SmartApi import SmartConnect
from logzero import logger
import json

from realtime.config_smartapi import (
    SMARTAPI_API_KEY,
    SMARTAPI_CLIENT_ID,
    SMARTAPI_PASSWORD,
    SMARTAPI_TOTP_SECRET,
)

def find_nifty_token():
    """Find the correct NIFTY 50 token from SmartAPI"""
    
    print("=" * 80)
    print("FINDING CORRECT NIFTY 50 TOKEN FROM SMARTAPI")
    print("=" * 80)
    print()
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
    
    print("🔍 Searching for NIFTY 50 index...")
    print()
    search_terms = ["NIFTY 50", "NIFTY", "NIFTY50", "Nifty 50"]
    
    for term in search_terms:
        print(f"Searching for: '{term}'")
        try:
            if hasattr(smart, 'searchScrip'):
                result = smart.searchScrip(term)
                print(f"  Result: {json.dumps(result, indent=2)}")
            else:
                print(f"  searchScrip method not available in this API version")
        except Exception as e:
            print(f"  Error: {e}")
        print()
    
    print("-" * 80)
    print("COMMON NIFTY INDEX TOKENS (from Angel One documentation):")
    print("-" * 80)
    known_tokens = {
        "NIFTY 50": {
            "token": "99926000",  # Official NIFTY 50 index token
            "exchange": "NSE",
            "exchangeType": 1,
            "name": "Nifty 50"
        },
        "NIFTY BANK": {
            "token": "99926009",  # Official NIFTY Bank index token
            "exchange": "NSE",
            "exchangeType": 1,
            "name": "Nifty Bank"
        },
        "NIFTY FIN SERVICE": {
            "token": "99926037",
            "exchange": "NSE",
            "exchangeType": 1,
            "name": "Nifty Financial Services"
        },
        "SENSEX": {
            "token": "99919000",
            "exchange": "BSE",
            "exchangeType": 3,
            "name": "BSE Sensex"
        }
    }
    
    for idx_name, info in known_tokens.items():
        print(f"\n{idx_name}:")
        print(f"  Token: {info['token']}")
        print(f"  Exchange: {info['exchange']} (Type: {info['exchangeType']})")
        print(f"  Full Name: {info['name']}")
    
    print()
    print("=" * 80)
    print("TESTING NIFTY 50 TOKEN: 99926000")
    print("=" * 80)
    print()
    token = "99926000"
    exchange_type = 1  # NSE
    
    import datetime
    end = datetime.datetime.now()
    start = end - datetime.timedelta(minutes=30)
    
    params = {
        "exchange": "NSE",
        "symboltoken": token,
        "interval": "ONE_MINUTE",
        "fromdate": start.strftime("%Y-%m-%d %H:%M"),
        "todate": end.strftime("%Y-%m-%d %H:%M"),
    }
    
    print(f"Testing historical candle fetch...")
    print(f"Params: {json.dumps(params, indent=2)}")
    print()
    
    try:
        response = smart.getCandleData(params)
        
        print(f"API Response:")
        print(f"  Status: {response.get('status')}")
        print(f"  Message: {response.get('message')}")
        
        if response.get("data"):
            candles = response.get("data", [])
            print(f"  Candles received: {len(candles)}")
            
            if candles:
                print(f"\n  First candle: {candles[0]}")
                print(f"  Last candle: {candles[-1]}")
                last_candle = candles[-1]
                ts, o, h, l, c = last_candle[0], last_candle[1], last_candle[2], last_candle[3], last_candle[4]
                if float(c) > 100000:
                    c_rupees = float(c) / 100
                    print(f"\n  Latest close: {c} paise = ₹{c_rupees:.2f}")
                else:
                    print(f"\n  Latest close: ₹{float(c):.2f}")
                
                print(f"\n  ✅ Token 99926000 is VALID for NIFTY 50!")
            else:
                print(f"\n  ⚠️ No candle data (market may be closed)")
        else:
            print(f"  ❌ No data in response")
            print(f"  Full response: {json.dumps(response, indent=2)}")
            
    except Exception as e:
        print(f"❌ Error testing token: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 80)
    print("RECOMMENDATION:")
    print("=" * 80)
    print()
    print("Update your config_smartapi.py:")
    print()
    print("SYMBOL_TOKEN_MAP = {")
    print("    'NIFTY': (1, '99926000'),  # NIFTY 50 Index (NSE)")
    print("    # 'BANKNIFTY': (1, '99926009'),  # NIFTY Bank Index (NSE)")
    print("}")
    print()

if __name__ == "__main__":
    find_nifty_token()
