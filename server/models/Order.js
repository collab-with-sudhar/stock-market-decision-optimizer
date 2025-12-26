
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  orderType: { type: String, enum: ['MARKET', 'LIMIT'], default: 'MARKET' },
  status: { type: String, default: 'CREATED' }, 
  decisionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Decision' },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  filledAt: { type: Date },
});


OrderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.model('Order', OrderSchema);

export default Order;
