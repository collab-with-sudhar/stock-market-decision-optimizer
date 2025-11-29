// server/services/modelClient.js
import axios from 'axios';
import { MODEL_SERVER_URL } from '../config.js';

const client = axios.create({
  baseURL: MODEL_SERVER_URL,
  timeout: 3000,
});

// call model-server /predict
export async function predict(obs) {
  try {
    const res = await client.post('/predict', { obs });
    return res.data; // { action, latency_ms }
  } catch (err) {
    const resp = err.response;
    const msg = resp
      ? `${resp.status} ${resp.statusText} - ${JSON.stringify(resp.data)}`
      : err.message;
    throw new Error(`Model request failed: ${msg}`);
  }
}
