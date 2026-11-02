import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseRecipientContent } from "./recipient.parser";

test("parses a header, normalizes addresses, and reports invalid and duplicate rows", () => {
    const result = parseRecipientContent("Email\r\nALex@example.com\r\nalex@example.com\r\nnot-an-email\r\n");
    assert.deepEqual(result.valid, ["alex@example.com"]);
    assert.equal(result.invalidCount, 2);
    assert.deepEqual(result.invalid.map((item) => item.reason), ["Duplicate address", "Invalid email address"]);
    assert.equal(result.invalidDetailsTruncated, false);
});

test("parses comma-separated recipient cells", () => {
    const result = parseRecipientContent('"one@example.com","two@example.com"');
    assert.deepEqual(result.valid, ["one@example.com", "two@example.com"]);
    assert.equal(result.invalidCount, 0);
});

test("rejects inputs exceeding the supported recipient count", () => {
    const content = Array.from({ length: 5001 }, (_, index) => `person${index}@example.com`).join("\n");
    assert.throws(() => parseRecipientContent(content), /maximum of 5000 valid recipients/);
});
