# realtime/tick_to_candle.py
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import math
import time
import datetime

@dataclass
class Candle:
    ts: int              # epoch ms of candle start
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    ltp_snapshot: float = 0.0  # LTP at minute boundary (for model input)

    def to_close(self):
        """Return LTP snapshot at minute boundary (not aggregated close)"""
        return float(self.ltp_snapshot if self.ltp_snapshot > 0 else self.close)

class TickToCandle:
    """
    Aggregates streaming ticks into fixed 1-minute candles.

    Usage:
      agg = TickToCandle(window_minutes=20)
      agg.add_tick(symbol, last_price, tick_ts_ms)
      # when a candle closes, agg returns (symbol, candle) from add_tick
    """

    def __init__(self, window_minutes: int = 20):
        self.window_ms = 60_000  # 1 minute in ms
        self.window_minutes = int(window_minutes)
        # current open candle per symbol: symbol -> Candle
        self.current: Dict[str, Candle] = {}
        # history deque of closed candles per symbol
        # SPEC: Keep at least 21 candles for model input (with padding if needed)
        self.history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max(self.window_minutes + 5, 21)))

    def _floor_to_min(self, ts_ms: int) -> int:
        # returns epoch ms at candle start (minute aligned)
        dt = datetime.datetime.utcfromtimestamp(ts_ms / 1000.0)
        dt = dt.replace(second=0, microsecond=0)
        # convert back to ms
        return int(dt.timestamp() * 1000)

    def add_tick(self, symbol: str, price: float, ts_ms: Optional[int] = None) -> Optional[Tuple[str, Candle]]:
        """
        Add a tick. If the tick causes the previous candle to close (i.e. new minute),
        the previous candle is moved to history and returned as (symbol, closed_candle).
        Otherwise returns None.
        """
        if ts_ms is None:
            ts_ms = int(time.time() * 1000)

        candle_start = self._floor_to_min(ts_ms)

        cur = self.current.get(symbol)
        if cur is None:
            # create new candle for this minute
            c = Candle(ts=candle_start, open=price, high=price, low=price, close=price, volume=1.0)
            self.current[symbol] = c
            return None

        # same minute?
        if candle_start == cur.ts:
            # update in-place
            cur.high = max(cur.high, price)
            cur.low = min(cur.low, price)
            cur.close = price
            cur.volume += 1.0
            return None
        else:
            # minute changed: close previous candle, push to history
            # IMPORTANT: The 'close' field is the last tick's price from previous minute
            # But for model input, we want LTP at minute boundary (first tick of new minute)
            closed = cur
            closed.ltp_snapshot = price  # This tick's price = LTP at minute boundary
            
            # Create new current candle for this tick's minute
            new_c = Candle(ts=candle_start, open=price, high=price, low=price, close=price, volume=1.0, ltp_snapshot=0.0)
            self.current[symbol] = new_c
            # push closed into history
            h = self.history[symbol]
            h.append(closed)
            # return closed candle so caller can act (i.e. send signal)
            return (symbol, closed)

    def get_closes(self, symbol: str) -> List[float]:
        """
        Return closes from history in chronological order (oldest -> newest).
        """
        return [c.to_close() for c in self.history.get(symbol, [])]

    def get_history_count(self, symbol: str) -> int:
        return len(self.history.get(symbol, []))

    def reset_symbol(self, symbol: str):
        if symbol in self.history:
            self.history[symbol].clear()
        if symbol in self.current:
            del self.current[symbol]
