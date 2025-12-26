
import mongoose from 'mongoose';

const DecisionSchema = new mongoose.Schema({
  symbol: { type: String, default: 'UNKNOWN' },
  obs: { type: Array, default: [] },
  action: { type: Number, required: true }, 
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const Decision = mongoose.model('Decision', DecisionSchema);

export default Decision;
