import { createFileRoute } from "@tanstack/react-router";
import ConsentPage from "@/src/view/consent/ConsentPage";

export const Route = createFileRoute("/consent")({
	ssr: false,
	head: () => ({ meta: [{ title: "Consent — Sehal Sein" }] }),
	component: ConsentPage,
});
