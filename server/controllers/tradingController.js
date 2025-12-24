import Account from "../models/accountModel.js";
import Order from "../models/Order.js";
import Position from "../models/Position.js";
import Trade from "../models/Trade.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorhander.js";

// @desc    Get user's paper trading account
// @route   GET /api/trading/account
// @access  Private
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

// @desc    Create a new order (Buy/Sell)
// @route   POST /api/trading/orders
// @access  Private
export const createOrder = catchAsyncErrors(async (req, res, next) => {
  const { symbol, side, quantity, price, orderType = "MARKET" } = req.body;

  // Validate inputs
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

  // Get user's account
  const account = await Account.findOne({ userId: req.user.id });
  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const totalCost = quantity * price;
  const brokerage = 0; // 0% brokerage for learning system

  // Validate BUY orders
  if (side === "BUY") {
    const requiredAmount = totalCost; // No brokerage
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

  // Validate SELL orders
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

  // Generate unique order ID
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create order
  const order = await Order.create({
    userId: req.user.id,
    orderId,
    symbol,
    side,
    quantity,
    price,
    orderType,
    status: "FILLED", // Auto-fill for paper trading
    filledAt: Date.now(),
  });

  // Process order and update account
  if (side === "BUY") {
    // Deduct cash (no brokerage)
    account.balance -= totalCost;
    account.totalInvested += totalCost;

    // Update or create holding
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

    // Update Position collection
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
      // Recalculate avgPrice
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

    // Create OPEN trade for BUY order
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
    // Close OPEN BUY trades in FIFO order to match quantity
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
        // Close entire trade
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
        // Partial close: create a closed trade for the closed portion
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

        // Reduce remaining quantity on the original open trade
        trade.entryQuantity = trade.entryQuantity - closeQty;
        await trade.save();
      }

      remainingQty -= closeQty;
    }

    // Add cash (no brokerage) for the sold quantity
    account.balance += (quantity * price);

    // Update holding
    const holdingIndex = account.holdings.findIndex((h) => h.symbol === symbol);
    if (holdingIndex > -1) {
      account.holdings[holdingIndex].quantity -= quantity;
      account.holdings[holdingIndex].currentPrice = price;
      account.holdings[holdingIndex].updatedAt = Date.now();

      // Calculate P&L for this partial sell
      const pnl = (price - account.holdings[holdingIndex].avgPrice) * quantity;
      account.holdings[holdingIndex].pnl = pnl;
      account.holdings[holdingIndex].pnlPercent = (pnl / (account.holdings[holdingIndex].avgPrice * quantity)) * 100;

      // Remove holding if quantity is 0
      if (account.holdings[holdingIndex].quantity === 0) {
        account.holdings.splice(holdingIndex, 1);
      }
    }

    // Update Position collection
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

// @desc    Get user's orders
// @route   GET /api/trading/orders
// @access  Private
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

// @desc    Get user's positions
// @route   GET /api/trading/positions
// @access  Private
export const getPositions = catchAsyncErrors(async (req, res, next) => {
  const positions = await Position.find({ userId: req.user.id, qty: { $gt: 0 } });

  res.status(200).json({
    success: true,
    count: positions.length,
    positions,
  });
});

// @desc    Get portfolio stats and holdings
// @route   GET /api/trading/portfolio
// @access  Private
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

// @desc    Reset paper trading account
// @route   POST /api/trading/account/reset
// @access  Private
export const resetAccount = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });

  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  // Reset account to initial state
  account.balance = account.initialBalance;
  account.totalInvested = 0;
  account.totalPnL = 0;
  account.holdings = [];
  await account.save();

  // Clear positions and trades
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

// @desc    Get comprehensive portfolio summary with metrics
// @route   GET /api/trading/portfolio/summary
// @access  Private
export const getPortfolioSummary = catchAsyncErrors(async (req, res, next) => {
  const account = await Account.findOne({ userId: req.user.id });
  if (!account) {
    return next(new ErrorHandler("Account not found", 404));
  }

  const positions = await Position.find({ userId: req.user.id, qty: { $gt: 0 } });
  const allTrades = await Trade.find({ userId: req.user.id });
  const closedTrades = await Trade.find({ userId: req.user.id, status: 'CLOSED' });

  // Live portfolio value (open positions)
  const portfolioValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.qty), 0);
  const cashInvested = positions.reduce((sum, pos) => sum + (pos.avgPrice * pos.qty), 0);
  const unrealizedPnL = positions.reduce((sum, pos) => sum + ((pos.currentPrice - pos.avgPrice) * pos.qty), 0);
  const unrealizedPnLPercent = cashInvested > 0 ? (unrealizedPnL / cashInvested) * 100 : 0;

  // Closed trades metrics
  const sumWins = closedTrades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0);
  const sumLosses = closedTrades.filter(t => t.netPnL < 0).reduce((s, t) => s + t.netPnL, 0); // negative sum
  const winningTrades = closedTrades.filter(t => t.netPnL > 0).length;
  const losingTrades = closedTrades.filter(t => t.netPnL < 0).length;
  const realizedPnL = closedTrades.reduce((sum, trade) => sum + trade.netPnL, 0);
  const avgWin = winningTrades > 0 ? (sumWins / winningTrades) : 0;
  const avgLoss = losingTrades > 0 ? (sumLosses / losingTrades) : 0; // negative value
  const profitFactor = Math.abs(sumLosses) > 0 ? (sumWins / Math.abs(sumLosses)) : 0;
  const winRate = (winningTrades + losingTrades) > 0 ? (winningTrades / (winningTrades + losingTrades)) * 100 : 0;

  // Totals & returns
  const totalPnL = unrealizedPnL + realizedPnL;
  const totalBalance = account.balance + portfolioValue;
  const portfolioReturnPercent = account.initialBalance > 0 ? ((totalBalance - account.initialBalance) / account.initialBalance) * 100 : 0;
  const tradeInvested = closedTrades.reduce((sum, t) => sum + (t.entryPrice * (t.exitQuantity || t.entryQuantity)), 0);
  const tradeReturnPercent = tradeInvested > 0 ? (realizedPnL / tradeInvested) * 100 : 0;

  res.status(200).json({
    success: true,
    summary: {
      // Account levels
      initialBalance: account.initialBalance.toFixed(2),
      currentBalance: account.balance.toFixed(2),
      totalBalance: totalBalance.toFixed(2),

      // Portfolio metrics
      portfolioValue: portfolioValue.toFixed(2),
      cashInvested: cashInvested.toFixed(2),

      // P&L metrics
      unrealizedPnL: unrealizedPnL.toFixed(2),
      unrealizedPnLPercent: unrealizedPnLPercent.toFixed(2),
      realizedPnL: realizedPnL.toFixed(2),
      totalPnL: totalPnL.toFixed(2),

      // Returns
      totalReturn: portfolioReturnPercent.toFixed(2),
      tradeReturnPercent: tradeReturnPercent.toFixed(2),

      // Trade statistics
      totalTrades: allTrades.length,
      closedTrades: closedTrades.length,
      openTrades: allTrades.length - closedTrades.length,
      winningTrades,
      losingTrades,
      winRate: winRate.toFixed(2),

      // Trade metrics
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: profitFactor.toFixed(2),

      // Holdings
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

// @desc    Get trade history
// @route   GET /api/trading/trades
// @access  Private
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
