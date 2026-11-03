import { strict as assert } from "node:assert";
import { test } from "node:test";

test("calculates the exact next hour boundary for rate-limit rescheduling", () => {
    // 2026-11-03T10:15:30.000Z
    const timestamp = new Date("2026-11-03T10:15:30.000Z").getTime();
    const hour = Math.floor(timestamp / 3_600_000);
    const nextHourTimestamp = (hour + 1) * 3_600_000;
    const nextHourDate = new Date(nextHourTimestamp);

    assert.equal(nextHourDate.toISOString(), "2026-11-03T11:00:00.000Z");
    assert.ok(nextHourTimestamp > timestamp);
    assert.equal(nextHourTimestamp - timestamp, (44 * 60 + 30) * 1000);
});

test("calculates correct staggered schedule timestamps for recipients", () => {
    const startAt = new Date("2026-11-03T12:00:00.000Z").getTime();
    const delayMs = 5000;
    const recipients = ["user1@test.com", "user2@test.com", "user3@test.com"];

    const scheduleTimes = recipients.map((_, index) => new Date(startAt + index * delayMs).toISOString());

    assert.deepEqual(scheduleTimes, [
        "2026-11-03T12:00:00.000Z",
        "2026-11-03T12:00:05.000Z",
        "2026-11-03T12:00:10.000Z"
    ]);
});

test("enforces safe minimum throttle delay floor", () => {
    const MIN_SAFE_DELAY = 2000;
    const requestedDelay1 = 500;
    const requestedDelay2 = 5000;

    assert.equal(Math.max(requestedDelay1, MIN_SAFE_DELAY), 2000);
    assert.equal(Math.max(requestedDelay2, MIN_SAFE_DELAY), 5000);
});

