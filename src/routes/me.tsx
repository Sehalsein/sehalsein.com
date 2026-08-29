import { createFileRoute } from "@tanstack/react-router";
import MePage from "@/src/view/me/MePage";

export const Route = createFileRoute("/me")({
	ssr: false,
	head: () => ({ meta: [{ title: "Me — Sehal Sein" }] }),
	component: () => <MePage availablePoses={[]} />,
});
