import { Client } from "@elastic/elasticsearch";
import IORedis from "ioredis";
import { prisma } from "../config/database";
import { env } from "../config/env";

async function main() {
    let redis: IORedis | undefined;
    let redisConfigValid = true;
    try {
        if (env.REDIS_URL) {
            const parsed = new URL(env.REDIS_URL);
            if (!["redis:", "rediss:"].includes(parsed.protocol) || !parsed.hostname || !parsed.port || !parsed.username || !parsed.password) {
                throw new Error("Invalid Redis URL configuration");
            }
            redis = new IORedis(env.REDIS_URL, { connectTimeout: 5000, maxRetriesPerRequest: 1, retryStrategy: () => null });
        } else {
            redis = new IORedis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD,
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null
        });
        }
        redis.on("error", () => undefined);
    } catch {
        redisConfigValid = false;
    }
    const elastic = env.ELASTICSEARCH_NODE
        ? new Client({ node: env.ELASTICSEARCH_NODE, ...(env.ELASTICSEARCH_API_KEY ? { auth: { apiKey: env.ELASTICSEARCH_API_KEY } } : {}) })
        : null;
    const checks: Array<[string, () => Promise<unknown>]> = [
        ["PostgreSQL", () => prisma.$queryRaw`SELECT 1`],
        ["Redis", () => {
            if (!redisConfigValid || !redis) throw new Error("InvalidRedisConfig");
            return redis.ping();
        }]
    ];
    let failed = false;
    try {
        for (const [name, check] of checks) {
            try {
                await check();
                process.stdout.write(`${name}: ready\n`);
            } catch {
                failed = true;
                process.stdout.write(`${name}: ${name === "Redis" && !redisConfigValid ? "invalid REDIS_URL configuration" : "unavailable"}\n`);
            }
        }
        if (!elastic) {
            process.stdout.write("Elasticsearch: not configured (email search unavailable)\n");
        } else {
            try {
                await elastic.ping();
                process.stdout.write("Elasticsearch: ready\n");
            } catch {
                failed = true;
                process.stdout.write("Elasticsearch: unavailable\n");
            }
        }
    } finally {
        await Promise.allSettled([
            prisma.$disconnect(),
            elastic?.close() ?? Promise.resolve()
        ]);
        redis?.disconnect();
    }
    if (failed) process.exitCode = 1;
}

void main().catch((error) => {
    process.stderr.write(`Service check failed: ${error instanceof Error ? error.name : "unknown error"}\n`);
    process.exitCode = 1;
});
