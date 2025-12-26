import Account from "../models/accountModel.js";
import Order from "../models/Order.js";
import Position from "../models/Position.js";
import Trade from "../models/Trade.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorhander.js";
import { isMarketOpen } from "../utils/marketSchedule.js";




export const getAccount = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });

  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const portfolioStats = account.calculatePortfolioValue();

  res.status(200).json({
    success: true,
    account: {
      ...account.toObject(),
      portfolioStats,
    },
  });
});




export const createOrder = catchAsyncErrors(async (req, res, next) => {
  const { symbol, side, quantity, price, orderType = "MARKET" } = req.body;

  
  if (!isMarketOpen()) {
    return next(new ErrorHandler("Market is closed. Trades are not allowed outside market hours/holidays.", 400));
  }

  
  if (!symbol || !side || !quantity || !price) {
    return next(new ErrorHandler("Please provide all required fields: symbol, side, quantity, price", 400));
  }

  if (!['BUY', 'SELL'].includes(side)) {
    return next(new ErrorHandler("Side must be BUY or SELL", 400));
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return next(new ErrorHandler("Quantity must be a positive integer", 400));
  }

  if (price <= 0) {
    return next(new ErrorHandler("Price must be a positive number", 400));
  }

  
  const account = await Account.findOne({ userId: req.user.id });
  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const totalCost = quantity * price;
  const brokerage = 0; 

  
  if (side === "BUY") {
    const requiredAmount = totalCost; 
    if (account.balance < requiredAmount) {
      return next(
        new ErrorHandler(
          {
            message: "Insufficient balance",
            required: requiredAmount.toFixed(2),
            available: account.balance.toFixed(2),
            shortfall: (requiredAmount - account.balance).toFixed(2)
          },
          400
        )
      );
    }
  }

  
  if (side === "SELL") {
    const holding = account.holdings.find((h) => h.symbol === symbol);
    if (!holding || holding.quantity < quantity) {
      return next(
        new ErrorHandler(
          {
            message: "Insufficient holdings",
            required: quantity,
            available: holding?.quantity || 0
          },
          400
        )
      );
    }
  }

  
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  
  const order = await Order.create({
    userId: req.user.id,
    orderId,
    symbol,
    side,
    quantity,
    price,
    orderType,
    status: "FILLED", 
    filledAt: Date.now(),
  });

  
  if (side === "BUY") {
    
    account.balance -= totalCost;
    account.totalInvested += totalCost;

    
    const holdingIndex = account.holdings.findIndex((h) => h.symbol === symbol);
    if (holdingIndex > -1) {
      const holding = account.holdings[holdingIndex];
      const newQty = holding.quantity + quantity;
      const newAvgPrice = (holding.quantity * holding.avgPrice + totalCost) / newQty;
      account.holdings[holdingIndex].quantity = newQty;
      account.holdings[holdingIndex].avgPrice = newAvgPrice;
      account.holdings[holdingIndex].currentPrice = price;
      account.holdings[holdingIndex].updatedAt = Date.now();
    } else {
      account.holdings.push({
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        pnl: 0,
        pnlPercent: 0,
      });
    }

    
    await Position.findOneAndUpdate(
      { userId: req.user.id, symbol },
      {
        $inc: { qty: quantity },
        $set: {
          updatedAt: Date.now(),
          currentPrice: price
        },
      },
      { upsert: true, new: true }
    ).then(async (position) => {
      
      const buyOrders = await Order.find({
        userId: req.user.id,
        symbol,
        side: "BUY",
        status: "FILLED",
      });
      const totalQty = buyOrders.reduce((sum, o) => sum + o.quantity, 0);
      const totalValue = buyOrders.reduce((sum, o) => sum + o.quantity * o.price, 0);
      position.avgPrice = totalValue / totalQty;
      position.currentPrice = price;
      const pnl = (price - position.avgPrice) * position.qty;
      position.pnl = pnl;
      position.pnlPercent = (pnl / (position.avgPrice * position.qty)) * 100;
      await position.save();
    });

    
    const tradeId = `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await Trade.create({
      userId: req.user.id,
      tradeId,
      symbol,
      entryOrderId: orderId,
      entrySide: 'BUY',
      entryQuantity: quantity,
      entryPrice: price,
      entryTime: Date.now(),
      status: 'OPEN',
      brokerage: 0
    });

  } else if (side === "SELL") {
    
    let remainingQty = quantity;
    const openTrades = await Trade.find({
      userId: req.user.id,
      symbol,
      status: 'OPEN',
      entrySide: 'BUY'
    }).sort({ entryTime: 1 });

    for (const trade of openTrades) {
      if (remainingQty <= 0) break;

      const closeQty = Math.min(remainingQty, trade.entryQuantity);

      if (closeQty === trade.entryQuantity) {
        
        trade.exitOrderId = orderId;
        trade.exitSide = 'SELL';
        trade.exitQuantity = closeQty;
        trade.exitPrice = price;
        trade.exitTime = Date.now();
        trade.status = 'CLOSED';
        trade.closedAt = Date.now();
        trade.calculateHoldingDuration();
        trade.calculatePnL(0);
        await trade.save();
        account.totalPnL += trade.netPnL;
      } else {
        
        const partialTradeId = `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const closedPortion = await Trade.create({
          userId: req.user.id,
          tradeId: partialTradeId,
          symbol,
          entryOrderId: trade.entryOrderId,
          entrySide: trade.entrySide,
          entryQuantity: closeQty,
          entryPrice: trade.entryPrice,
          entryTime: trade.entryTime,
          exitOrderId: orderId,
          exitSide: 'SELL',
          exitQuantity: closeQty,
          exitPrice: price,
          exitTime: Date.now(),
          status: 'CLOSED',
          closedAt: Date.now(),
          brokerage: 0
        });
        closedPortion.calculateHoldingDuration();
        closedPortion.calculatePnL(0);
        await closedPortion.save();
        account.totalPnL += closedPortion.netPnL;

        
        trade.entryQuantity = trade.entryQuantity - closeQty;
        await trade.save();
      }

      remainingQty -= closeQty;
    }

    
    account.balance += (quantity * price);

    
    const holdingIndex = account.holdings.findIndex((h) => h.symbol === symbol);
    if (holdingIndex > -1) {
      account.holdings[holdingIndex].quantity -= quantity;
      account.holdings[holdingIndex].currentPrice = price;
      account.holdings[holdingIndex].updatedAt = Date.now();

      
      const pnl = (price - account.holdings[holdingIndex].avgPrice) * quantity;
      account.holdings[holdingIndex].pnl = pnl;
      account.holdings[holdingIndex].pnlPercent = (pnl / (account.holdings[holdingIndex].avgPrice * quantity)) * 100;

      
      if (account.holdings[holdingIndex].quantity === 0) {
        account.holdings.splice(holdingIndex, 1);
      }
    }

    
    const position = await Position.findOne({ userId: req.user.id, symbol });
    if (position) {
      position.qty -= quantity;
      position.currentPrice = price;
      if (position.qty === 0) {
        await Position.deleteOne({ userId: req.user.id, symbol });
      } else {
        const pnl = (price - position.avgPrice) * position.qty;
        position.pnl = pnl;
        position.pnlPercent = (pnl / (position.avgPrice * position.qty)) * 100;
        await position.save();
      }
    }
  }

  await account.save();

  res.status(201).json({
    success: true,
    message: `Order ${orderId} ${side === "BUY" ? "placed" : "executed"} successfully`,
    order: {
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price,
      status: order.status,
      brokerage: brokerage.toFixed(2),
      createdAt: order.createdAt
    },
    account: {
      balance: account.balance.toFixed(2),
      totalInvested: account.totalInvested.toFixed(2),
      totalPnL: account.totalPnL.toFixed(2)
    },
  });
});




