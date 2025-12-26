
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trade from './models/Trade.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_rl');
    console.log(`MongoDB Connected`);
};

const inspect = async () => {
    await connectDB();
    const trades = await Trade.find({ status: 'CLOSED' });

    const summary = trades.map(t => ({
        id: t.tradeId,
        sy: t.symbol,
        enP: t.entryPrice,
        exP: t.exitPrice,
        pnl: t.pnl,
        calc: (t.exitPrice * (t.exitQuantity || t.entryQuantity)) - (t.entryPrice * t.entryQuantity)
    }));

    console.log('\n--- CURRENT DATABASE STATE ---');
    summary.forEach(t => {
        console.log(`Trade ${t.id} (${t.sy}):`);
        console.log(`   Entry: ${t.enP} | Exit: ${t.exP}`);
        console.log(`   P&L: ${t.pnl} | Calculated: ${t.calc}`);
        console.log('   -----------------------------');
    });
    process.exit();
};

inspect();
