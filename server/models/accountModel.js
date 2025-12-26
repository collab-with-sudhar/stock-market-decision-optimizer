import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  accountType: {
    type: String,
    enum: ["paper", "live"],
    default: "paper",
    required: true,
  },
  balance: {
    type: Number,
    default: 100000, 
    required: true,
  },
  initialBalance: {
    type: Number,
    default: 100000,
    required: true,
  },
  totalInvested: {
    type: Number,
    default: 0,
  },
  totalPnL: {
    type: Number,
    default: 0,
  },
  holdings: [
    {
      symbol: { type: String, required: true },
      quantity: { type: Number, required: true, default: 0 },
      avgPrice: { type: Number, required: true, default: 0 },
      currentPrice: { type: Number, default: 0 },
      pnl: { type: Number, default: 0 },
      pnlPercent: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


accountSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});


accountSchema.methods.calculatePortfolioValue = function () {
  let holdingsValue = 0;
  let totalPnL = 0;

  this.holdings.forEach((holding) => {
    const currentValue = holding.quantity * holding.currentPrice;
    const investedValue = holding.quantity * holding.avgPrice;
    holdingsValue += currentValue;
    totalPnL += currentValue - investedValue;
  });

  this.totalPnL = totalPnL;
  const portfolioValue = this.balance + holdingsValue;

  return {
    portfolioValue,
    holdingsValue,
    cash: this.balance,
    totalPnL,
    totalPnLPercent: ((portfolioValue - this.initialBalance) / this.initialBalance) * 100,
  };
};

const Account = mongoose.model("Account", accountSchema);

export default Account;
