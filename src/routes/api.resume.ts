import { createFileRoute } from "@tanstack/react-router";
import { RESUME_DATA } from "@/src/data/resume";

export type ResumeType = typeof RESUME_DATA;

export const Route = createFileRoute("/api/resume")({
	server: {
		handlers: {
			GET: () => Response.json(RESUME_DATA),
		},
	},
});
