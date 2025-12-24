# realtime/config_smartapi.py
"""
Configuration for SmartAPI streaming client.
FILL THESE WITH YOUR REAL VALUES (DO NOT COMMIT TO GIT).
"""

# ---- SmartAPI credentials ----
SMARTAPI_API_KEY = "uaucQMOd"
SMARTAPI_CLIENT_ID = "S1858330"   # Angel One client code
SMARTAPI_PASSWORD = "1219"   # trading password / PIN
SMARTAPI_TOTP_SECRET = "RBDFRA4P2XCOFW6R7SMD54XOQQ"    # from SmartAPI TOTP setup

# ---- Backend config ----
BACKEND_SIGNAL_URL = "http://127.0.0.1:4000/api/signal"

# ---- RL env / obs config ----
WINDOW_SIZE = 20  # must match your env.window_size (obs_len = window_size + 1)

# ---- Symbols to track ----
# Symbol tokens from Angel One / SmartAPI
# Find tokens from: https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json
# IMPORTANT: Use the correct token for your symbol and exchange
SYMBOL_TOKEN_MAP = {
    # "symbol": (exchangeType, token)
    # exchangeType: 1=NSE, 2=NFO, 3=BSE
    
    "NIFTY": (1, "99926000"),      # NIFTY 50 Index (NSE) - Official token
    # "BANKNIFTY": (1, "99926009"), # NIFTY Bank Index (NSE)
    # "SENSEX": (3, "99919000"),    # BSE Sensex (BSE)
    
    # Add more symbols here...
    # For stocks, use their specific tokens from the OpenAPI ScripMaster
}
