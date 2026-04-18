import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let cached: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
	if (cached) return cached;
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}
	const sql = neon(process.env.DATABASE_URL);
	cached = drizzle(sql, { schema });
	return cached;
}

export { schema };