export const getOrders = catchAsyncErrors(async (req, res, next) => {
  const { limit = 20, status } = req.query;

  const filter = { userId: req.user.id };
  if (status) {
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});




export const getPositions = catchAsyncErrors(async (req, res, next) => {
  const positions = await Position.find({ userId: req.user.id, qty: { $gt: 0 } });

  res.status(200).json({
    success: true,
    count: positions.length,
    positions,
  });
});




export const getPortfolio = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });

  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const portfolioStats = account.calculatePortfolioValue();
  const positions = await Position.find({ userId: req.user.id, qty: { $gt: 0 } });

  res.status(200).json({
    success: true,
    portfolio: {
      ...portfolioStats,
      holdings: account.holdings,
      positions,
    },
  });
});




export const resetAccount = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });

  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  
  account.balance = account.initialBalance;
  account.totalInvested = 0;
  account.totalPnL = 0;
  account.holdings = [];
  await account.save();

  
  await Position.deleteMany({ userId: req.user.id });
  await Trade.deleteMany({ userId: req.user.id });

  res.status(200).json({
    success: true,
    message: "Account reset successfully",
    account: {
      balance: account.balance,
      totalInvested: account.totalInvested,
      totalPnL: account.totalPnL,
      holdings: account.holdings
    }
  });
});







