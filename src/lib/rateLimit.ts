import { sql } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";

export type RateLimitOptions = {
	key: string;
	limit: number;
	windowSeconds: number;
};

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
};

function windowStartFor(now: Date, windowSeconds: number): Date {
	const ms = windowSeconds * 1000;
	return new Date(Math.floor(now.getTime() / ms) * ms);
}

export async function rateLimit(
	opts: RateLimitOptions,
): Promise<RateLimitResult> {
	const db = getDb();
	const now = new Date();
	const windowStart = windowStartFor(now, opts.windowSeconds);
	const resetAt = new Date(windowStart.getTime() + opts.windowSeconds * 1000);

	const [row] = await db
		.insert(schema.rateLimitBucket)
		.values({ key: opts.key, windowStart, count: 1 })
		.onConflictDoUpdate({
			target: [
				schema.rateLimitBucket.key,
				schema.rateLimitBucket.windowStart,
			],
			set: { count: sql`${schema.rateLimitBucket.count} + 1` },
		})
		.returning({ count: schema.rateLimitBucket.count });

	const count = row?.count ?? 1;
	return {
		allowed: count <= opts.limit,
		remaining: Math.max(0, opts.limit - count),
		resetAt,
	};
}
