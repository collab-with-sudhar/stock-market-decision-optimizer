

"""
Real-time price streamer using SmartAPI WebSocket 2.0

- Logs into SmartAPI
- Subscribes to live ticks for configured symbols
- Maintains recent closes for each symbol
- Calls your Node backend /api/signal with:
    {
      "closes": [...],
      "position": 0,
      "symbol": "...",
      "price": last_price,
      "dryRun": true
    }

Backend then:
  -> calls FastAPI /predict_from_closes
  -> runs PPO model
  -> generates trading signal (BUY/SELL/HOLD)
  -> emits signal to frontend via WebSocket
  -> users manually place orders based on signals

Run this in a separate terminal:

    (.venv) python -m realtime.smartapi_streamer
"""

from __future__ import annotations

import json
import threading
import time
from collections import deque, defaultdict
from typing import Deque, Dict, List, Tuple

import pyotp
import requests
from logzero import logger
from SmartApi import SmartConnect  # smartapi-python
from SmartApi.smartWebSocketV2 import SmartWebSocketV2
from realtime.tick_to_candle import TickToCandle, Candle
import datetime
from datetime import timezone

from realtime.config_smartapi import (
    SMARTAPI_API_KEY,
    SMARTAPI_CLIENT_ID,
    SMARTAPI_PASSWORD,
    SMARTAPI_TOTP_SECRET,
    BACKEND_SIGNAL_URL,
    WINDOW_SIZE,
    SYMBOL_TOKEN_MAP,
)
agg = TickToCandle(window_minutes=WINDOW_SIZE)
TICK_FANOUT_URL = "http://localhost:4000/api/tick"

from realtime.market_schedule import is_market_open



class PriceBuffer:
    """
    Keeps last N closes per symbol.
    For now we treat each tick's LTP as a 'close' for our RL feature builder.
    """

    def __init__(self, maxlen: int):
        self._buffers: Dict[str, Deque[float]] = defaultdict(
            lambda: deque(maxlen=maxlen)
        )

    def add_price(self, symbol: str, price: float):
        self._buffers[symbol].append(float(price))

    def get_closes(self, symbol: str) -> List[float]:
        return list(self._buffers[symbol])

    def has_enough(self, symbol: str, min_len: int) -> bool:
        return len(self._buffers[symbol]) >= min_len



def smartapi_login() -> Tuple[SmartConnect, str, str, str]:
    """
    Login to SmartAPI and return:
        smart_api_obj, auth_token, refresh_token, feed_token
    """
    logger.info("Logging in to SmartAPI...")
    smart = SmartConnect(api_key=SMARTAPI_API_KEY)

    try:
        totp = pyotp.TOTP(SMARTAPI_TOTP_SECRET).now()
    except Exception as e:
        logger.error("Failed to generate TOTP. Check SMARTAPI_TOTP_SECRET.")
        raise e

    data = smart.generateSession(SMARTAPI_CLIENT_ID, SMARTAPI_PASSWORD, totp)
    if not data.get("status"):
        logger.error("Login failed: %s", data)
        raise RuntimeError(f"SmartAPI login failed: {data}")

    auth_token = data["data"]["jwtToken"]
    refresh_token = data["data"]["refreshToken"]
    feed_token = smart.getfeedToken()

    logger.info("SmartAPI login successful. Feed token obtained.")
    return smart, auth_token, refresh_token, feed_token



def send_signal_to_backend(
    closes: List[float],
    symbol: str,
    last_price: float,
    dry_run: bool = True,
):
    """
    Call Node backend /api/signal with closes.
    Backend will compute position_flag using its Mongo Position state.
    """
    payload = {
      "closes": closes,
      "symbol": symbol,
      "price": last_price,
      "dryRun": dry_run,
    }
    try:
        resp = requests.post("http://localhost:4000/api/signal", json=payload, timeout=3)
        logger.info(
            "Backend response (%s): %s",
            symbol,
            resp.text[:200],
        )
    except Exception as e:
        logger.error("Error calling backend for %s: %s", symbol, e)



