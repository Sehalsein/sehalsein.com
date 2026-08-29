import { createFileRoute } from "@tanstack/react-router";
import NowPage from "@/src/view/now/NowPage";

export const Route = createFileRoute("/now")({
	head: () => ({
		meta: [
			{ title: "Now — Sehal Sein" },
			{
				name: "description",
				content: "What Sehal is working on, reading, and thinking about.",
			},
		],
	}),
	component: NowPage,
});
