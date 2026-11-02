
import { Router } from "express";
import { scheduleEmails } from "../controllers/email.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/schedule", requireAuth, scheduleEmails);

export default router;
