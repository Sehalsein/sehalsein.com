import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/src/view/home/HomePage";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Sehal Sein — engineer in Montreal" },
			{
				name: "description",
				content:
					"Engineer in Montreal. I build Strata, Finn, and DGymBook, plus a drawer full of browser experiments.",
			},
		],
	}),
	component: HomePage,
});
