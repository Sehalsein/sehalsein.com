import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import GuestbookPage from "@/src/view/guestbook/GuestbookPage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Guestbook · Sehal Sein",
	description: "Leave a one-liner.",
};

export default function Page() {
	return (
		<div className={jetbrains.variable}>
			<GuestbookPage />
		</div>
	);
}
