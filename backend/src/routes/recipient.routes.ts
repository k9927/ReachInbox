import { Router } from "express";
import multer from "multer";
import { parseRecipients } from "../controllers/recipient.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const extension = file.originalname.toLowerCase().split(".").pop();
        if (extension === "csv" || extension === "txt") callback(null, true);
        else callback(new Error("Only .csv and .txt files are accepted"));
    }
});

const router = Router();
router.post("/parse", requireAuth, upload.single("file"), parseRecipients);
export default router;
