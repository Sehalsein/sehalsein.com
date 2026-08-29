import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/src/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handleAuth,
			POST: handleAuth,
		},
	},
});

function handleAuth({ request }: { request: Request }) {
	return getAuth().handler(request);
}
