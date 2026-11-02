import { ErrorRequestHandler } from "express";
import multer from "multer";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof multer.MulterError) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Recipient file must be 2 MB or smaller" : "Invalid file upload" });
    }
    if (error instanceof SyntaxError && "body" in error) {
        return res.status(400).json({ success: false, message: "Malformed JSON request body" });
    }
    if (error instanceof Error && error.message === "Only .csv and .txt files are accepted") {
        return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Unhandled API error", error instanceof Error ? error.name : "unknown error");
    return res.status(500).json({ success: false, message: "An unexpected server error occurred" });
};
