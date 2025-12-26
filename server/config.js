

const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://127.0.0.1:8001';
export const EXPECTED_OBS_LEN = toNumber(process.env.EXPECTED_OBS_LEN, 21);

export const ACCOUNT_SIZE = toNumber(process.env.ACCOUNT_SIZE, 100000);
export const DEFAULT_ORDER_VALUE = toNumber(process.env.DEFAULT_ORDER_VALUE, 5000);
export const MAX_POSITION_PCT = toNumber(process.env.MAX_POSITION_PCT, 0.1);
export const MIN_TIME_BETWEEN_TRADES_SECS = toNumber(
  process.env.MIN_TIME_BETWEEN_TRADES_SECS,
  60
);
export const MAX_TRADES_PER_DAY = toNumber(process.env.MAX_TRADES_PER_DAY, 50);
