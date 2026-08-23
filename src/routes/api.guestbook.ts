import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { Filter } from "bad-words";
import { getAuth } from "@/src/lib/auth";
import { getDb, schema } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/rateLimit";
import type { GuestbookEntryDTO } from "@/src/types/api";

const MESSAGE_MAX = 200;

export const Route = createFileRoute("/api/guestbook")({
	server: {
		handlers: {
			GET: getEntries,
			POST: createEntry,
			DELETE: deleteEntry,
		},
	},
});

async function getEntries() {
	const rows = await getDb()
		.select({
			id: schema.guestbookEntry.id,
			githubLogin: schema.guestbookEntry.githubLogin,
			avatarUrl: schema.guestbookEntry.avatarUrl,
			message: schema.guestbookEntry.message,
			createdAt: schema.guestbookEntry.createdAt,
		})
		.from(schema.guestbookEntry)
		.orderBy(desc(schema.guestbookEntry.createdAt))
		.limit(100);

	const entries: GuestbookEntryDTO[] = rows.map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	}));
	return Response.json(entries);
}

async function createEntry({ request }: { request: Request }) {
	const session = await getAuth().api.getSession({ headers: request.headers });
	if (!session) return Response.json({ error: "not signed in" }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const message = typeof body?.message === "string" ? body.message.trim() : "";
	if (!message) return Response.json({ error: "empty message" }, { status: 400 });
	if (message.length > MESSAGE_MAX) {
		return Response.json(
			{ error: `message must be <= ${MESSAGE_MAX} chars` },
			{ status: 400 },
		);
	}
	if (new Filter().isProfane(message)) {
		return Response.json(
			{ error: "keep it friendly. rejected for language." },
			{ status: 400 },
		);
	}

	const limit = await rateLimit({
		key: `guestbook:post:${session.user.id}`,
		limit: 1,
		windowSeconds: 86_400,
	});
	if (!limit.allowed) {
		return Response.json(
			{ error: "only 1 entry per 24h. come back tomorrow." },
			{ status: 429 },
		);
	}

	const githubLogin =
		(session.user as { githubLogin?: string | null }).githubLogin ??
		session.user.name ??
		"anonymous";
	const [row] = await getDb()
		.insert(schema.guestbookEntry)
		.values({
			userId: session.user.id,
			githubLogin,
			avatarUrl: session.user.image ?? "",
			message,
		})
		.returning();

	return Response.json({
		id: row.id,
		githubLogin: row.githubLogin,
		avatarUrl: row.avatarUrl,
		message: row.message,
		createdAt: row.createdAt.toISOString(),
	} satisfies GuestbookEntryDTO);
}

async function deleteEntry({ request }: { request: Request }) {
	const session = await getAuth().api.getSession({ headers: request.headers });
	if (!session) return Response.json({ error: "not signed in" }, { status: 401 });

	const id = new URL(request.url).searchParams.get("id");
	if (!id) return Response.json({ error: "missing id" }, { status: 400 });

	const [row] = await getDb()
		.select({ id: schema.guestbookEntry.id, userId: schema.guestbookEntry.userId })
		.from(schema.guestbookEntry)
		.where(eq(schema.guestbookEntry.id, id))
		.limit(1);
	if (!row) return Response.json({ error: "not found" }, { status: 404 });

	const userLogin = (session.user as { githubLogin?: string | null }).githubLogin;
	const isAdmin = !!process.env.ADMIN_USER_NAME && userLogin === process.env.ADMIN_USER_NAME;
	if (row.userId !== session.user.id && !isAdmin) {
		return Response.json({ error: "forbidden" }, { status: 403 });
	}

	await getDb().delete(schema.guestbookEntry).where(eq(schema.guestbookEntry.id, id));
	return Response.json({ ok: true });
}
