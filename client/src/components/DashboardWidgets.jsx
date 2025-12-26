import React from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid } from 'recharts';
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



const actionMap = {
  0: { label: "HOLD", class: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  1: { label: "BUY", class: "text-green-500 bg-green-500/10 border-green-500/20" },
  2: { label: "SELL", class: "text-red-500 bg-red-500/10 border-red-500/20" },
};


export const PositionsTable = ({ positions, orders }) => {
  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-6 shadow-xl border border-landing-primary/10 backdrop-blur-sm relative overflow-hidden">

      {}
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


const CandleChart = ({ candles }) => {
  const containerRef = React.useRef(null);
  const [chartDimensions, setChartDimensions] = React.useState({ width: 800, height: 400 });
  const [hoveredCandle, setHoveredCandle] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  
  const recentCandles = candles?.slice(-25) || [];
  const validCandles = recentCandles.filter(c => c.close > 0 && c.high > 0);

  const allLow = validCandles.map(c => c.low).filter(v => v > 0);
  const allHigh = validCandles.map(c => c.high).filter(v => v > 0);

  const minPrice = allLow.length ? Math.min(...allLow) : 0;
  const maxPrice = allHigh.length ? Math.max(...allHigh) : 0;

  const buffer = (maxPrice - minPrice) * 0.3 || 5;
  const yDomain = [Math.max(0, minPrice - buffer), maxPrice + buffer];

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setChartDimensions({ width, height });
        }
      }
    };

    updateDimensions();
    
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!candles || candles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-landing-muted gap-2">
        <span className="material-symbols-outlined text-4xl opacity-50">query_stats</span>
        <p className="text-sm font-medium">Waiting for market data...</p>
      </div>
    );
  }

  const margin = { top: 10, right: 50, left: 60, bottom: 30 };
  const chartWidth = Math.max(chartDimensions.width - margin.left - margin.right, 1);
  const chartHeight = Math.max(chartDimensions.height - margin.top - margin.bottom, 1);

  
  const extraSlots = 1; 
  const candleSlotWidth = chartWidth / Math.max(recentCandles.length + extraSlots, 1);
  const xScale = (index) => margin.left + index * candleSlotWidth;
  const yScale = (price) => {
    if (yDomain[1] === yDomain[0]) return margin.top + chartHeight / 2;
    return margin.top + chartHeight - ((price - yDomain[0]) / (yDomain[1] - yDomain[0])) * chartHeight;
  };

  const handleCandleHover = (index, event) => {
    const candle = recentCandles[index];
    if (candle) {
      setHoveredCandle({ index, candle });
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10
        });
      }
    }
  };

  const handleMouseMove = (event) => {
    if (hoveredCandle) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10
        });
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative bg-transparent" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredCandle(null)}
    >
      <svg width="100%" height="100%" className="absolute inset-0" viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`} preserveAspectRatio="xMidYMid meet">
        {}
        <rect width="100%" height="100%" fill="transparent" />

        {}
        <defs>
          <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const price = yDomain[0] + t * (yDomain[1] - yDomain[0]);
            const y = yScale(price);
            return (
              <g key={`y-label-${i}`}>
                <line x1={margin.left} y1={y} x2={chartDimensions.width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={chartDimensions.width - 8} y={y + 4} fontSize="9" fill="#6B7280" textAnchor="end" fontFamily="monospace">
                  {price.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>

        {}
        {recentCandles.map((candle, index) => {
          if (!candle || typeof candle.open !== 'number' || typeof candle.close !== 'number' ||
              typeof candle.high !== 'number' || typeof candle.low !== 'number') {
            return null;
          }

          const { open, high, low, close } = candle;
          const isGreen = close >= open;
          const color = isGreen ? '#10B981' : '#EF4444';
          const isHovered = hoveredCandle?.index === index;

          
          const candleWidth = candleSlotWidth;
          const xPos = xScale(index) + candleWidth / 2;
          const highY = yScale(high);
          const lowY = yScale(low);
          const openY = yScale(open);
          const closeY = yScale(close);

          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          const bodyWidth = Math.max(candleWidth * 0.6, 3);
          const bodyX = xPos - bodyWidth / 2;

          return (
            <g 
              key={`candle-${index}`} 
              opacity={isHovered ? 1 : "0.95"}
              onMouseEnter={(e) => handleCandleHover(index, e)}
              style={{ cursor: 'pointer' }}
            >
              {}
              <line x1={xPos} y1={highY} x2={xPos} y2={bodyTop} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
              {}
              <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} stroke={color} strokeWidth={isHovered ? "2" : "0.5"} />
              {}
              <line x1={xPos} y1={bodyBottom} x2={xPos} y2={lowY} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          );
        })}

        {}
        <g>
          {recentCandles.map((candle, index) => {
            const skip = Math.ceil(recentCandles.length / 4);
            if (index % skip !== 0) return null;
            const candleWidth = candleSlotWidth;
            const xPos = xScale(index) + candleWidth / 2;
            return (
              <g key={`x-label-${index}`}>
                <text x={xPos} y={chartDimensions.height - 8} fontSize="9" fill="#6B7280" textAnchor="middle" fontFamily="monospace">
                  {candle.label || index}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {}
      {hoveredCandle && (
        <div 
          className="absolute bg-[#0F0F0F] border border-gray-800 rounded-lg p-3 shadow-2xl pointer-events-none z-50"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            minWidth: '140px'
          }}
        >
          <p className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-wider">
            {hoveredCandle.candle.label}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
            <span className="text-gray-500">O:</span> 
            <span className="text-white text-right">{hoveredCandle.candle.open?.toFixed(2)}</span>
            <span className="text-gray-500">H:</span> 
            <span className="text-white text-right">{hoveredCandle.candle.high?.toFixed(2)}</span>
            <span className="text-gray-500">L:</span> 
            <span className="text-white text-right">{hoveredCandle.candle.low?.toFixed(2)}</span>
            <span className="text-gray-500">C:</span> 
            <span className={`text-right font-bold ${hoveredCandle.candle.close >= hoveredCandle.candle.open ? 'text-[#089981]' : 'text-[#F23645]'}`}>
              {hoveredCandle.candle.close?.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


export const AISignals = () => {
  const candles = useSelector((state) => state.chart.candles);
  const socketConnected = useSelector((state) => state.websocket?.socketConnected || false);
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

  
  const validCandles = candles?.filter(c => c.close > 0 && c.high > 0) || [];
  const allLow = validCandles.map(c => c.low).filter(v => v > 0);
  const allHigh = validCandles.map(c => c.high).filter(v => v > 0);
  const minPrice = allLow.length ? Math.min(...allLow) : 0;
  const maxPrice = allHigh.length ? Math.max(...allHigh) : 0;
  const buffer = (maxPrice - minPrice) * 0.1 || 5;
  const yDomain = [
    Math.max(0, minPrice - buffer),
    maxPrice + buffer
  ];

  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 flex flex-col h-[600px] relative overflow-hidden">
      {}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-landing-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

      {}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white mb-1">Live Market & AI Signals</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${marketOpen ? 'bg-landing-primary' : 'bg-red-500'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${marketOpen ? 'bg-landing-primary' : 'bg-red-500'}`}></span>
              </span>
              <span className="text-xs font-bold text-landing-muted tracking-widest uppercase">NIFTY 50 {marketOpen ? 'Live' : 'Market Closed'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`${socketConnected ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${socketConnected ? 'bg-green-500' : 'bg-gray-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </span>
              <span className="text-xs font-bold text-landing-muted tracking-widest uppercase">{socketConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-landing-muted uppercase tracking-widest mb-1">Current Price</p>
          <p className="text-3xl font-display font-bold text-landing-text dark:text-white font-mono">
            {candles[candles.length - 1]?.close?.toFixed(2) ?? '—'}
          </p>
        </div>
      </div>

      {}
      <div className="flex-1 w-full relative rounded-2xl overflow-visible bg-[#FDF9F9] dark:bg-[#161212] border border-landing-primary/5 mb-6 shadow-inner">
        <div style={{ height: '70%', width: '100%' }} className="pt-4">
          <CandleChart candles={candles} />
        </div>

        {}
        <div style={{ height: '30%', width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                {}
                <linearGradient id="colorPriceProfessional" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D1968B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D1968B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <XAxis dataKey="label" hide />
              <YAxis hide domain={yDomain} /> {}
              <Tooltip
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ overflow: 'visible', zIndex: 1000 }}
                contentStyle={{
                  background: 'rgba(22, 22, 22, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                }}
                cursor={{ stroke: '#D1968B', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const candle = payload[0].payload;
                    const isGreen = candle.close >= candle.open;
                    return (
                      <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg p-3 shadow-2xl min-w-[140px]">
                        <p className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-wider">{candle.label}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
                          <span className="text-gray-500">O:</span> <span className="text-white text-right">{candle.open?.toFixed(2)}</span>
                          <span className="text-gray-500">H:</span> <span className="text-white text-right">{candle.high?.toFixed(2)}</span>
                          <span className="text-gray-500">L:</span> <span className="text-white text-right">{candle.low?.toFixed(2)}</span>
                          <span className="text-gray-500">C:</span> <span className={`text-right font-bold ${isGreen ? 'text-[#089981]' : 'text-[#F23645]'}`}>{candle.close?.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="none" 
                fillOpacity={1} 
                fill="url(#colorPriceProfessional)"
                isAnimationActive={false}
              />
              
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#D1968B" 
                strokeWidth={2}
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: '#A87066', 
                  stroke: '#E5B5AD', 
                  strokeWidth: 2 
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};


export const AIDecisionFeed = ({ compact = false }) => {
  const signals = useSelector((state) => state.signals.signals);

  if (compact) {
    
    return (
      <div className="space-y-2">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-landing-muted/30 mb-2">psychology</span>
            <p className="text-xs text-landing-muted font-medium">Awaiting AI signals...</p>
          </div>
        ) : (
          signals.slice(0, 20).map((s, i) => {
            const action = actionMap[s.action] || { label: "UNK", class: "text-gray-400" };
            return (
              <div key={i} className="flex items-center justify-between p-2 bg-gradient-to-r from-landing-primary/5 to-transparent rounded-lg border border-landing-primary/10 hover:border-landing-primary/20 transition-all">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-mono text-[10px] font-bold text-landing-primary truncate">{new Date(s.createdAt).toLocaleTimeString()}</span>
                  <span className="text-xs font-bold text-landing-text dark:text-white truncate">{s.symbol || 'NIFTY'}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${action.class} whitespace-nowrap ml-2`}>
                  {action.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  
  return (
    <div className="bg-white dark:bg-[#211A1A] rounded-3xl p-8 shadow-xl border border-landing-primary/10 flex flex-col relative overflow-hidden">
      {}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-landing-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

      {}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <h3 className="text-2xl font-display font-bold text-landing-text dark:text-white mb-1">AI Trading Decisions</h3>
          <p className="text-xs text-landing-muted font-medium">Real-time ML optimization signals</p>
        </div>
        <div className="bg-landing-primary/10 px-4 py-2 rounded-full">
          <span className="text-sm font-bold text-landing-primary">{signals.length} Signals</span>
        </div>
      </div>

      {}
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


export const QuickTradeForm = ({ onSubmit, marketOpen }) => {
  const { register, handleSubmit, setValue } = useForm();
  const dispatch = useDispatch();
  const toast = useToast();

  const [side, setSide] = React.useState('BUY');
  const [computedPrice, setComputedPrice] = React.useState(null);
  const [priceSource, setPriceSource] = React.useState('awaiting');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  
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

    
    if (marketOpen) {
      console.log('[QuickTradeForm] Market is open, starting price polling...');
      fetchLivePrice();
      
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

        
        try {
          const portfolioResponse = await axiosInstance.get('/trading/portfolio/summary');
          if (portfolioResponse.data?.success) {
            dispatch(updatePortfolioSuccess(portfolioResponse.data.summary || portfolioResponse.data));
          }
        } catch (err) {
          console.warn('[QuickTradeForm] Failed to refresh portfolio:', err);
        }

        
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

        
        setValue('quantity', 1);

        
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
      {}
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

        {}
        <input type="hidden" {...register('side')} value={side} />

        <div className="pt-2">
          <button
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 group tracking-wide text-sm ${!computedPrice || isLoading || isSubmitting
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