
import { v4 as uuidv4 } from 'uuid';



export async function placeOrder({ symbol, side, quantity, price, meta = {} } = {}) {
  const orderId = 'DRY-' + uuidv4();
  const placedAt = new Date().toISOString();

  const result = {
    orderId,
    symbol,
    side,
    quantity,
    price,
    status: 'FILLED',
    placedAt,
    filledAt: placedAt,
    raw: { dryRun: true, meta },
  };

  
  await new Promise((resolve) => setTimeout(resolve, 150));
  return result;
}
