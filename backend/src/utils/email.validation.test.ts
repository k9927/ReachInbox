import { strict as assert } from "node:assert";
import { test } from "node:test";
import { scheduleEmailSchema } from "./email.validation";

const validRequest = {
    senderId: "6f627d9f-eaf5-48de-97d2-94985cf7d8b6",
    subject: "Hello",
    body: "A short note",
    recipients: ["recipient@example.com"],
    startAt: "2030-01-01T10:00:00.000Z",
    delayMs: 2000,
    hourlyLimit: 30
};

test("accepts a well-formed schedule request without client-controlled userId", () => {
    assert.equal(scheduleEmailSchema.safeParse(validRequest).success, true);
});

test("rejects duplicate recipient addresses and delays below the safe minimum", () => {
    assert.equal(scheduleEmailSchema.safeParse({ ...validRequest, recipients: ["a@example.com", "a@example.com"] }).success, false);
    assert.equal(scheduleEmailSchema.safeParse({ ...validRequest, delayMs: 1000 }).success, false);
});
