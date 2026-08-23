import { createFileRoute } from "@tanstack/react-router";
import GuestbookPage from "@/src/view/guestbook/GuestbookPage";

export const Route = createFileRoute("/guestbook")({
	ssr: false,
	head: () => ({ meta: [{ title: "Guestbook — Sehal Sein" }] }),
	component: GuestbookPage,
});
