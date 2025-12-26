import express from "express";
import {
  getAccount,
  createOrder,
  getOrders,
  getPositions,
  getPortfolio,
  resetAccount,
  getPortfolioSummary,
  getTradeHistory
} from "../controllers/tradingController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();


router.get("/account", isAuthenticatedUser, getAccount);
router.post("/account/reset", isAuthenticatedUser, resetAccount);


router.post("/orders", isAuthenticatedUser, createOrder);
router.get("/orders", isAuthenticatedUser, getOrders);


router.get("/positions", isAuthenticatedUser, getPositions);


router.get("/portfolio", isAuthenticatedUser, getPortfolio);
router.get("/portfolio/summary", isAuthenticatedUser, getPortfolioSummary);


router.get("/trades", isAuthenticatedUser, getTradeHistory);

export default router;
