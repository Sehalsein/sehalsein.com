import { createFileRoute } from "@tanstack/react-router";
import AIPage from "@/src/view/ai/AIPage";

export const Route = createFileRoute("/ai")({
	head: () => ({
		meta: [
			{ title: "Talk to Sol — Sehal Sein" },
			{
				name: "description",
				content:
					"Meet Sol, Sehal Sein's AI portfolio guide. Ask about his work, experience, projects, and approach to engineering.",
			},
		],
	}),
	component: AIPage,
});
