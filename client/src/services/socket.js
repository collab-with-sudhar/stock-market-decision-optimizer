import { io } from "socket.io-client";

export const socket = io("https://hawaiian-stones-jersey-cookbook.trycloudflare.com", {
  transports: ["websocket"],
});
