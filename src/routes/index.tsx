import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/src/view/home/HomePage";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Sehal Sein — engineer in Montreal" },
			{
				name: "description",
				content:
					"Engineering lead at Planned, co-founder of DGymBook, and maker of small browser experiments.",
			},
		],
	}),
	component: HomePage,
});
