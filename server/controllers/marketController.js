import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorhander.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for LTP (Last Traded Price) and tick history
const ltpStore = new Map();
const tickHistoryStore = new Map(); // Keep last 60 ticks per symbol

// Store LTP from tick (called from monitor route)
export const updateLatestPrice = (symbol, price, timestamp) => {
  const upperSymbol = symbol.toUpperCase();
  const numPrice = Number(price);
  const now = timestamp || Date.now();
  
  // Update LTP
  ltpStore.set(upperSymbol, {
    ltp: numPrice,
    timestamp: now,
    updatedAt: new Date().toISOString(),
  });
  
  // Store tick in history (keep last 60)
  if (!tickHistoryStore.has(upperSymbol)) {
    tickHistoryStore.set(upperSymbol, []);
  }
  const history = tickHistoryStore.get(upperSymbol);
  history.push({
    price: numPrice,
    timestamp: now,
  });
  if (history.length > 60) {
    history.shift();
  }
};

// @desc    Get current LTP from smartapi_streamer
// @route   GET /api/market/live-price
// @access  Public
export const getLivePrice = catchAsyncErrors(async (req, res, next) => {
  const { symbol = 'NIFTY' } = req.query;
  const upperSymbol = symbol.toUpperCase();
  
  const ltpData = ltpStore.get(upperSymbol);
  
  if (!ltpData) {
    return next(new ErrorHandler(`No live price data available for ${symbol}`, 404));
  }

  // Calculate stats from tick history
  const history = tickHistoryStore.get(upperSymbol) || [];
  const high = history.length > 0 ? Math.max(...history.map(t => t.price)) : ltpData.ltp;
  const low = history.length > 0 ? Math.min(...history.map(t => t.price)) : ltpData.ltp;
  const avg = history.length > 0 ? history.reduce((sum, t) => sum + t.price, 0) / history.length : ltpData.ltp;

  res.status(200).json({
    success: true,
    symbol: upperSymbol,
    ltp: ltpData.ltp,
    price: ltpData.ltp,
    high,
    low,
    average: Number(avg.toFixed(2)),
    tickCount: history.length,
    timestamp: ltpData.timestamp,
    updatedAt: ltpData.updatedAt,
    source: 'smartapi_streamer-ltp',
  });
});

// @desc    Get latest closing price for NIFTY
// @route   GET /api/market/closing-price
// @access  Public
export const getClosingPrice = catchAsyncErrors(async (req, res, next) => {
  const { symbol = 'NIFTY' } = req.query;

  try {
    // Path to the latest data file (tmp_test_slice.csv contains most recent data)
    const dataPath = path.join(__dirname, '../../data/tmp_test_slice.csv');
    
    if (!fs.existsSync(dataPath)) {
      return next(new ErrorHandler("Market data file not found", 404));
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    if (lines.length < 2) {
      return next(new ErrorHandler("No market data available", 404));
    }

    // Get the last line (most recent trading day)
    const lastLine = lines[lines.length - 1];
    const columns = lastLine.split(',');
    
    // CSV format: Date,Close,High,Low,Open,Volume
    const closingPrice = parseFloat(columns[1]);
    const date = columns[0];
    const high = parseFloat(columns[2]);
    const low = parseFloat(columns[3]);
    const open = parseFloat(columns[4]);

    if (isNaN(closingPrice)) {
      return next(new ErrorHandler("Invalid closing price data", 500));
    }

    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      closingPrice,
      date,
      marketData: {
        open,
        high,
        low,
        close: closingPrice,
      },
    });
  } catch (error) {
    console.error('Error reading market data:', error);
    return next(new ErrorHandler("Failed to fetch closing price", 500));
  }
});

// @desc    Get market status (open/closed)
// @route   GET /api/market/status
// @access  Public
export const getMarketStatus = catchAsyncErrors(async (req, res, next) => {
  // Get current time in IST (UTC+5:30) using toLocaleString
  const now = new Date();
  const istTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istTime = new Date(istTimeString);
  
  const day = istTime.getDay(); // 0=Sun, 6=Sat
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // NSE trading hours: 9:15 AM to 3:30 PM IST (Mon-Fri)
  const isWeekday = day >= 1 && day <= 5;
  const openMinutes = 9 * 60 + 15; // 9:15 AM = 555 minutes
  const closeMinutes = 15 * 60 + 30; // 3:30 PM = 930 minutes
  const isWithinTradingHours = totalMinutes >= openMinutes && totalMinutes <= closeMinutes;

  const isOpen = isWeekday && isWithinTradingHours;

  res.status(200).json({
    success: true,
    marketOpen: isOpen,
    currentTime: now.toISOString(),
    istTime: istTime.toISOString(),
    istHours: hours,
    istMinutes: minutes,
    totalMinutes,
    message: isOpen ? "Market is open" : "Market is closed",
  });
});
