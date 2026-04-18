import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { Filter } from "bad-words";
import { getAuth } from "@/src/lib/auth";
import { getDb, schema } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/rateLimit";

export const runtime = "nodejs";

const MESSAGE_MAX = 200;

export type GuestbookEntryDTO = {
	id: string;
	githubLogin: string;
	avatarUrl: string;
	message: string;
	createdAt: string;
};

export async function GET() {
	const db = getDb();
	const rows = await db
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

	const dto: GuestbookEntryDTO[] = rows.map((r) => ({
		id: r.id,
		githubLogin: r.githubLogin,
		avatarUrl: r.avatarUrl,
		message: r.message,
		createdAt: r.createdAt.toISOString(),
	}));
	return NextResponse.json(dto);
}

export async function POST(req: Request) {
	const auth = getAuth();
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session) {
		return NextResponse.json({ error: "not signed in" }, { status: 401 });
	}

	const body = await req.json().catch(() => ({}));
	const message = typeof body?.message === "string" ? body.message.trim() : "";
	if (!message) {
		return NextResponse.json({ error: "empty message" }, { status: 400 });
	}
	if (message.length > MESSAGE_MAX) {
		return NextResponse.json(
			{ error: `message must be <= ${MESSAGE_MAX} chars` },
			{ status: 400 },
		);
	}

	const filter = new Filter();
	if (filter.isProfane(message)) {
		return NextResponse.json(
			{ error: "keep it friendly. rejected for language." },
			{ status: 400 },
		);
	}

	const limit = await rateLimit({
		key: `guestbook:post:${session.user.id}`,
		limit: 1,
		windowSeconds: 60 * 60 * 24,
	});
	if (!limit.allowed) {
		return NextResponse.json(
			{ error: "only 1 entry per 24h. come back tomorrow." },
			{ status: 429 },
		);
	}

	const githubLogin =
		(session.user as { githubLogin?: string | null }).githubLogin ??
		session.user.name ??
		"anonymous";
	const avatarUrl = session.user.image ?? "";

	const db = getDb();
	const [row] = await db
		.insert(schema.guestbookEntry)
		.values({
			userId: session.user.id,
			githubLogin,
			avatarUrl,
			message,
		})
		.returning();

	return NextResponse.json({
		id: row.id,
		githubLogin: row.githubLogin,
		avatarUrl: row.avatarUrl,
		message: row.message,
		createdAt: row.createdAt.toISOString(),
	});
}

export async function DELETE(req: Request) {
	const auth = getAuth();
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session) {
		return NextResponse.json({ error: "not signed in" }, { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const id = searchParams.get("id");
	if (!id) {
		return NextResponse.json({ error: "missing id" }, { status: 400 });
	}

	const db = getDb();
	const [row] = await db
		.select({
			id: schema.guestbookEntry.id,
			userId: schema.guestbookEntry.userId,
		})
		.from(schema.guestbookEntry)
		.where(eq(schema.guestbookEntry.id, id))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "not found" }, { status: 404 });
	}

	const isOwner = row.userId === session.user.id;
	const userLogin = (session.user as { githubLogin?: string | null })
		.githubLogin;
	const isAdmin =
		!!process.env.ADMIN_USER_NAME &&
		userLogin === process.env.ADMIN_USER_NAME;

	if (!isOwner && !isAdmin) {
		return NextResponse.json({ error: "forbidden" }, { status: 403 });
	}

	await db
		.delete(schema.guestbookEntry)
		.where(eq(schema.guestbookEntry.id, id));

	return NextResponse.json({ ok: true });
}
