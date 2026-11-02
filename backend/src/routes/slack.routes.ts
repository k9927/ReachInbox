import { Router } from "express";
import { disconnectSlack, getSlackStatus, listSlackChannels, setSlackChannel, slackCallback, startSlackOAuth } from "../controllers/slack.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.get("/callback", slackCallback);
router.use(requireAuth);
router.get("/connect", startSlackOAuth);
router.get("/status", getSlackStatus);
router.get("/channels", listSlackChannels);
router.put("/channel", setSlackChannel);
router.delete("/disconnect", disconnectSlack);
export default router;
