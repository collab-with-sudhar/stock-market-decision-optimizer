import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updatePortfolioStart, updatePortfolioSuccess, updatePortfolioFailure } from '../redux/portfolioSlice.js';
import { useToast } from '../contexts/ToastContext.jsx';

export const PortfolioOverview = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { summary, loading } = useSelector((state) => state.portfolio);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchPortfolio = async () => {
      dispatch(updatePortfolioStart());
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get('/trading/portfolio/summary');
        if (response.data?.success) {
          dispatch(updatePortfolioSuccess(response.data.summary));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch portfolio');
        }
      } catch (error) {
        console.error('Portfolio fetch error:', error);
        dispatch(updatePortfolioFailure(error.message));
        toast.error('Failed to fetch portfolio data');
      }
    };

    
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10000);
    return () => clearInterval(interval);
  }, [dispatch, toast]);

  if (loading || !summary) {
    return (
      <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin text-landing-primary text-4xl mb-2">⟳</div>
          <p className="text-landing-muted">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 relative overflow-hidden">
      {}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-landing-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

      {}
      <div className="flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-landing-primary text-3xl">portfolio</span>
          <div>
            <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white">Portfolio</h3>
            <p className="text-xs text-landing-muted mt-1">Performance & Holdings</p>
          </div>
        </div>
      </div>

      {}
      <div className="flex gap-2 mb-6 z-10 bg-[#FDF9F9] dark:bg-[#161212] p-1 rounded-lg w-fit">
        {['overview', 'positions', 'metrics', 'trades'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab
                ? 'bg-white dark:bg-[#211A1A] text-landing-primary shadow-sm'
                : 'text-landing-muted hover:text-landing-text'
              }`}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'positions' && '📈 Positions'}
            {tab === 'metrics' && '📉 Metrics'}
            {tab === 'trades' && '🏆 Trades'}
          </button>
        ))}
      </div>

      {}
      {activeTab === 'overview' && (
        <div className="z-10 space-y-6">
          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <p className="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase mb-1">Initial Balance</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{parseFloat(summary.initialBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            {}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
              <p className="text-xs text-purple-600 dark:text-purple-300 font-bold uppercase mb-1">Cash Balance</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">₹{parseFloat(summary.currentBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            {}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
              <p className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1">Total Balance</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">₹{parseFloat(summary.totalBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
              <p className="text-xs text-emerald-600 dark:text-emerald-300 font-bold uppercase mb-2">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${parseFloat(summary.unrealizedPnL) >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                {parseFloat(summary.unrealizedPnL) >= 0 ? '+' : ''}₹{parseFloat(summary.unrealizedPnL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1">({parseFloat(summary.unrealizedPnLPercent).toFixed(2)}%)</p>
            </div>

            {}
            <div className={`bg-gradient-to-br ${parseFloat(summary.realizedPnL) >= 0 ? 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-700' : 'from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-rose-200 dark:border-rose-700'} border rounded-xl p-4`}>
              <p className={`text-xs font-bold uppercase mb-2 ${parseFloat(summary.realizedPnL) >= 0 ? 'text-cyan-600 dark:text-cyan-300' : 'text-rose-600 dark:text-rose-300'}`}>Realized P&L</p>
              <p className={`text-2xl font-bold ${parseFloat(summary.realizedPnL) >= 0 ? 'text-cyan-900 dark:text-cyan-100' : 'text-rose-900 dark:text-rose-100'}`}>
                {parseFloat(summary.realizedPnL) >= 0 ? '+' : ''}₹{parseFloat(summary.realizedPnL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>

            {}
            <div className={`bg-gradient-to-br ${parseFloat(summary.totalPnL) >= 0 ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700' : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700'} border rounded-xl p-4`}>
              <p className={`text-xs font-bold uppercase mb-2 ${parseFloat(summary.totalPnL) >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>Total P&L</p>
              <p className={`text-2xl font-bold ${parseFloat(summary.totalPnL) >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                {parseFloat(summary.totalPnL) >= 0 ? '+' : ''}₹{parseFloat(summary.totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {}
          <div className="bg-[#FDF9F9] dark:bg-[#161212] rounded-xl p-4 border border-landing-primary/10">
            <h4 className="text-sm font-bold text-landing-text dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-landing-primary">trending_up</span>
              Return Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-landing-muted mb-1">Total Return</p>
                <p className="text-xl font-bold text-landing-primary">{parseFloat(summary.totalReturn).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-landing-muted mb-1">Invested Amount</p>
                <p className="text-lg font-bold text-landing-text dark:text-white">₹{parseFloat(summary.cashInvested).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'positions' && (
        <div className="z-10">
          {summary.positions && summary.positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#FDF9F9] dark:bg-[#161212] text-xs uppercase font-bold text-landing-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Avg Price</th>
                    <th className="px-4 py-3">Current Price</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">P&L</th>
                    <th className="px-4 py-3">Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-primary/5">
                  {summary.positions.map((pos, i) => {
                    const pnl = parseFloat(pos.pnl);
                    const isPositive = pnl >= 0;
                    return (
                      <tr key={i} className="hover:bg-landing-primary/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-landing-text dark:text-white">{pos.symbol}</td>
                        <td className="px-4 py-3 font-mono">{pos.quantity}</td>
                        <td className="px-4 py-3 font-mono">₹{parseFloat(pos.avgPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono">₹{parseFloat(pos.currentPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono font-bold">₹{parseFloat(pos.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isPositive ? '+' : ''}{parseFloat(pos.pnlPercent).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-landing-muted/20 rounded-2xl">
              <p className="text-sm text-landing-muted">No open positions</p>
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'metrics' && (
        <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {}
          <div className="bg-[#FDF9F9] dark:bg-[#161212] rounded-xl p-4 border border-landing-primary/10">
            <h4 className="text-sm font-bold text-landing-text dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">bar_chart</span>
              Trade Statistics
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Total Trades</span>
                <span className="font-bold text-landing-text dark:text-white">{summary.totalTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Closed Trades</span>
                <span className="font-bold text-landing-text dark:text-white">{summary.closedTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Open Trades</span>
                <span className="font-bold text-landing-text dark:text-white">{summary.openTrades}</span>
              </div>
              <div className="border-t border-landing-primary/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-landing-muted">Winning Trades</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{summary.winningTrades}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-landing-muted">Losing Trades</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{summary.losingTrades}</span>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-[#FDF9F9] dark:bg-[#161212] rounded-xl p-4 border border-landing-primary/10">
            <h4 className="text-sm font-bold text-landing-text dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">trending_up</span>
              Performance Metrics
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Win Rate</span>
                <span className="font-bold text-landing-primary">{parseFloat(summary.winRate).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Profit Factor</span>
                <span className="font-bold text-landing-text dark:text-white">{parseFloat(summary.profitFactor).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Avg Win</span>
                <span className="font-bold text-green-600 dark:text-green-400">₹{parseFloat(summary.avgWin).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-landing-muted">Avg Loss</span>
                <span className="font-bold text-red-600 dark:text-red-400">₹{parseFloat(summary.avgLoss).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-landing-primary/10 pt-2 mt-2">
                <span className="text-xs text-landing-muted">Avg Trade ROI</span>
                <span className={`font-bold ${parseFloat(summary.tradeReturnPercent) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {parseFloat(summary.tradeReturnPercent) >= 0 ? '+' : ''}{parseFloat(summary.tradeReturnPercent).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'trades' && (
        <TradeHistory />
      )}
    </div>
  );
};


const TradeHistory = () => {
  const toast = useToast();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('CLOSED');

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get(`/trading/trades?status=${filter}&limit=20`);
        if (response.data?.success) {
          setTrades(response.data.trades);
        } else {
          throw new Error(response.data?.message || 'Failed to fetch trades');
        }
      } catch (error) {
        console.error('Trade history fetch error:', error);
        toast.error('Failed to fetch trade history');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [filter, toast]);

  return (
    <div className="z-10">
      {}
      <div className="flex gap-2 mb-4">
        {['CLOSED', 'OPEN'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === f
                ? 'bg-landing-primary text-white'
                : 'bg-[#FDF9F9] dark:bg-[#161212] text-landing-text dark:text-white hover:bg-landing-primary/10'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin text-landing-primary mb-2">⟳</div>
          <p className="text-sm text-landing-muted">Loading trades...</p>
        </div>
      ) : trades.length > 0 ? (
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FDF9F9] dark:bg-[#161212] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-bold text-landing-muted">Trade ID</th>
                <th className="px-3 py-2 font-bold text-landing-muted">Symbol</th>
                <th className="px-3 py-2 font-bold text-landing-muted">Entry</th>
                <th className="px-3 py-2 font-bold text-landing-muted">Exit</th>
                <th className="px-3 py-2 font-bold text-landing-muted">P&L</th>
                <th className="px-3 py-2 font-bold text-landing-muted">Return %</th>
                <th className="px-3 py-2 font-bold text-landing-muted">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-primary/5">
              {trades.map((trade, i) => (
                <tr key={i} className="hover:bg-landing-primary/5 transition-colors">
                  <td className="px-3 py-2 font-mono text-landing-muted">{trade.tradeId?.slice(-6) || 'N/A'}</td>
                  <td className="px-3 py-2 font-bold text-landing-text dark:text-white">{trade.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={`font-bold ${trade.entrySide === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {trade.entrySide} @ ₹{parseFloat(trade.entryPrice).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {trade.exitPrice ? (
                      <span className={`font-bold ${trade.exitSide === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {trade.exitSide} @ ₹{parseFloat(trade.exitPrice).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-landing-muted">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 font-bold ${parseFloat(trade.netPnL) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {parseFloat(trade.netPnL) >= 0 ? '+' : ''}₹{parseFloat(trade.netPnL).toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 font-bold ${parseFloat(trade.pnlPercent) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {parseFloat(trade.pnlPercent) >= 0 ? '+' : ''}{parseFloat(trade.pnlPercent).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-landing-muted text-[10px]">
                    {trade.holdingDays > 0 && `${trade.holdingDays}d `}
                    {trade.holdingHours > 0 && `${trade.holdingHours}h `}
                    {trade.holdingMinutes}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-landing-muted/20 rounded-2xl">
          <p className="text-sm text-landing-muted">No {filter.toLowerCase()} trades</p>
        </div>
      )}
    </div>
  );
};
