import { Router } from "express";
import { listEmails } from "../controllers/email-list.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.get("/scheduled", requireAuth, listEmails);
router.get("/sent", requireAuth, listEmails);
export default router;
