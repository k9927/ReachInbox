import { strict as assert } from "node:assert";
import { test } from "node:test";

test("SMTP and Slack tokens encrypt and decrypt with authenticated encryption", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const { decryptToken, encryptToken } = await import("../services/token-encryption.service");
    const secret = "smtp-user:secret-value";
    const encrypted = encryptToken(secret);
    assert.notEqual(encrypted, secret);
    assert.equal(decryptToken(encrypted), secret);
    const parts = encrypted.split(":");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    const altered = parts.join(":");
    assert.throws(() => decryptToken(altered));
});
