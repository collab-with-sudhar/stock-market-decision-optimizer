import { io } from "socket.io-client";

export const socket = io("https://meetup-print-jpg-exist.trycloudflare.com", {
  transports: ["websocket"],
});
