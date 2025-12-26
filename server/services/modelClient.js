
import axios from 'axios';
import { MODEL_SERVER_URL } from '../config.js';

const client = axios.create({
  baseURL: MODEL_SERVER_URL,
  timeout: 3000,
});


export async function predict(obs) {
  try {
    const res = await client.post('/predict', { obs });
    return res.data; 
  } catch (err) {
    const resp = err.response;
    const msg = resp
      ? `${resp.status} ${resp.statusText} - ${JSON.stringify(resp.data)}`
      : err.message;
    throw new Error(`Model request failed: ${msg}`);
  }
}
export async function predictFromCloses(closes, position = 0) {
  try {
    const res = await client.post('/predict_from_closes', { closes, position });
    return res.data; 
  } catch (err) {
    const resp = err.response;
    const msg = resp
      ? `${resp.status} ${resp.statusText} - ${JSON.stringify(resp.data)}`
      : err.message;
    throw new Error(`Model request (from_closes) failed: ${msg}`);
  }
}