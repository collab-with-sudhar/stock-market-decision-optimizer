
"""
Configuration for SmartAPI streaming client.
FILL THESE WITH YOUR REAL VALUES (DO NOT COMMIT TO GIT).
"""
SMARTAPI_API_KEY = "uaucQMOd"
SMARTAPI_CLIENT_ID = "S1858330"   # Angel One client code
SMARTAPI_PASSWORD = "1219"   # trading password / PIN
SMARTAPI_TOTP_SECRET = "RBDFRA4P2XCOFW6R7SMD54XOQQ"    # from SmartAPI TOTP setup
BACKEND_SIGNAL_URL = "http://127.0.0.1:4000/api/signal"
WINDOW_SIZE = 20  # must match your env.window_size (obs_len = window_size + 1)
SYMBOL_TOKEN_MAP = {
    
    "NIFTY": (1, "99926000"),      # NIFTY 50 Index (NSE) - Official token
}
