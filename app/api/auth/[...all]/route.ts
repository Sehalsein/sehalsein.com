import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

async function handle(req: Request) {
	const res = await getAuth().handler(req);

	if (!res.ok) {
		try {
			const url = new URL(req.url);
			const cloned = res.clone();
			const body = await cloned.text();
			console.error(
				`[better-auth:${res.status}] ${req.method} ${url.pathname}${url.search} → ${body.slice(0, 800)}`,
			);
		} catch {
			// ignore
		}
	}

	return res;
}

export { handle as GET, handle as POST };
