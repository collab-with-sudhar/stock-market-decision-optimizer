import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DashboardLayout from '../components/DashboardLayout';
import {
  updatePortfolioStart,
  updatePortfolioSuccess,
  updatePortfolioFailure,
} from '../redux/portfolioSlice';
import axiosInstance from '../api/axiosInstance';

const Portfolio = () => {
  const dispatch = useDispatch();
  const { summary, positions, loading, error } = useSelector((state) => state.portfolio);
  const [activeTab, setActiveTab] = useState('overview');
  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradeFilter, setTradeFilter] = useState('ALL');

  
  useEffect(() => {
    const fetchPortfolio = async () => {
      dispatch(updatePortfolioStart());
      try {
        const response = await axiosInstance.get('/trading/portfolio/summary');
        console.log('[Portfolio] API Response:', response.data);
        if (response.data?.success) {
          
          dispatch(updatePortfolioSuccess(response.data.summary || response.data));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch portfolio');
        }
      } catch (error) {
        console.error('[Portfolio] Fetch error:', error);
        dispatch(updatePortfolioFailure(error.message));
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  
  useEffect(() => {
    const fetchTrades = async () => {
      setTradesLoading(true);
      try {
        const response = await axiosInstance.get('/trading/trades');
        if (response.data?.success) {
          setTrades(response.data.trades || []);
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      } finally {
        setTradesLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const filteredTrades = trades.filter((trade) => {
    if (tradeFilter === 'ALL') return true;
    return trade.status === tradeFilter;
  });

  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const openTrades = trades.filter((t) => t.status === 'OPEN');

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {}
        <div className="flex items-center justify-between">
          <div>
                <h1 className="text-3xl font-display font-bold text-landing-text dark:text-white mb-2">
                  Portfolio Overview
                </h1>
                <p className="text-sm text-landing-muted">
                  Monitor your portfolio performance and holdings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-landing-muted">
                  Updated {summary?.lastUpdated ? new Date(summary.lastUpdated).toLocaleTimeString() : 'now'}
                </span>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#211A1A] rounded-2xl shadow-lg border border-landing-primary/10 p-2">
              <div className="flex gap-2 overflow-x-auto">
                {['overview', 'positions', 'metrics', 'trades'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-landing-primary to-landing-primary-dark text-white shadow-md'
                        : 'bg-white dark:bg-[#211A1A] text-landing-text hover:bg-landing-primary hover:text-white border border-landing-primary/10'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {}
            {loading && (
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-12 text-center shadow-lg border border-landing-primary/10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-landing-primary border-r-transparent"></div>
                <p className="text-sm text-landing-muted mt-4">Loading portfolio data...</p>
              </div>
            )}

            {}
            {error && (
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-12 text-center shadow-lg border border-red-500/20">
                <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {}
            {!loading && !error && activeTab === 'overview' && (
              <div className="space-y-6">
                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-landing-primary/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="material-symbols-outlined text-blue-500 text-2xl">account_balance_wallet</span>
                      <span className="text-xs text-landing-muted uppercase tracking-wider">Initial</span>
                    </div>
                    <p className="text-3xl font-bold text-landing-text dark:text-white font-mono">
                      ₹{summary?.initialBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-landing-muted mt-1">Starting Balance</p>
                  </div>

                  <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-green-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="material-symbols-outlined text-green-500 text-2xl">payments</span>
                      <span className="text-xs text-landing-muted uppercase tracking-wider">Cash</span>
                    </div>
                    <p className="text-3xl font-bold text-green-500 font-mono">
                      ₹{summary?.currentBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-landing-muted mt-1">Available</p>
                  </div>

                  <div className="bg-gradient-to-br from-landing-primary to-landing-primary-dark rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="material-symbols-outlined text-white text-2xl">account_balance</span>
                      <span className="text-xs text-white/70 uppercase tracking-wider">Total</span>
                    </div>
                    <p className="text-3xl font-bold text-white font-mono">
                      ₹{summary?.totalBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-white/70 mt-1">Portfolio Value</p>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className={`rounded-2xl p-6 shadow-lg border ${
                    (summary?.unrealizedPnL || 0) >= 0
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500/20'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`material-symbols-outlined text-2xl ${
                        (summary?.unrealizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>trending_up</span>
                      <span className="text-xs text-landing-muted uppercase tracking-wider">Unrealized</span>
                    </div>
                    <p className={`text-3xl font-bold font-mono ${
                      (summary?.unrealizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ₹{summary?.unrealizedPnL?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-landing-muted mt-1">Open Positions</p>
                  </div>

                  <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-landing-primary/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="material-symbols-outlined text-landing-primary text-2xl">receipt</span>
                      <span className="text-xs text-landing-muted uppercase tracking-wider">Realized</span>
                    </div>
                    <p className={`text-3xl font-bold font-mono ${
                      (summary?.realizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ₹{summary?.realizedPnL?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-landing-muted mt-1">Closed Trades</p>
                  </div>

                  <div className={`rounded-2xl p-6 shadow-lg ${
                    (summary?.totalPnL || 0) >= 0
                      ? 'bg-gradient-to-br from-green-500 to-green-600'
                      : 'bg-gradient-to-br from-red-500 to-red-600'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="material-symbols-outlined text-white text-2xl">analytics</span>
                      <span className="text-xs text-white/70 uppercase tracking-wider">Total P&L</span>
                    </div>
                    <p className="text-3xl font-bold text-white font-mono">
                      ₹{summary?.totalPnL?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      {((summary?.totalReturn || 0) * 100).toFixed(2)}% Return
                    </p>
                  </div>
                </div>

                {}
                <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-landing-primary/10">
                  <h3 className="text-lg font-bold text-landing-text dark:text-white mb-4">Return Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Total Return</p>
                      <p className={`text-2xl font-bold font-mono ${
                        (summary?.totalReturn || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {((summary?.totalReturn || 0) * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Cash Invested</p>
                      <p className="text-2xl font-bold text-landing-text dark:text-white font-mono">
                        ₹{((summary?.initialBalance || 0) - (summary?.currentBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {}
            {!loading && !error && activeTab === 'positions' && (
              <div className="bg-white dark:bg-[#211A1A] rounded-2xl shadow-lg border border-landing-primary/10 overflow-hidden">
                <div className="p-5 border-b border-landing-primary/10">
                  <h2 className="text-lg font-bold text-landing-text dark:text-white">Current Positions</h2>
                  <p className="text-xs text-landing-muted mt-1">{positions.length} active positions</p>
                </div>

                {positions.length === 0 ? (
                  <div className="p-12 text-center">
                    <span className="material-symbols-outlined text-landing-muted text-4xl mb-2">inbox</span>
                    <p className="text-sm text-landing-muted">No open positions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-landing-primary/5">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Symbol</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Qty</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Avg Price</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Current</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Value</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">P&L</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-landing-primary/10">
                        {positions.map((pos) => (
                          <tr key={pos.symbol} className="hover:bg-landing-primary/5 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-landing-text dark:text-white">{pos.symbol}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-semibold text-landing-text dark:text-white">{pos.quantity}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-mono text-landing-text dark:text-white">₹{Number(pos.avgPrice || 0).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-mono text-landing-text dark:text-white">₹{Number(pos.currentPrice || 0).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-mono font-semibold text-landing-text dark:text-white">
                                ₹{Number(pos.marketValue || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-sm font-mono font-bold ${
                                Number(pos.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                ₹{Number(pos.pnl || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-sm font-mono font-bold ${
                                Number(pos.returnPct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {Number(pos.returnPct || 0).toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {}
            {!loading && !error && activeTab === 'metrics' && (
              <div className="space-y-6">
                {}
                <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-landing-primary/10">
                  <h3 className="text-lg font-bold text-landing-text dark:text-white mb-4">Trade Statistics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Total Trades</p>
                      <p className="text-2xl font-bold text-landing-text dark:text-white">{summary?.totalTrades || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Closed</p>
                      <p className="text-2xl font-bold text-blue-500">{summary?.closedTrades || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Open</p>
                      <p className="text-2xl font-bold text-orange-500">{summary?.openTrades || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Winning</p>
                      <p className="text-2xl font-bold text-green-500">{summary?.winningTrades || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Losing</p>
                      <p className="text-2xl font-bold text-red-500">{summary?.losingTrades || 0}</p>
                    </div>
                  </div>
                </div>

                {}
                <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-6 shadow-lg border border-landing-primary/10">
                  <h3 className="text-lg font-bold text-landing-text dark:text-white mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Win Rate</p>
                      <p className={`text-2xl font-bold ${
                        Number(summary?.winRate || 0) >= 50 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {Number(summary?.winRate || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Profit Factor</p>
                      <p className={`text-2xl font-bold ${
                        Number(summary?.profitFactor || 0) >= 1 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {Number(summary?.profitFactor || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Avg Win</p>
                      <p className="text-2xl font-bold text-green-500 font-mono">
                        ₹{Number(summary?.avgWin || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-landing-muted uppercase tracking-wider mb-1">Avg Loss</p>
                      <p className="text-2xl font-bold text-red-500 font-mono">
                        ₹{Math.abs(Number(summary?.avgLoss || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {}
            {!loading && !error && activeTab === 'trades' && (
              <div className="space-y-4">
                {}
                <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-landing-primary/10">
                  <div className="flex gap-2 flex-wrap">
                    {['ALL', 'CLOSED', 'OPEN'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTradeFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          tradeFilter === filter
                            ? 'bg-landing-primary text-white shadow-md'
                            : 'bg-white dark:bg-[#211A1A] text-landing-text hover:bg-landing-primary hover:text-white border border-landing-primary/10'
                        }`}
                      >
                        {filter} ({filter === 'ALL' ? trades.length : filter === 'CLOSED' ? closedTrades.length : openTrades.length})
                      </button>
                    ))}
                  </div>
                </div>

                {}
                <div className="bg-white dark:bg-[#211A1A] rounded-2xl shadow-lg border border-landing-primary/10 overflow-hidden">
                  <div className="p-5 border-b border-landing-primary/10">
                    <h2 className="text-lg font-bold text-landing-text dark:text-white">Trade History</h2>
                    <p className="text-xs text-landing-muted mt-1">
                      Showing {filteredTrades.length} of {trades.length} trades
                    </p>
                  </div>

                  {tradesLoading ? (
                    <div className="p-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-landing-primary border-r-transparent"></div>
                      <p className="text-sm text-landing-muted mt-4">Loading trades...</p>
                    </div>
                  ) : filteredTrades.length === 0 ? (
                    <div className="p-12 text-center">
                      <span className="material-symbols-outlined text-landing-muted text-4xl mb-2">inbox</span>
                      <p className="text-sm text-landing-muted">No trades found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-landing-primary/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Trade ID</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Symbol</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Entry</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Exit</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">P&L</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Return</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-landing-primary/10">
                          {filteredTrades.map((trade) => (
                            <tr key={trade._id} className="hover:bg-landing-primary/5 transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono text-landing-muted">{trade.tradeId?.slice(0, 8)}...</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-landing-text dark:text-white">{trade.symbol}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-mono text-landing-text dark:text-white">₹{Number(trade.entryPrice || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-mono text-landing-text dark:text-white">
                                  {trade.exitPrice ? `₹${Number(trade.exitPrice).toFixed(2)}` : '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-semibold text-landing-text dark:text-white">{trade.quantity}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm font-mono font-bold ${
                                  Number(trade.netPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  ₹{Number(trade.netPnL || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm font-mono font-bold ${
                                  Number(trade.returnPct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {Number(trade.returnPct || 0).toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  trade.status === 'CLOSED'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {trade.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-landing-muted">
                                  {trade.holdingDuration || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
    </DashboardLayout>
  );
};

export default Portfolio;
