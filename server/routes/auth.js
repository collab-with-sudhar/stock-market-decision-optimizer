import express from "express";
import { 
  registerUser, 
  loginUser, 
  logout, 
  getUserDetails,
  updateProfile, 
  forgotPassword,
  resetPassword
} from "../controllers/userController.js";
import { isAuthenticatedUser, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/logout', logout);
router.get('/auth/me', isAuthenticatedUser, getUserDetails);
router.put('/auth/profile', isAuthenticatedUser, updateProfile);
router.post("/auth/password/forgot", forgotPassword);
router.put("/auth/password/reset/:token", resetPassword);


router.get("/admin", isAuthenticatedUser, authorizeRoles("admin"), (req, res) => {
  res.json({ success: true, message: "Admin Route Access Granted" });
});

export default router;
