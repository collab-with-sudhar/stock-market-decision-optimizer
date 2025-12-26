
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

const fixTrades = async () => {
    await connectDB();

    try {
        const trades = await Trade.find({ status: 'CLOSED' });
        console.log(`Found ${trades.length} closed trades. Checking for anomalies...`);

        let fixedCount = 0;

        for (const trade of trades) {
            
            
            
            

            if (!trade.entryPrice && !trade.entryQuantity) {
                console.log(`Skipping Trade ${trade.tradeId}: Totally missing entry data.`);
                continue;
            }

            let calculatedPnL = 0;
            let entryTotal = (trade.entryPrice || 0) * (trade.entryQuantity || 0);
            let exitTotal = (trade.exitPrice || 0) * (trade.exitQuantity || trade.entryQuantity || 0);

            
            if (entryTotal === 0 && exitTotal > 0) {
                console.log(`Trade ${trade.tradeId} has 0 Entry Cost! Resetting PnL to 0.`);
                calculatedPnL = 0;
            } else if (trade.entrySide === 'BUY') {
                calculatedPnL = exitTotal - entryTotal;
            } else {
                calculatedPnL = entryTotal - exitTotal;
            }

            console.log(`Checking Record ${trade.tradeId}:`);
            console.log(`  Entry: ${trade.entryPrice} * ${trade.entryQuantity} = ${entryTotal}`);
            console.log(`  Exit: ${trade.exitPrice} * ${trade.exitQuantity} = ${exitTotal}`);
            console.log(`  Stored PnL: ${trade.pnl} | Calc PnL: ${calculatedPnL}`);
            console.log(`  Diff: ${Math.abs(trade.pnl - calculatedPnL)}`);

            
            if (Number.isNaN(trade.pnl) || Math.abs(trade.pnl - calculatedPnL) > 1) {
                console.log(`\nDetected Mismatch in Trade ${trade.tradeId} (${trade.symbol}):`);
                console.log(`  Stored PnL: ${trade.pnl}`);
                console.log(`  Entry: ${trade.entryPrice} * ${trade.entryQuantity} = ${entryTotal}`);
                console.log(`  Exit:  ${trade.exitPrice} * ${trade.exitQuantity} = ${exitTotal}`);
                console.log(`  Correct PnL should be: ${calculatedPnL.toFixed(2)}`);

                
                trade.pnl = calculatedPnL;
                trade.netPnL = calculatedPnL; 

                if (entryTotal > 0) {
                    trade.pnlPercent = (calculatedPnL / entryTotal) * 100;
                } else {
                    trade.pnlPercent = 0;
                }

                await trade.save();
                console.log(`  ✅ Fixed.`);
                fixedCount++;
            }
        }

        console.log(`\nSummary: Fixed ${fixedCount} trades.`);
        process.exit();

    } catch (error) {
        console.error('Error fixing trades:', error);
        process.exit(1);
    }
};

fixTrades();
