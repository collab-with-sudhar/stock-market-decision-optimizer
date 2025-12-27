import axios from "axios";

const api = axios.create({
  baseURL: "https://api.nix-ai.dev/api",
  timeout: 5000,
});

export const fetchPositions = () => api.get("/positions").then(r => r.data);
export const fetchTrades = () => api.get("/trades").then(r => r.data);
export const placePaperTrade = (payload) =>
  api.post("/trade", payload).then(r => r.data);

export default api;
