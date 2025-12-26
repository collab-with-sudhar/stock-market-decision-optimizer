
import express from 'express';

import {
  EXPECTED_OBS_LEN,
  DEFAULT_ORDER_VALUE,
} from '../config.js';

import {
  predict as modelPredict,
  predictFromCloses as modelPredictFromCloses,
} from '../services/modelClient.js';

import Decision from '../models/Decision.js';

const router = express.Router();

function nowISO() {
  return new Date().toISOString();
}

function computeQuantity(price) {
  if (!price || price <= 0) return 1;
  const qty = Math.floor(DEFAULT_ORDER_VALUE / price);
  return Math.max(qty, 1);
}


router.post('/signal', async (req, res) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;
  console.log("api requested");
  try {
    const {
      obs,
      closes,
      
      symbol = 'UNKNOWN',
      price = null,
      dryRun = true,
    } = req.body;

    
    try {
      if (Array.isArray(closes)) {
        const n = closes.length;
        const head = closes.slice(0, 5).map(x => Number(x).toFixed(2));
        const tail = closes.slice(-5).map(x => Number(x).toFixed(2));
        const uniqCount = new Set(closes.map(x => Number(x).toFixed(2))).size;
        logger.info(`[Signal][INPUT] ${symbol} closes n=${n} uniq=${uniqCount} head=${head.join(',')} tail=${tail.join(',')}`);
        if (n >= 2) {
          const rets = [];
          for (let i = 1; i < n; i++) {
            const prev = Number(closes[i-1]);
            const curr = Number(closes[i]);
            if (prev !== 0) rets.push((curr - prev) / prev);
          }
          if (rets.length) {
            const mean = rets.reduce((a,b)=>a+b,0)/rets.length;
            const variance = rets.reduce((a,b)=>a + Math.pow(b-mean,2),0)/rets.length;
            const std = Math.sqrt(variance);
            const zeros = rets.filter(r => Math.abs(r) < 1e-9).length;
            logger.info(`[Signal][RET_STATS] ${symbol} mean=${mean.toExponential(3)} std=${std.toExponential(3)} zeros=${zeros}/${rets.length}`);
            if (std < 1e-6) {
              logger.warn(`[Signal][RET_STATS] ${symbol} returns nearly flat; model likely to HOLD`);
            }
          }
        }
      } else if (Array.isArray(obs)) {
        const head = obs.slice(0,5).map(x => Number(x).toExponential(3));
        const tail = obs.slice(-5).map(x => Number(x).toExponential(3));
        logger.info(`[Signal][INPUT] ${symbol} obs len=${obs.length} head=${head.join(',')} tail=${tail.join(',')}`);
      }
    } catch (e) {
      logger.warn(`[Signal][INPUT] Failed to log input stats: ${e?.message || e}`);
    }

    let modelResp;
    let inputForStorage;
    let inputType;

    
    
    
    const positionFlag = 0;

    
    if (Array.isArray(closes) && closes.length >= 2) {
      
      modelResp = await modelPredictFromCloses(closes, positionFlag);
      inputForStorage = closes;
      inputType = 'closes';
    } else if (Array.isArray(obs) && obs.length === EXPECTED_OBS_LEN) {
      
      modelResp = await modelPredict(obs);
      inputForStorage = obs;
      inputType = 'obs';
    } else {
      return res.status(400).json({
        error:
          "Invalid input: provide either 'closes' (>=2 prices) or 'obs' with correct length.",
      });
    }

    const action = modelResp.action;

    
    logger.info(`[Signal][ACTION] ${symbol} → action=${action} (0=HOLD,1=BUY,2=SELL)`);

    
    const signal = action === 0 ? 'HOLD' : action === 1 ? 'BUY' : 'SELL';
    const priceVal = Number(price) || 1.0;
    const qty = computeQuantity(priceVal);

    const decisionDoc = await Decision.create({
      symbol,
      obs: inputForStorage, 
      action,
      meta: {
        modelLatencyMs: modelResp.latency_ms,
        inputType,
        positionFlag,
        signal,
        price: priceVal,
        suggestedQuantity: qty,
        createdAt: nowISO(),
      },
    });

    
    if (io) {
      io.emit('decision', {
        id: decisionDoc._id,
        symbol,
        action,
        signal,
        price: priceVal,
        suggestedQuantity: qty,
        positionFlag,
        createdAt: decisionDoc.createdAt,
      });
      logger.info(`[Signal] Decision emitted via socket: ${symbol} signal=${signal} (action=${action}) to ${io.engine.clientsCount} clients`);
    } else {
      logger.warn('[Signal] WebSocket IO not available - decision not broadcast');
    }

    
    return res.json({
      result: 'SIGNAL_GENERATED',
      signal: {
        id: decisionDoc._id,
        symbol,
        action,
        signal,
        price: priceVal,
        suggestedQuantity: qty,
        positionFlag,
        createdAt: decisionDoc.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal server error', message: err.message });
  }
});
export default router;