def run_stream():
    smart, auth_token, refresh_token, feed_token = smartapi_login()

    token_list = []
    for symbol, (exchange_type, token) in SYMBOL_TOKEN_MAP.items():
        token_list.append({"exchangeType": int(exchange_type), "tokens": [str(token)]})

    logger.info("Subscribing token_list: %s", token_list)

    def exchange_from_type(exchange_type: int) -> str:
        mapping = {
            1: "NSE",
            2: "NFO",
            3: "BSE",
        }
        return mapping.get(int(exchange_type), "NSE")

    def _parse_candle_ts(ts_str: str) -> int:

        try:
            s = ts_str.replace('Z', '+00:00')
            dt = datetime.datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt_utc = dt.astimezone(timezone.utc)
            return int(dt_utc.timestamp() * 1000)
        except Exception:
            pass

        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
            try:
                dt = datetime.datetime.strptime(ts_str, fmt)
                dt = dt.replace(tzinfo=timezone.utc)
                return int(dt.timestamp() * 1000)
            except Exception:
                continue
        raise ValueError(f"Unrecognized candle ts format: {ts_str}")

    def try_seed_symbol_history(symbol: str, exchange_type: int, token: str):
        """
        WARM-START: Fetch historical 1-minute candles from SmartAPI to initialize candle buffer.
        
        Per specification:
        - Fetches last WINDOW_SIZE+10 minutes of historical data
        - Parses and sorts chronologically (oldest to newest)
        - Seeds aggregator history with completed candles
        - Ensures immediate prediction capability (no 21-minute wait)
        """
        try:
            logger.info("[WARM_START] Fetching historical candles for %s...", symbol)
            
            end = datetime.datetime.now()
            start = end - datetime.timedelta(minutes=WINDOW_SIZE + 10)
            params = {
                "exchange": exchange_from_type(exchange_type),
                "symboltoken": str(token),
                "interval": "ONE_MINUTE",
                "fromdate": start.strftime("%Y-%m-%d %H:%M"),
                "todate": end.strftime("%Y-%m-%d %H:%M"),
            }
            
            logger.info("[WARM_START] API params: %s", params)
            resp = smart.getCandleData(params)

            logger.info("[WARM_START] API Response status: %s", resp.get("status") if resp else "No response")
            logger.info("[WARM_START] API Response message: %s", resp.get("message") if resp else "N/A")
            
            if not resp:
                logger.warning("[WARM_START] ❌ No response from getCandleData for %s", symbol)
                logger.info("[WARM_START] Will fall back to left-padding strategy")
                return
                
            if not resp.get("status"):
                logger.warning("[WARM_START] ❌ Historical fetch failed for %s", symbol)
                logger.warning("[WARM_START] Full API Response: %s", resp)
                logger.info("[WARM_START] Will fall back to left-padding strategy")
                return
                
            series = resp.get("data") or []
            logger.info("[WARM_START] ✅ Received %d raw candles from SmartAPI for %s", len(series), symbol)

            if series and len(series) > 0:
                logger.info("[WARM_START] First candle sample: %s", series[0])
                logger.info("[WARM_START] Last candle sample: %s", series[-1])
            else:
                logger.warning("[WARM_START] ⚠️ Empty data array - possible causes:")
                logger.warning("[WARM_START]   1. Market is closed or outside trading hours")
                logger.warning("[WARM_START]   2. Symbol token '%s' may be incorrect", token)
                logger.warning("[WARM_START]   3. Time range has no data available")
                logger.warning("[WARM_START]   4. Symbol may require different exchange type")



            candles: List[Candle] = []
            for row in series:
                try:
                    ts_str = row[0]
                    o, h, l, c = float(row[1]), float(row[2]), float(row[3]), float(row[4])


                    if c > 100000:
                        o, h, l, c = o/100.0, h/100.0, l/100.0, c/100.0
                    
                    ts_ms = _parse_candle_ts(ts_str)

                    candles.append(Candle(ts=ts_ms, open=o, high=h, low=l, close=c, volume=0.0, ltp_snapshot=c))
                except Exception as e:
                    logger.debug("[WARM_START] Failed to parse candle row %s: %s", row, e)
                    continue

            if not candles:
                logger.warning("[WARM_START] ❌ No valid candles parsed for %s", symbol)
                logger.info("[WARM_START] Will fall back to left-padding strategy")
                return

            candles.sort(key=lambda x: x.ts)

            seed = candles[-(WINDOW_SIZE + 1):] if len(candles) >= (WINDOW_SIZE + 1) else candles

            h = agg.history[symbol]
            h.clear()
            for cndl in seed:
                h.append(cndl)
            
            if seed:
                first_dt = datetime.datetime.fromtimestamp(seed[0].ts/1000.0)
                last_dt = datetime.datetime.fromtimestamp(seed[-1].ts/1000.0)
                closes_list = [c.close for c in seed]
                
                logger.info(
                    "[WARM_START] ✅ %s initialized with %d historical candles", 
                    symbol, len(seed)
                )
                logger.info(
                    "[WARM_START] Time range: %s to %s", 
                    first_dt.strftime("%Y-%m-%d %H:%M:%S"), 
                    last_dt.strftime("%Y-%m-%d %H:%M:%S")
                )
                logger.info(
                    "[WARM_START] Close price range: ₹%.2f - ₹%.2f (avg: ₹%.2f)",
                    min(closes_list), max(closes_list), sum(closes_list)/len(closes_list)
                )

                price_variation = max(closes_list) - min(closes_list)
                price_variation_pct = (price_variation / min(closes_list) * 100) if min(closes_list) > 0 else 0
                logger.info(
                    "[WARM_START] Price variation: ₹%.2f (%.2f%%) - %s",
                    price_variation,
                    price_variation_pct,
                    "✅ Real market data" if price_variation_pct > 0.01 else "⚠️ Flat/Mock data"
                )
                logger.info("[WARM_START] Ready for immediate prediction (no startup delay)")
            else:
                logger.warning("[WARM_START] ⚠️ Empty seed for %s", symbol)
                
        except Exception as e:
            logger.error("[WARM_START] ❌ Exception during seeding for %s: %s", symbol, e, exc_info=True)
            logger.info("[WARM_START] Will fall back to left-padding strategy")

    logger.info("=" * 60)
    logger.info("WARM-START PHASE: Initializing candle buffers")
    logger.info("=" * 60)
    
    seeded_symbols = []
    failed_symbols = []
    
    for symbol, (exchange_type, token) in SYMBOL_TOKEN_MAP.items():
        initial_count = len(agg.history.get(symbol, []))
        try_seed_symbol_history(symbol, exchange_type, token)
        final_count = len(agg.history.get(symbol, []))
        
        if final_count >= 21:
            seeded_symbols.append(f"{symbol}({final_count} candles)")
        elif final_count > 0:
            seeded_symbols.append(f"{symbol}({final_count} candles, will pad)")
        else:
            failed_symbols.append(symbol)
    
    logger.info("=" * 60)
    if seeded_symbols:
        logger.info("[WARM_START] ✅ Successfully initialized: %s", ", ".join(seeded_symbols))
    if failed_symbols:
        logger.warning("[WARM_START] ⚠️ Using fallback padding: %s", ", ".join(failed_symbols))
    
    logger.info("[WARM_START] Strategy: Rolling window (21 candles max)")
    logger.info("[WARM_START] Decision trigger: Every completed 1-minute candle")
    logger.info("[WARM_START] Expected outcome: Immediate predictions on first live candle")
    logger.info("=" * 60)
    logger.info("Starting live WebSocket stream...")
    logger.info("=" * 60)

    sws = SmartWebSocketV2(
        auth_token,
        SMARTAPI_API_KEY,
        SMARTAPI_CLIENT_ID,
        feed_token,
    )

    token_to_symbol = {
        str(token): symbol for symbol, (_, token) in SYMBOL_TOKEN_MAP.items()
    }


    

    def on_data(wsapp, message):
        try:

            if isinstance(message, (bytes, bytearray)):
                msg_str = message.decode("utf-8")
                data = json.loads(msg_str)
            elif isinstance(message, dict):
                data = message
            else:
                return

            token = str(data.get("token"))
            if token not in token_to_symbol:
                return
            symbol = token_to_symbol[token]

            raw_ltp = data.get("last_traded_price") or data.get("ltp")
            if raw_ltp is None:
                return
            last_price = float(raw_ltp) / 100.0
            ts_ms = data.get("exchange_timestamp") or int(time.time()*1000)

            closed = agg.add_tick(symbol, last_price, ts_ms=ts_ms)

            closes_count = agg.get_history_count(symbol)
            logger.debug("[tick] %s price=%.2f history_len=%d", symbol, last_price, closes_count)

            try:
                requests.post(TICK_FANOUT_URL, json={"symbol": symbol, "price": last_price, "ts": ts_ms}, timeout=1)
            except Exception:
                logger.debug("Tick fanout failed for %s", symbol)

            if closed is not None:

                sym, candle = closed
                ltp_at_boundary = candle.ltp_snapshot if candle.ltp_snapshot > 0 else candle.close
                logger.info("[CANDLE_CLOSE] %s | LTP_snapshot=%.2f (candle_close=%.2f)", 
                           sym, ltp_at_boundary, candle.close)



                candle_closes = agg.get_closes(sym)  # Returns ltp_snapshot values
                
                if len(candle_closes) >= 21:

                    prices_to_send = candle_closes[-21:]
                    pad_count = 0
                else:


                    if len(candle_closes) > 0:
                        earliest_close = candle_closes[0]
                        pad_count = 21 - len(candle_closes)
                        prices_to_send = [earliest_close] * pad_count + candle_closes
                    else:

                        logger.debug("[DECISION_SKIP] %s | No completed candles yet", sym)
                        prices_to_send = None
                        pad_count = 0
                
                if prices_to_send and len(prices_to_send) == 21:

                    if is_market_open():
                        logger.info("[DECISION_TRIGGER] %s | 21 candles ready (padded=%d real=%d)",
                                    sym, pad_count, len(candle_closes))
                        
                        send_signal_to_backend(
                            closes=prices_to_send,
                            symbol=sym,
                            last_price=candle.close,
                            dry_run=True,
                        )
                    else:
                        logger.debug("[DECISION_SKIP] Market is closed/Holiday. %s", sym)


        except Exception as e:
            logger.exception("Error in on_data: %s", e)
    def on_open(wsapp):
        logger.info("WebSocket opened, subscribing to tokens...")
        try:

            sws.subscribe(correlation_id="corr-1", mode=1, token_list=token_list)
        except Exception as e:
            logger.error("Error sending subscribe: %s", e)

    def on_error(wsapp, error):
        logger.error("WebSocket error: %s", error)

    def on_close(wsapp):
        logger.warning("WebSocket closed.")

    sws.on_data = on_data
    sws.on_open = on_open
    sws.on_error = on_error
    sws.on_close = on_close

    t = threading.Thread(target=sws.connect, daemon=True)
    t.start()

    logger.info("Started SmartAPI WebSocket thread. Listening for ticks...")

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logger.info("Interrupted by user, closing websocket...")
        try:
            sws.close()
        except Exception:
            pass
        logger.info("Exiting.")


if __name__ == "__main__":
    run_stream()
