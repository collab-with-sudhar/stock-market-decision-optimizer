// server/index.js
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';

import signalRouter from './routes/signal.js';

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_rl';

// logger
const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info(`Connected to MongoDB at ${MONGO_URI}`);
  } catch (err) {
    logger.error('MongoDB connection failed: ' + err.message);
    process.exit(1);
  }

  const app = express();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  app.locals.io = io;
  app.locals.logger = logger;

  app.use(cors());
  app.use(express.json());

  app.get('/', (_, res) => {
    res.send({ status: 'backend ok' });
  });

  app.use('/api', signalRouter);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  server.listen(PORT, () => {
    logger.info(`Backend listening on http://0.0.0.0:${PORT}`);
  });
}

start();
