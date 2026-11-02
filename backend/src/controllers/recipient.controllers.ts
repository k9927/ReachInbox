import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { parseRecipientContent } from "../utils/recipient.parser";

export function parseRecipients(req: AuthenticatedRequest, res: Response) {
    if (!req.file) return res.status(400).json({ success: false, message: "Upload a .csv or .txt file" });
    try {
        const result = parseRecipientContent(req.file.buffer.toString("utf8"));
        return res.json({
            success: true,
            validCount: result.valid.length,
            invalidCount: result.invalidCount,
            invalidDetailsTruncated: result.invalidDetailsTruncated,
            valid: result.valid,
            invalid: result.invalid
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "The file could not be parsed as CSV or text";
        return res.status(message.startsWith("A maximum") ? 413 : 400).json({ success: false, message });
    }
}