export const getPortfolioSummary = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });
  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const positions = await Position.find({ userId: req.user.id, qty: { $gt: 0 } });
  const allTrades = await Trade.find({ userId: req.user.id });
  const closedTrades = await Trade.find({ userId: req.user.id, status: 'CLOSED' });

  
  
  const portfolioValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.qty), 0);

  
  const cashInvested = positions.reduce((sum, pos) => sum + (pos.avgPrice * pos.qty), 0);

  
  const unrealizedPnL = positions.reduce((sum, pos) => {
    
    const current = pos.currentPrice || 0;
    const avg = pos.avgPrice || 0;
    return sum + ((current - avg) * pos.qty);
  }, 0);

  const unrealizedPnLPercent = cashInvested > 0 ? (unrealizedPnL / cashInvested) * 100 : 0;

  
  let sumWins = 0;
  let sumLosses = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalRealizedPnL = 0;
  let totalTradeInvested = 0; 

  closedTrades.forEach(trade => {
    
    const netPnL = trade.netPnL || 0;
    const entryTotal = (trade.entryPrice * trade.entryQuantity) || 0;

    totalRealizedPnL += netPnL;
    totalTradeInvested += entryTotal;

    if (netPnL > 0) {
      sumWins += netPnL;
      winningTrades++;
    } else if (netPnL < 0) {
      sumLosses += netPnL; 
      losingTrades++;
    }
  });

  const avgWin = winningTrades > 0 ? (sumWins / winningTrades) : 0;
  const avgLoss = losingTrades > 0 ? (sumLosses / losingTrades) : 0;
  
  const absLosses = Math.abs(sumLosses);
  const profitFactor = absLosses > 0 ? (sumWins / absLosses) : (sumWins > 0 ? 999 : 0); 

  const totalClosed = winningTrades + losingTrades;
  const winRate = totalClosed > 0 ? (winningTrades / totalClosed) * 100 : 0;

  
  const totalPnL = unrealizedPnL + totalRealizedPnL;
  const totalBalance = account.balance + portfolioValue;

  
  const portfolioReturnPercent = account.initialBalance > 0
    ? ((totalBalance - account.initialBalance) / account.initialBalance) * 100
    : 0;

  
  
  const sumTradeROIs = closedTrades.reduce((sum, t) => {
    const entryVal = t.entryPrice * t.entryQuantity;
    if (entryVal <= 0) return sum; 
    return sum + ((t.netPnL / entryVal) * 100);
  }, 0);

  const avgTradeROI = totalClosed > 0 ? (sumTradeROIs / totalClosed) : 0;

  
  

  res.status(200).json({
    success: true,
    summary: {
      
      initialBalance: account.initialBalance.toFixed(2),
      currentBalance: account.balance.toFixed(2),
      totalBalance: totalBalance.toFixed(2),

      
      portfolioValue: portfolioValue.toFixed(2),
      cashInvested: cashInvested.toFixed(2),

      
      unrealizedPnL: unrealizedPnL.toFixed(2),
      unrealizedPnLPercent: unrealizedPnLPercent.toFixed(2),
      realizedPnL: totalRealizedPnL.toFixed(2),
      totalPnL: totalPnL.toFixed(2),

      
      totalReturn: portfolioReturnPercent.toFixed(2),
      tradeReturnPercent: avgTradeROI.toFixed(2), 

      
      totalTrades: allTrades.length,
      closedTrades: closedTrades.length,
      openTrades: allTrades.length - closedTrades.length,
      winningTrades,
      losingTrades,
      winRate: winRate.toFixed(2),

      
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: profitFactor.toFixed(2),

      
      positions: positions.map(p => ({
        symbol: p.symbol,
        quantity: p.qty,
        avgPrice: p.avgPrice.toFixed(2),
        currentPrice: p.currentPrice.toFixed(2),
        pnl: p.pnl.toFixed(2),
        pnlPercent: p.pnlPercent.toFixed(2),
        value: (p.currentPrice * p.qty).toFixed(2)
      }))
    }
  });
});




export const getTradeHistory = catchAsyncErrors(async (req, res, next) => {
  const { limit = 50, status = 'CLOSED', symbol } = req.query;

  const filter = { userId: req.user.id };
  if (status) filter.status = status;
  if (symbol) filter.symbol = symbol;

  const trades = await Trade.find(filter)
    .sort({ closedAt: -1, entryTime: -1 })
    .limit(parseInt(limit));

  const formattedTrades = trades.map(t => ({
    tradeId: t.tradeId,
    symbol: t.symbol,
    entrySide: t.entrySide,
    entryQuantity: t.entryQuantity,
    entryPrice: t.entryPrice.toFixed(2),
    entryTime: t.entryTime,
    exitSide: t.exitSide || 'N/A',
    exitQuantity: t.exitQuantity || 'N/A',
    exitPrice: t.exitPrice ? t.exitPrice.toFixed(2) : 'N/A',
    exitTime: t.exitTime || null,
    status: t.status,
    pnl: t.pnl.toFixed(2),
    pnlPercent: t.pnlPercent.toFixed(2),
    netPnL: t.netPnL.toFixed(2),
    brokerage: t.brokerage.toFixed(2),
    holdingDays: t.holdingDays || 0,
    holdingHours: t.holdingHours || 0,
    holdingMinutes: t.holdingMinutes || 0
  }));

  res.status(200).json({
    success: true,
    count: formattedTrades.length,
    trades: formattedTrades
  });
});
