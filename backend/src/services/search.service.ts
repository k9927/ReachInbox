import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

const INDEX = "reachinbox-emails";
const client = env.ELASTICSEARCH_NODE
    ? new Client({ node: env.ELASTICSEARCH_NODE, ...(env.ELASTICSEARCH_API_KEY ? { auth: { apiKey: env.ELASTICSEARCH_API_KEY } } : {}) })
    : null;
let indexReady: Promise<void> | undefined;

export function isSearchConfigured(): boolean {
    return Boolean(client);
}

async function ensureIndex() {
    if (!client) throw new Error("Elasticsearch is not configured");
    if (!indexReady) {
        indexReady = (async () => {
            const exists = await client.indices.exists({ index: INDEX });
            if (!exists) {
                try {
                    await client.indices.create({
                        index: INDEX,
                        mappings: {
                            properties: {
                                userId: { type: "keyword" },
                                status: { type: "keyword" },
                                recipient: {
                                    type: "text",
                                    fields: { keyword: { type: "keyword" } }
                                },
                                senderEmail: {
                                    type: "text",
                                    fields: { keyword: { type: "keyword" } }
                                },
                                subject: { type: "text" },
                                body: { type: "text" },
                                scheduledAt: { type: "date" },
                                sentAt: { type: "date" }
                            }
                        }
                    });
                } catch (error) {
                    const alreadyExists = typeof error === "object" && error !== null &&
                        (("message" in error && String((error as { message: unknown }).message).includes("resource_already_exists_exception")) ||
                         ("meta" in error && String((error as { meta?: { body?: unknown } }).meta?.body ?? "").includes("resource_already_exists_exception")));
                    if (!alreadyExists) throw error;
                }
            }
        })().catch((error) => {
            indexReady = undefined;
            throw error;
        });
    }
    await indexReady;
}

export async function indexEmailDocument(data: {
    id: string; userId: string; status: string; recipient: string; senderEmail: string;
    subject: string; body?: string; scheduledAt: Date; sentAt: Date | null;
}) {
    if (!client) return;
    await ensureIndex();
    await client.index({ index: INDEX, id: data.id, document: data, refresh: "wait_for" });
}

export async function indexEmailDocuments(data: Array<{
    id: string; userId: string; status: string; recipient: string; senderEmail: string;
    subject: string; body?: string; scheduledAt: Date; sentAt: Date | null;
}>) {
    if (!client || !data.length) return;
    await ensureIndex();
    const operations = data.flatMap(({ id, ...document }) => [
        { index: { _index: INDEX, _id: id } },
        document
    ]);
    const result = await client.bulk({ operations, refresh: false });
    if (result.errors) throw new Error("One or more emails could not be indexed");
}

export async function refreshEmailIndex() {
    if (!client) return;
    await ensureIndex();
    await client.indices.refresh({ index: INDEX });
}

export async function closeSearchClient() {
    await client?.close();
}

export async function searchEmailIds(userId: string, statuses: string[], query: string, page: number, pageSize: number) {
    await ensureIndex();
    const result = await client!.search({
        index: INDEX,
        from: (page - 1) * pageSize,
        size: pageSize,
        track_total_hits: true,
        query: {
            bool: {
                filter: [{ term: { userId } }, { terms: { status: statuses } }],
                must: [{
                    multi_match: {
                        query,
                        fields: [
                            "recipient",
                            "recipient.keyword",
                            "senderEmail",
                            "senderEmail.keyword",
                            "subject^2",
                            "body"
                        ],
                        type: "best_fields",
                        operator: "or"
                    }
                }]
            }
        }
    });
    return {
        ids: result.hits.hits.flatMap((hit) => hit._id ? [hit._id] : []),
        total: typeof result.hits.total === "number" ? result.hits.total : result.hits.total?.value ?? 0
    };
}
