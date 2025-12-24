import React from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Cell } from 'recharts';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addTick } from '../redux/chartSlice.js';
import { addSignal } from '../redux/signalsSlice.js';
import { useToast } from '../contexts/useToast.js';
import { createOrderStart, createOrderSuccess, createOrderFailure } from '../redux/ordersSlice.js';
import {
  updatePortfolioStart,
  updatePortfolioSuccess,
  updatePortfolioFailure,
} from '../redux/portfolioSlice.js';

// Socket is initialized within AISignals component to avoid global reconnect loops.

const actionMap = {
  0: { label: "HOLD", class: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  1: { label: "BUY", class: "text-green-500 bg-green-500/10 border-green-500/20" },
  2: { label: "SELL", class: "text-red-500 bg-red-500/10 border-red-500/20" },
};

// --- POSITIONS & ORDERS WIDGET ---
export const PositionsTable = ({ positions, orders }) => {
  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-6 shadow-xl border border-landing-primary/10 backdrop-blur-sm relative overflow-hidden">
      
      {/* Table Header */}
      <div className="flex items-center gap-2 mb-6">
         <span className="material-symbols-outlined text-landing-primary">toc</span>
         <h3 className="text-lg font-display font-bold text-landing-text dark:text-white">Open Positions</h3>
      </div>

      <div className="overflow-x-auto">
        {positions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-landing-muted/20 rounded-2xl">
            <p className="text-sm text-landing-muted">No open positions currently active</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#FDF9F9] dark:bg-[#161212] text-xs uppercase font-bold text-landing-muted">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Symbol</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Avg Price</th>
                <th className="px-4 py-3 rounded-r-xl">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-primary/5">
              {positions.map((p, i) => (
                <tr key={i} className="hover:bg-landing-primary/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-landing-text dark:text-white">{p.symbol}</td>
                  <td className="px-4 py-3 font-mono">{p.qty}</td>
                  <td className="px-4 py-3 font-mono">₹{p.avgPrice}</td>
                  <td className="px-4 py-3 text-xs text-landing-muted">{new Date(p.updatedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 mb-4">
         <span className="material-symbols-outlined text-landing-primary">history</span>
         <h3 className="text-lg font-display font-bold text-landing-text dark:text-white">Order History</h3>
      </div>

      <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
        {orders.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-landing-muted/20 rounded-2xl">
            <p className="text-sm text-landing-muted">No recent orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#FDF9F9] dark:bg-[#161212] text-xs uppercase font-bold text-landing-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-primary/5">
              {orders.map((o, i) => (
                <tr key={i} className="hover:bg-landing-primary/5 transition-colors">
                  <td className="px-4 py-3 text-xs text-landing-muted font-mono">{new Date(o.createdAt).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 font-semibold text-landing-text dark:text-white">{o.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${o.side === "BUY" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {o.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{o.quantity}</td>
                  <td className="px-4 py-3 font-mono">₹{o.price}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider font-bold opacity-70">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- CHART COMPONENT ---
const CandleChart = ({ candles }) => {
  if (!candles || candles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-landing-muted gap-2">
        <span className="material-symbols-outlined text-4xl opacity-50">query_stats</span>
        <p className="text-sm font-medium">Waiting for market data...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={candles} margin={{ top: 15, right: 10, left: 10, bottom: 0 }}>
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 10, fill: '#8F7A7A' }} 
          minTickGap={40}
          stroke="transparent"
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: 10, fill: '#8F7A7A', fontFamily: 'IBM Plex Mono' }} 
          width={50} 
          domain={['auto', 'auto']}
          orientation="right"
          stroke="transparent"
          tickLine={false}
          tickFormatter={(value) => value.toFixed(0)}
        />
        <Tooltip
          contentStyle={{ 
            background: '#211A1A', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#fff' 
          }}
          labelStyle={{ color: '#8F7A7A', fontSize: '11px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px', fontFamily: 'IBM Plex Mono' }}
          cursor={{ fill: 'rgba(209, 150, 139, 0.1)' }}
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const candle = payload[0].payload;
              return (
                <div className="bg-[#0F0F0F] border-2 border-landing-primary rounded-lg p-3 backdrop-blur-sm shadow-2xl">
                  <p className="text-landing-primary font-bold text-xs mb-3 uppercase tracking-wider border-b border-landing-primary/30 pb-2">{candle.label}</p>
                  <div className="space-y-2 font-mono text-xs">
                    <p><span className="font-bold text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded">O:</span> <span className="text-white font-bold">₹{candle.open?.toFixed(2)}</span></p>
                    <p><span className="font-bold text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded">H:</span> <span className="text-white font-bold">₹{candle.high?.toFixed(2)}</span></p>
                    <p><span className="font-bold text-orange-300 bg-orange-900/30 px-2 py-1 rounded">L:</span> <span className="text-white font-bold">₹{candle.low?.toFixed(2)}</span></p>
                    <p className="border-t border-landing-primary/30 pt-2"><span className="font-bold text-landing-primary bg-landing-primary/20 px-2 py-1 rounded">C:</span> <span className="text-landing-primary font-bold text-sm">₹{candle.close?.toFixed(2)}</span></p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="open" isAnimationActive={false} shape={<CandleShape candles={candles} />} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Custom Candle Shape
const CandleShape = ({ x, y, width, height, payload, candles }) => {
  if (!payload || !candles) return null;
  const { open, high, low, close } = payload;
  if (!open) return null;

  const isGreen = close >= open;
  // Using theme compatible green/red but slightly desaturated for elegance
  const color = isGreen ? '#10B981' : '#EF4444'; 
  
  const allPrices = candles.flatMap(c => [c.open, c.high, c.low, c.close]).filter(Boolean);
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const chartHeight = height || 300;
  const chartTop = y || 0;
  
  const getYPos = (price) => chartTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

  const highY = getYPos(high);
  const lowY = getYPos(low);
  const openY = getYPos(open);
  const closeY = getYPos(close);
  const candleX = x || 0;
  const candleWidth = Math.max(width - 4, 4); // Add spacing between candles

  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

  return (
    <g>
      <line x1={candleX + width / 2} x2={candleX + width / 2} y1={highY} y2={lowY} stroke={color} strokeWidth={1.5} opacity={0.8} />
      <rect x={candleX + 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
};

// --- AI SIGNALS WIDGET ---
export const AISignals = () => {
  const dispatch = useDispatch();
  const candles = useSelector((state) => state.chart.candles);
  const signals = useSelector((state) => state.signals.signals);
  const [marketOpen, setMarketOpen] = React.useState(false);

  useEffect(() => {
    const fetchMarketStatus = async () => {
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get('/market/status');
        if (response.data?.success) {
          setMarketOpen(response.data.marketOpen);
        }
      } catch (error) {
        console.error('Error fetching market status:', error);
      }
    };
    fetchMarketStatus();
    const interval = setInterval(fetchMarketStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:4000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    const onTick = (tick) => {
      const price = Number(tick?.price ?? tick?.ltp ?? tick?.last_price);
      if (!price || Number.isNaN(price)) return;
      dispatch(addTick({ price, ts: Number(tick?.ts ?? Date.now()) }));
    };

    const onDecision = (data) => dispatch(addSignal(data));

    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    socket.on('connect_error', (error) => console.error('[Socket] Error:', error));

    socket.on('tick', onTick);
    socket.on('decision', onDecision);

    return () => {
      socket.off('tick', onTick);
      socket.off('decision', onDecision);
      socket.disconnect();
    };
  }, [dispatch]);

  // Decision listener handled inside unified socket useEffect above

  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 flex flex-col h-[600px] relative overflow-hidden">
      {/* Soft Glow Background */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-landing-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Header */}
        <div className="flex items-center justify-between mb-6 z-10">
          <div>
            <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white mb-1">Live Market & AI Signals</h3>
            <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${marketOpen ? 'bg-landing-primary' : 'bg-red-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${marketOpen ? 'bg-landing-primary' : 'bg-red-500'}`}></span>
          </span>
          <span className="text-xs font-bold text-landing-muted tracking-widest uppercase">NIFTY 50 {marketOpen ? 'Live' : 'Market Closed'}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-landing-muted uppercase tracking-widest mb-1">Current Price</p>
            <p className="text-3xl font-display font-bold text-landing-text dark:text-white font-mono">
          {candles[candles.length - 1]?.close?.toFixed(2) ?? '—'}
            </p>
          </div>
        </div>

        {/* Charts Area */}
      <div className="flex-1 w-full relative rounded-2xl overflow-hidden bg-[#FDF9F9] dark:bg-[#161212] border border-landing-primary/5 mb-6 shadow-inner">
        <div style={{ height: '70%', width: '100%' }} className="pt-4">
          <CandleChart candles={candles} />
        </div>
        
        {/* Volume Chart */}
        <div style={{ height: '30%', width: '100%', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
               <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                {candles.map((entry, index) => {
                  const isGreen = entry.close >= entry.open;
                  return <Cell key={`cell-${index}`} fill={isGreen ? '#10B981' : '#EF4444'} opacity={0.3} />;
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

// --- AI DECISION FEED COMPONENT ---
export const AIDecisionFeed = () => {
  const signals = useSelector((state) => state.signals.signals);

  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 flex flex-col relative overflow-hidden">
      {/* Soft Glow Background */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-landing-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white mb-1">AI Trading Decisions</h3>
          <p className="text-xs text-landing-muted font-medium">Real-time ML optimization signals</p>
        </div>
        <div className="bg-landing-primary/10 px-4 py-2 rounded-full">
          <span className="text-sm font-bold text-landing-primary">{signals.length} Signals</span>
        </div>
      </div>

      {/* Signals Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-landing-muted/30 mb-3">psychology</span>
            <p className="text-sm text-landing-muted font-medium">Waiting for AI optimization signals...</p>
            <p className="text-xs text-landing-muted/60 mt-2">Live signals will appear here when the market generates trading opportunities</p>
          </div>
        ) : (
          signals.map((s, i) => {
            const action = actionMap[s.action] || { label: "UNK", class: "text-gray-400" };
            return (
              <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-landing-primary/5 to-transparent rounded-2xl border border-landing-primary/10 hover:border-landing-primary/30 hover:shadow-lg hover:shadow-landing-primary/10 transition-all duration-300">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-landing-primary">{new Date(s.createdAt).toLocaleTimeString()}</span>
                    <span className="text-sm font-bold text-landing-text dark:text-white">{s.symbol || 'NIFTY 50'}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-4 py-2 rounded-full border ${action.class}`}>
                  {action.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- QUICK TRADE WIDGET ---
export const QuickTradeForm = ({ onSubmit, marketOpen }) => {
  const { register, handleSubmit, setValue } = useForm();
  const dispatch = useDispatch();
  const toast = useToast();

  const [side, setSide] = React.useState('BUY');
  const [computedPrice, setComputedPrice] = React.useState(null);
  const [priceSource, setPriceSource] = React.useState('awaiting');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch LTP from smartapi_streamer every 1 second when market is open
  useEffect(() => {
    let priceInterval = null;
    let mounted = true;

    const fetchLivePrice = async () => {
      if (!marketOpen || !mounted) return;
      
      try {
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get('/market/live-price?symbol=NIFTY', {
          timeout: 3000,
        });
        
        console.log('[QuickTradeForm] Live price response:', response.data);
        
        if (mounted && response.data?.success && (typeof response.data?.ltp === 'number' || typeof response.data?.price === 'number')) {
          const ltp = Number(response.data.ltp || response.data.price);
          console.log('[QuickTradeForm] Setting price to:', ltp);
          setComputedPrice(ltp);
          setPriceSource(`Live LTP H:${response.data.high?.toFixed(2)} L:${response.data.low?.toFixed(2)}`);
          setIsLoading(false);
        } else {
          throw new Error(`Invalid price data: ltp=${response.data?.ltp}, price=${response.data?.price}`);
        }
      } catch (error) {
        if (mounted) {
          console.warn('[QuickTradeForm] Failed to fetch LTP:', error.message);
          console.warn('[QuickTradeForm] Error response:', error.response?.data);
          if (!computedPrice) {
            setPriceSource('Awaiting live price data...');
          }
        }
      }
    };
    
    // Fetch immediately when market opens
    if (marketOpen) {
      console.log('[QuickTradeForm] Market is open, starting price polling...');
      fetchLivePrice();
      // Poll every 1 second to get real-time LTP
      priceInterval = setInterval(() => {
        if (mounted) fetchLivePrice();
      }, 1000);
    } else {
      console.log('[QuickTradeForm] Market is closed, clearing prices...');
      setComputedPrice(null);
      setPriceSource('awaiting');
    }
    
    return () => {
      mounted = false;
      if (priceInterval) {
        clearInterval(priceInterval);
      }
    };
  }, [marketOpen]);

  // Fetch closing price from backend when market is closed
  useEffect(() => {
    if (marketOpen) {
      setComputedPrice(null);
      return;
    }
    
    const fetchClosingPrice = async () => {
      try {
        setIsLoading(true);
        const { default: axiosInstance } = await import('../api/axiosInstance.js');
        const response = await axiosInstance.get('/market/closing-price?symbol=NIFTY', {
          timeout: 5000,
        });
        
        if (response.data?.success && response.data?.closingPrice) {
          setComputedPrice(Number(response.data.closingPrice));
          setPriceSource('Market Closed (Last Close)');
        }
        setIsLoading(false);
      } catch (error) {
        console.warn('Failed to fetch closing price:', error.message);
        setPriceSource('Price unavailable');
        setIsLoading(false);
      }
    };
    
    fetchClosingPrice();
  }, [marketOpen]);

  // Set immutable fields
  useEffect(() => {
    setValue('symbol', 'NIFTY');
    if (computedPrice) {
      setValue('price', computedPrice);
    }
    setValue('side', side);
  }, [setValue, computedPrice, side]);

  const handleSideToggle = (newSide) => {
    setSide(newSide);
    setValue('side', newSide);
  };

  const submitForm = async (form) => {
    // Validation
    if (!form.quantity || form.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!computedPrice) {
      toast.error('Price not available. Please try again.');
      return;
    }

    setIsSubmitting(true);
    dispatch(createOrderStart());

    try {
      const { default: axiosInstance } = await import('../api/axiosInstance.js');
      const payload = {
        symbol: 'NIFTY',
        quantity: Number(form.quantity),
        price: computedPrice,
        side,
      };

      console.log('[QuickTradeForm] Submitting order:', payload);

      const response = await axiosInstance.post('/trading/orders', payload);

      if (response.data?.success) {
        const orderData = response.data.order;
        dispatch(createOrderSuccess(orderData));

        // Refresh portfolio data immediately
        try {
          const portfolioResponse = await axiosInstance.get('/trading/portfolio/summary');
          if (portfolioResponse.data?.success) {
            dispatch(updatePortfolioSuccess(portfolioResponse.data.summary || portfolioResponse.data));
          }
        } catch (err) {
          console.warn('[QuickTradeForm] Failed to refresh portfolio:', err);
        }

        // Show success toast with order details
        toast.success(
          `${side} Order Placed Successfully!`,
          3000,
          {
            orderId: orderData.orderId,
            symbol: orderData.symbol,
            quantity: orderData.quantity,
            price: `₹${orderData.price}`,
            brokerage: `₹${orderData.brokerage}`,
          }
        );

        // Reset form
        setValue('quantity', 1);
        
        // Call parent onSubmit if provided
        if (onSubmit) {
          onSubmit(response.data);
        }

      } else {
        throw new Error(response.data?.message || 'Order placement failed');
      }
    } catch (error) {
      console.error('[QuickTradeForm] Order submission error:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Order placement failed';
      const errorData = error.response?.data?.data;

      dispatch(createOrderFailure(errorMessage));

      // Show error toast with details
      toast.error(
        errorMessage,
        5000,
        errorData || { error: error.message }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-landing-primary/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="font-display font-bold text-xl text-landing-text dark:text-white">Quick Trade</h3>
        <div className="flex bg-[#FDF9F9] dark:bg-[#161212] p-1 rounded-xl border border-landing-primary/10">
          <button type="button" onClick={() => handleSideToggle('BUY')} className={`px-4 py-1.5 text-xs rounded-lg uppercase tracking-wide focus:outline-none focus:ring-0 ${side === 'BUY' ? 'font-bold bg-white dark:bg-[#211A1A] shadow-sm text-landing-text dark:text-white border border-landing-primary/10 dark:border-white/10' : 'font-medium text-landing-muted hover:text-landing-text transition-colors'}`}>Buy</button>
          <button type="button" onClick={() => handleSideToggle('SELL')} className={`px-4 py-1.5 text-xs rounded-lg uppercase tracking-wide focus:outline-none focus:ring-0 ${side === 'SELL' ? 'font-bold bg-white dark:bg-[#211A1A] shadow-sm text-landing-text dark:text-white border border-landing-primary/10 dark:border-white/10' : 'font-medium text-landing-muted hover:text-landing-text transition-colors'}`}>Sell</button>
        </div>
      </div>

      <form className="flex flex-col gap-6 relative z-10" onSubmit={handleSubmit(submitForm)}>
        <div>
          <label className="text-xs font-bold text-landing-muted uppercase mb-2 block tracking-widest ml-1">Symbol</label>
          <div className="relative">
            <input 
              {...register('symbol')} 
              className="w-full bg-[#FDF9F9] dark:bg-[#161212] border-2 border-landing-primary/20 rounded-xl text-sm font-semibold py-3.5 px-4 focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all text-landing-text dark:text-white" 
              readOnly 
              type="text" 
              value="NIFTY" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-landing-primary/10 px-2 py-1 rounded text-landing-primary border border-landing-primary/10">SPOT</span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-landing-muted uppercase mb-2 block tracking-widest ml-1">Quantity</label>
            <input 
              {...register('quantity')} 
              className="w-full bg-[#FDF9F9] dark:bg-[#161212] border-2 border-landing-primary/20 rounded-xl text-sm font-semibold py-3.5 px-4 focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all text-landing-text dark:text-white" 
              type="number" 
              defaultValue={1}
              min={1}
              step={1}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-landing-muted uppercase mb-2 block tracking-widest ml-1">Price</label>
            <input 
              {...register('price')} 
              className="w-full bg-[#FDF9F9] dark:bg-[#161212] border-2 border-landing-primary/20 rounded-xl text-sm font-semibold py-3.5 px-4 focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all text-landing-text dark:text-white" 
              type="number" 
              readOnly 
              value={computedPrice ?? ''}
            />
            <div className="mt-2 text-[10px] font-bold flex items-center justify-between">
              <span className={isLoading ? 'text-yellow-600' : computedPrice ? 'text-green-600' : 'text-landing-muted'}>
                {priceSource}
              </span>
              {isLoading && <span className="text-[8px] animate-pulse">updating...</span>}
            </div>
          </div>
        </div>

        {/* Hidden side field for form completeness */}
        <input type="hidden" {...register('side')} value={side} />

        <div className="pt-2">
          <button 
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 group tracking-wide text-sm ${
              !computedPrice || isLoading || isSubmitting
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-landing-primary to-landing-primary-dark hover:from-landing-primary-dark hover:to-landing-primary text-white shadow-landing-primary/30'
            } focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-landing-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#211A1A]`}
            disabled={!computedPrice || isLoading || isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⟳</span>
                Processing...
              </>
            ) : (
              <>
                <span>{side === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'} {computedPrice ? `@ ₹${computedPrice.toFixed(2)}` : ''}</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};