import type { Metadata } from "next";
import DoomPage from "@/src/view/doom/DoomPage";

export const metadata: Metadata = {
	title: "doom — sehal sein",
	description:
		"A software-rendered first-person shooter in the browser: raycast walls, billboarded sprites, and every texture, sound and animation generated at boot from a seed.",
};

export default function Page() {
	return <DoomPage />;
}
