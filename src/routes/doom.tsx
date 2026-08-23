import { createFileRoute } from "@tanstack/react-router";
import DoomPage from "@/src/view/doom/DoomPage";

export const Route = createFileRoute("/doom")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Doom — Sehal Sein" },
			{
				name: "description",
				content: "A software-rendered first-person shooter in the browser.",
			},
		],
	}),
	component: DoomPage,
});
