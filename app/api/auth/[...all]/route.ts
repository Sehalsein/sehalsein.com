import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

async function handle(req: Request) {
	return getAuth().handler(req);
}

export { handle as GET, handle as POST };
