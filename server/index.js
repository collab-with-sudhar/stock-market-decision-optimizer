
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';

import signalRouter from './routes/signal.js';
import monitorRouter from './routes/monitor.js';
import authRouter from './routes/auth.js';
import tradingRouter from './routes/trading.js';
import marketRouter from './routes/market.js';

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_rl';


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
    cors: { origin: "http://localhost:5173" },
    credentials: true,
  });

  app.locals.io = io;
  app.locals.logger = logger;

  app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/', (_, res) => {
    res.send({ status: 'backend ok' });
  });

  app.use('/api', authRouter);
  app.use('/api', signalRouter);
  app.use('/api', monitorRouter);
  app.use('/api/trading', tradingRouter);
  app.use('/api/market', marketRouter);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  
  app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    });
  });

  server.listen(PORT, () => {
    logger.info(`Backend listening on http://0.0.0.0:${PORT}`);
  });
}

start();
