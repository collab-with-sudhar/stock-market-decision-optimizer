import { io } from "socket.io-client";

export const socket = io("https://api.nix-ai.dev", {
  transports: ["websocket"],
});
