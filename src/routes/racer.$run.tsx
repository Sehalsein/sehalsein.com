import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/racer/$run")({
	ssr: false,
	head: ({ params }) => {
		const seed = decodeURIComponent(params.run).toUpperCase().slice(0, 24);
		return {
			meta: [
				{ title: `${seed} — Racer — Sehal Sein` },
				{
					name: "description",
					content: `Race the generated circuit “${seed}” — same link, same track.`,
				},
			],
		};
	},
});
