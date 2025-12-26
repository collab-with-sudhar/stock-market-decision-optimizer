
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trade from './models/Trade.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_rl');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const forceFix = async () => {
    await connectDB();

    try {
        const trades = await Trade.find({ status: 'CLOSED' });
        console.log(`Scanning ${trades.length} closed trades for repair...`);

        let fixedCount = 0;

        for (const trade of trades) {
            
            if (trade.tradeId === 'TRD-1766561153375-54RPX28K8') {
                console.log('>>> TARGET ACQUIRED (TRD-1766561153375-54RPX28K8). FORCING REPAIR.');

                
                trade.entryQuantity = 1;
                trade.exitQuantity = 1;

                
                
                trade.pnl = trade.exitPrice - trade.entryPrice;
                trade.netPnL = trade.pnl;
                trade.pnlPercent = (trade.pnl / trade.entryPrice) * 100;

                await trade.save();
                console.log(`>>> Trade Repaired. New PnL: ${trade.pnl}`);
                fixedCount++;
                continue;
            }

            
            let entryQ = trade.entryQuantity || 0;
            if (entryQ === 0) {
                console.log(`[Fixing Data] Trade ${trade.tradeId} has EntryQuantity 0. Defaulting to 1.`);
                trade.entryQuantity = 1;
                entryQ = 1;
            }

            let exitQ = trade.exitQuantity || 0;
            if (exitQ === 0) {
                trade.exitQuantity = entryQ;
                exitQ = entryQ;
            }

            const entryTotal = (trade.entryPrice || 0) * entryQ;
            const exitTotal = (trade.exitPrice || 0) * exitQ;

            let newPnL = 0;
            if (trade.entrySide === 'BUY') {
                newPnL = exitTotal - entryTotal;
            } else {
                newPnL = entryTotal - exitTotal;
            }

            if (Math.abs(trade.pnl - newPnL) > 0.5) {
                console.log(`Fixing ${trade.tradeId}: Old PnL: ${trade.pnl} -> New PnL: ${newPnL}`);
                trade.pnl = newPnL;
                trade.netPnL = newPnL;
                if (entryTotal > 0) {
                    trade.pnlPercent = (newPnL / entryTotal) * 100;
                } else {
                    trade.pnlPercent = 0;
                }
                await trade.save();
                fixedCount++;
            }
        }

        console.log(`\nDONE. Fixed ${fixedCount} trades.`);
        process.exit();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

forceFix();
