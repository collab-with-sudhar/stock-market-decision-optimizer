class ExecutionEngine:
    def __init__(self):
        self.max_trades_per_day = 3
        self.daily_loss_limit = -0.01  # -1%
        self.stop_loss = -0.003        # -0.3%
        self.take_profit = 0.006       # +0.6%

        self.trades_today = 0
        self.daily_pnl = 0.0

    def can_trade(self):
        if self.trades_today >= self.max_trades_per_day:
            return False
        if self.daily_pnl <= self.daily_loss_limit:
            return False
        return True

    def update_pnl(self, trade_return):
        self.daily_pnl += trade_return
        self.trades_today += 1
