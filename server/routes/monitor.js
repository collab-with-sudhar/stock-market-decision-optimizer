
import express from 'express';
import Position from '../models/Position.js';
import Order from '../models/Order.js';
import Decision from '../models/Decision.js';
import { updateLatestPrice } from '../controllers/marketController.js';

const router = express.Router();


router.get('/positions', async (req, res) => {
  try {
    const { symbol } = req.query;
    const filter = symbol ? { symbol } : {};
    const positions = await Position.find(filter).sort({ symbol: 1 }).exec();
    res.json(positions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch positions', message: err.message });
  }
});


router.get('/positions/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const pos = await Position.findOne({ symbol }).exec();
    if (!pos) {
      return res.status(404).json({ error: `No position found for ${symbol}` });
    }
    res.json(pos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch position', message: err.message });
  }
});


router.get('/orders', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;
    const filter = symbol ? { symbol } : {};
    const lim = Math.min(Number(limit) || 50, 500); 
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim)
      .exec();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch orders', message: err.message });
  }
});


router.get('/decisions', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;
    const filter = symbol ? { symbol } : {};
    const lim = Math.min(Number(limit) || 50, 500);
    const decisions = await Decision.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim)
      .exec();
    res.json(decisions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch decisions', message: err.message });
  }
});


router.post('/tick', async (req, res) => {
  try {
    const io = req.app.locals.io;
    const { symbol, price, ts } = req.body || {};
    if (!symbol || typeof price !== 'number') {
      return res.status(400).json({ error: 'symbol and numeric price required' });
    }
    const payload = {
      symbol,
      price,
      ts: ts || Date.now(),
    };
    
    
    updateLatestPrice(symbol, price, ts);
    
    if (io) {
      io.emit('tick', payload);
      const clientCount = io.engine?.clientsCount || 0;
      if (clientCount > 0) {
        console.log(`[Monitor] Tick emitted to ${clientCount} clients:`, payload);
      }
    } else {
      console.warn('[Monitor] WebSocket IO not available for tick broadcast');
    }
    res.json({ status: 'ok', forwarded: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to forward tick', message: err.message });
  }
});

export default router;
