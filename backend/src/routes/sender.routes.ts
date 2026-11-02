import { Router } from "express";
import { createSender, deleteSender, listSenders } from "../controllers/sender.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth);
router.get("/", listSenders);
router.post("/", createSender);
router.delete("/:id", deleteSender);
export default router;
