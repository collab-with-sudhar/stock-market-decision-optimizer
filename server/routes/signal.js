// server/routes/signal.js
import express from 'express';

import {
  EXPECTED_OBS_LEN,
  ACCOUNT_SIZE,
  DEFAULT_ORDER_VALUE,
  MAX_POSITION_PCT,
  MIN_TIME_BETWEEN_TRADES_SECS,
  MAX_TRADES_PER_DAY,
} from '../config.js';

import { predict as modelPredict } from '../services/modelClient.js';
import { placeOrder } from '../services/executionAdapter.js';

import Decision from '../models/Decision.js';
import Order from '../models/Order.js';
import Position from '../models/Position.js';

const router = express.Router();

function nowISO() {
  return new Date().toISOString();
}

function computeQuantity(price) {
  if (!price || price <= 0) return 1;
  const qty = Math.floor(DEFAULT_ORDER_VALUE / price);
  return Math.max(qty, 1);
}

async function checkMinTime(symbol) {
  // const cutoff = new Date(Date.now() - MIN_TIME_BETWEEN_TRADES_SECS * 1000);
  // const last = await Decision.findOne({ symbol }).sort({ createdAt: -1 }).exec();
  // if (!last) return true;
  // return last.createdAt < cutoff;
  return true;
}

async function checkMaxTradesPerDay() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await Decision.countDocuments({ createdAt: { $gte: start } }).exec();
  return count < MAX_TRADES_PER_DAY;
}

async function checkMaxPosition(symbol, price, additionalQty = 0) {
  const pos = await Position.findOne({ symbol }).exec();
  const currentQty = pos ? pos.qty : 0;
  const newQty = Math.abs(currentQty + additionalQty);
  const newPositionValue = newQty * price;
  return newPositionValue <= MAX_POSITION_PCT * ACCOUNT_SIZE;
}

router.post('/signal', async (req, res) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { obs, symbol = 'UNKNOWN', price = null, dryRun = true } = req.body;

    if (!Array.isArray(obs) || obs.length === 0) {
      return res.status(400).json({ error: "Missing 'obs' array in request body." });
    }

    if (obs.length !== EXPECTED_OBS_LEN) {
      return res
        .status(400)
        .json({ error: `Invalid obs length ${obs.length}, expected ${EXPECTED_OBS_LEN}` });
    }

    // Ask model-server
    const modelResp = await modelPredict(obs); // { action, latency_ms }
    const action = modelResp.action;

    const decisionDoc = await Decision.create({
      symbol,
      obs,
      action,
      meta: { modelLatencyMs: modelResp.latency_ms, createdAt: nowISO() },
    });

    io.emit('decision', {
      id: decisionDoc._id,
      symbol,
      action,
      createdAt: decisionDoc.createdAt,
    });

    if (!(await checkMaxTradesPerDay())) {
      logger.info('Max trades per day exceeded');
      return res
        .status(403)
        .json({ error: 'Max trades per day limit reached', decisionId: decisionDoc._id });
    }

    if (!(await checkMinTime(symbol))) {
      logger.info(`Min time between trades violated for ${symbol}`);
      return res
        .status(403)
        .json({ error: 'Too soon to trade the same symbol', decisionId: decisionDoc._id });
    }

    if (action === 0) {
      return res.json({ result: 'HOLD', decisionId: decisionDoc._id });
    }

    const side = action === 1 ? 'BUY' : 'SELL';
    const priceVal = Number(price) || 1.0;
    const qty = computeQuantity(priceVal);

    if (!(await checkMaxPosition(symbol, priceVal, side === 'BUY' ? qty : -qty))) {
      logger.info(`Max position check failed for ${symbol}`);
      return res
        .status(403)
        .json({ error: 'Max position limit would be exceeded', decisionId: decisionDoc._id });
    }

    const orderResult = await placeOrder({
      symbol,
      side,
      quantity: qty,
      price: priceVal,
      meta: { dryRun },
    });

    const orderDoc = await Order.create({
      orderId: orderResult.orderId,
      symbol,
      side,
      quantity: qty,
      price: priceVal,
      status: orderResult.status,
      decisionRef: decisionDoc._id,
      raw: orderResult.raw,
      createdAt: orderResult.placedAt,
      filledAt: orderResult.filledAt,
    });

    let pos = await Position.findOne({ symbol }).exec();
    if (!pos) {
      pos = await Position.create({
        symbol,
        qty: side === 'BUY' ? qty : -qty,
        avgPrice: priceVal,
        updatedAt: new Date(),
      });
    } else {
      const newQty = pos.qty + (side === 'BUY' ? qty : -qty);
      let newAvg = pos.avgPrice;
      if (side === 'BUY' && newQty !== 0) {
        newAvg = ((pos.qty * pos.avgPrice) + (qty * priceVal)) / (pos.qty + qty);
      }
      pos.qty = newQty;
      pos.avgPrice = newAvg;
      pos.updatedAt = new Date();
      await pos.save();
    }

    io.emit('order', { order: orderDoc });

    return res.json({
      result: 'ORDER_PLACED',
      order: orderDoc,
      decisionId: decisionDoc._id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal server error', message: err.message });
  }
});

export default router;
