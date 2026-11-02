
import { redisConnection } from "../config/redis";

interface RateLimitResult {
    allowed: boolean;
    retryAt?: number;
    reason?: "HOURLY_LIMIT" | "MINIMUM_DELAY";
}

const RATE_LIMIT_SCRIPT = `
local lastKey = KEYS[1]
local senderRatePrefix = KEYS[2]
local campaignRatePrefix = KEYS[3]

local senderLimit = tonumber(ARGV[1])
local campaignLimit = tonumber(ARGV[2])
local minDelay = tonumber(ARGV[3])

local time = redis.call("TIME")
local now = tonumber(time[1]) * 1000
    + math.floor(tonumber(time[2]) / 1000)

local hour = math.floor(now / 3600000)
local senderRateKey = senderRatePrefix .. hour
local campaignRateKey = campaignRatePrefix .. hour

local senderCount = tonumber(redis.call("GET", senderRateKey) or "0")
local campaignCount = tonumber(redis.call("GET", campaignRateKey) or "0")

if senderCount >= senderLimit or campaignCount >= campaignLimit then
    return {0, (hour + 1) * 3600000, 1}
end

local lastSend = tonumber(redis.call("GET", lastKey) or "0")

if lastSend > 0 and now - lastSend < minDelay then
    return {0, lastSend + minDelay, 2}
end

redis.call("INCR", senderRateKey)
redis.call("EXPIRE", senderRateKey, 7200)
redis.call("INCR", campaignRateKey)
redis.call("EXPIRE", campaignRateKey, 7200)

redis.call("SET", lastKey, now, "PX", 7200000)

return {1, now, 0}
`;

export async function reserveEmailSlot(
    senderId: string,
    senderLimitPerHour: number,
    campaignId: string,
    campaignLimitPerHour: number,
    minDelayMs: number
): Promise<RateLimitResult> {

    const lastKey = `email:last-send:${senderId}`;
    const senderRatePrefix = `email:rate:sender:${senderId}:`;
    const campaignRatePrefix = `email:rate:campaign:${senderId}:${campaignId}:`;

    const result = await redisConnection.eval(
        RATE_LIMIT_SCRIPT,
        3,
        lastKey,
        senderRatePrefix,
        campaignRatePrefix,
        senderLimitPerHour,
        campaignLimitPerHour,
        minDelayMs
    ) as number[];

    const [allowed, retryAt, reason] = result;

    if (allowed === 1) {
        return { allowed: true };
    }

    return {
        allowed: false,
        retryAt,
        reason: reason === 1 ? "HOURLY_LIMIT" : "MINIMUM_DELAY"
    };
}
