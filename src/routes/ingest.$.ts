import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ingest/$")({
	server: {
		handlers: {
			GET: proxyPostHog,
			POST: proxyPostHog,
		},
	},
});

function proxyPostHog({ request, params }: { request: Request; params: { _splat?: string } }) {
	const path = params._splat ?? "";
	const upstream = path.startsWith("static/") || path.startsWith("array/")
		? "https://us-assets.i.posthog.com"
		: "https://us.i.posthog.com";
	const source = new URL(request.url);
	const target = new URL(`/${path}${source.search}`, upstream);
	return fetch(new Request(target, request));
}
