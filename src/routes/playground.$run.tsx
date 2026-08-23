import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/playground/$run")({
	beforeLoad: ({ params, search }) => {
		throw redirect({
			to: "/racer/$run",
			params: { run: params.run },
			search,
			statusCode: 301,
		});
	},
});
