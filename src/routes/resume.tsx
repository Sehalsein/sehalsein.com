import { createFileRoute } from "@tanstack/react-router";
import ResumePage, { metadata } from "@/src/page/resume/page";

export const Route = createFileRoute("/resume")({
	head: () => ({
		meta: [
			{ title: metadata.title },
			{ name: "description", content: metadata.description },
		],
	}),
	component: ResumePage,
});
