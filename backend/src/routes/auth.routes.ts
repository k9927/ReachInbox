import { Router } from "express";
import { getCurrentUser, googleCallback, logout, startGoogleAuth } from "../controllers/auth.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", logout);
export default router;
