import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorhander.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ltpStore = new Map();
const tickHistoryStore = new Map(); 


export const updateLatestPrice = (symbol, price, timestamp) => {
  const upperSymbol = symbol.toUpperCase();
  const numPrice = Number(price);
  const now = timestamp || Date.now();

  
  ltpStore.set(upperSymbol, {
    ltp: numPrice,
    timestamp: now,
    updatedAt: new Date().toISOString(),
  });

  
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




export const getLivePrice = catchAsyncErrors(async (req, res, next) => {
  const { symbol = 'NIFTY' } = req.query;
  const upperSymbol = symbol.toUpperCase();

  const ltpData = ltpStore.get(upperSymbol);

  if (!ltpData) {
    return next(new ErrorHandler(`No live price data available for ${symbol}`, 404));
  }

  
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




export const getClosingPrice = catchAsyncErrors(async (req, res, next) => {
  const { symbol = 'NIFTY' } = req.query;

  try {
    
    const dataPath = path.join(__dirname, '../../data/tmp_test_slice.csv');

    if (!fs.existsSync(dataPath)) {
      return next(new ErrorHandler("Market data file not found", 404));
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    if (lines.length < 2) {
      return next(new ErrorHandler("No market data available", 404));
    }

    
    const lastLine = lines[lines.length - 1];
    const columns = lastLine.split(',');

    
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




export const getMarketStatus = catchAsyncErrors(async (req, res, next) => {
  
  const now = new Date();
  const istTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istTime = new Date(istTimeString);

  const day = istTime.getDay(); 
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  
  const isWeekday = day >= 1 && day <= 5;
  const openMinutes = 9 * 60 + 15; 
  const closeMinutes = 15 * 60 + 30; 
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
