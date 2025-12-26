
import mongoose from 'mongoose';

const PositionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  symbol: { type: String, required: true, index: true },
  qty: { type: Number, default: 0 },
  avgPrice: { type: Number, default: 0 },
  currentPrice: { type: Number, default: 0 },
  pnl: { type: Number, default: 0 },
  pnlPercent: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});


PositionSchema.index({ userId: 1, symbol: 1 }, { unique: true });

const Position = mongoose.model('Position', PositionSchema);

export default Position;
