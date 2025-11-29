// server/models/Order.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'CREATED' }, // CREATED, FILLED, CANCELLED
  decisionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Decision' },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  filledAt: { type: Date },
});

const Order = mongoose.model('Order', OrderSchema);

export default Order;
