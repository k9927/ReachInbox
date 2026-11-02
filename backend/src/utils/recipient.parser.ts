import { parse } from "csv-parse/sync";
import { z } from "zod";

const emailSchema = z.string().email();
export const MAX_RECIPIENTS = 5000;

export function parseRecipientContent(content: string) {
    const text = content.replace(/^\uFEFF/, "");
    const rows = parse(text, {
        bom: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        record_delimiter: ["\r\n", "\n", "\r"],
        max_record_size: 100_000
    }) as string[][];
    if (rows.length > 10_000) throw new Error("A maximum of 10,000 input rows is allowed");

    const valid: string[] = [];
    const invalid: Array<{ row: number; value: string; reason: string }> = [];
    const seen = new Set<string>();
    let invalidCount = 0;
    for (let index = 0; index < rows.length; index++) {
        for (const cell of rows[index]) {
            const value = cell.trim().replace(/^['"]|['"]$/g, "").trim();
            if (!value) continue;
            if (/^(e-?mail|emails|recipient|recipients)$/i.test(value) && index === 0) continue;
            const normalized = value.toLowerCase();
            if (!emailSchema.safeParse(normalized).success) {
                invalidCount++;
                if (invalid.length < 100) invalid.push({ row: index + 1, value: value.slice(0, 320), reason: "Invalid email address" });
            } else if (seen.has(normalized)) {
                invalidCount++;
                if (invalid.length < 100) invalid.push({ row: index + 1, value: value.slice(0, 320), reason: "Duplicate address" });
            } else {
                seen.add(normalized);
                valid.push(normalized);
                if (valid.length > MAX_RECIPIENTS) throw new Error(`A maximum of ${MAX_RECIPIENTS} valid recipients is allowed`);
            }
        }
    }
    return { valid, invalid, invalidCount, invalidDetailsTruncated: invalidCount > invalid.length };
}
