import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import HomePage from "@/src/view/home/HomePage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Sehal Sein — Senior Software Engineer",
	description:
		"Sehal Sein's personal site — terminal, desktop OS, resume, and a few small experiments. Based in Montreal.",
};

export default function Page() {
	return (
		<div className={jetbrains.className}>
			<HomePage />
		</div>
	);
}
