# Quick test to verify SmartAPI candle data structure
import datetime
import json

# Mock what SmartAPI getCandleData returns
sample_response = {
    "status": True,
    "message": "SUCCESS",
    "data": [
        ["2025-12-24 09:15", 2345050, 2346000, 2344500, 2345500, 15000],
        ["2025-12-24 09:16", 2345500, 2347000, 2345000, 2346200, 18000],
        ["2025-12-24 09:17", 2346200, 2348500, 2346000, 2347800, 22000],
        # ... more candles
    ]
}

print("Sample SmartAPI getCandleData response structure:")
print(json.dumps(sample_response, indent=2))
print()
print("Each candle entry format:")
print("  [0] = timestamp string (YYYY-MM-DD HH:MM)")
print("  [1] = open price (in paise for some symbols)")
print("  [2] = high price")
print("  [3] = low price")
print("  [4] = close price (LTP)")
print("  [5] = volume")
print()
print("Example candle:")
candle = sample_response["data"][0]
print(f"  Raw: {candle}")
print(f"  Timestamp: {candle[0]}")
print(f"  Open:  {candle[1]} paise = ₹{candle[1]/100:.2f}")
print(f"  High:  {candle[2]} paise = ₹{candle[2]/100:.2f}")
print(f"  Low:   {candle[3]} paise = ₹{candle[3]/100:.2f}")
print(f"  Close: {candle[4]} paise = ₹{candle[4]/100:.2f} (This is the LTP)")
print(f"  Volume: {candle[5]}")
