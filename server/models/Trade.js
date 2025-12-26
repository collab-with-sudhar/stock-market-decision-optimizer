import mongoose from 'mongoose';

const TradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tradeId: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true,
    index: true
  },
  
  entryOrderId: {
    type: String,
    required: true
  },
  entrySide: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entryQuantity: {
    type: Number,
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  entryTime: {
    type: Date,
    default: Date.now
  },

  
  exitOrderId: {
    type: String
  },
  exitSide: {
    type: String,
    enum: ['BUY', 'SELL']
  },
  exitQuantity: {
    type: Number
  },
  exitPrice: {
    type: Number
  },
  exitTime: {
    type: Date
  },

  
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'PARTIAL'],
    default: 'OPEN',
    index: true
  },

  
  pnl: {
    type: Number,
    default: 0
  },
  pnlPercent: {
    type: Number,
    default: 0
  },
  brokerage: {
    type: Number,
    default: 0
  },
  netPnL: {
    type: Number,
    default: 0
  },

  
  holdingDays: {
    type: Number,
    default: 0
  },
  holdingHours: {
    type: Number,
    default: 0
  },
  holdingMinutes: {
    type: Number,
    default: 0
  },

  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  closedAt: {
    type: Date
  }
});


TradeSchema.index({ userId: 1, createdAt: -1 });
TradeSchema.index({ userId: 1, status: 1 });
TradeSchema.index({ userId: 1, symbol: 1 });


TradeSchema.methods.calculateHoldingDuration = function () {
  if (!this.exitTime) return null;

  const duration = this.exitTime - this.entryTime;
  const totalMinutes = Math.floor(duration / (1000 * 60));

  this.holdingDays = Math.floor(totalMinutes / (24 * 60));
  this.holdingHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  this.holdingMinutes = totalMinutes % 60;

  return {
    days: this.holdingDays,
    hours: this.holdingHours,
    minutes: this.holdingMinutes,
    totalMinutes
  };
};


TradeSchema.methods.calculatePnL = function (brokerage = 0) {
  if (!this.exitPrice || !this.exitQuantity) return null;

  const entryTotal = this.entryPrice * this.entryQuantity;
  const exitTotal = this.exitPrice * this.exitQuantity;

  if (this.entrySide === 'BUY') {
    this.pnl = exitTotal - entryTotal;
  } else {
    this.pnl = entryTotal - exitTotal;
  }

  
  if (entryTotal > 0) {
    this.pnlPercent = (this.pnl / entryTotal) * 100;
  } else {
    this.pnlPercent = 0;
  }
  this.brokerage = brokerage;
  this.netPnL = this.pnl - brokerage;

  return {
    pnl: this.pnl,
    pnlPercent: this.pnlPercent,
    brokerage,
    netPnL: this.netPnL
  };
};

const Trade = mongoose.model('Trade', TradeSchema);

export default Trade;
