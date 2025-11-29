// server/models/Position.js
import mongoose from 'mongoose';

const PositionSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  qty: { type: Number, default: 0 },
  avgPrice: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const Position = mongoose.model('Position', PositionSchema);

export default Position;
