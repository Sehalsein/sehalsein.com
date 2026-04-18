import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import NowPage from "@/src/view/now/NowPage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Now · Sehal Sein",
	description: "What Sehal is working on, reading, and thinking about.",
};

export default function Page() {
	return (
		<div className={jetbrains.variable}>
			<NowPage />
		</div>
	);
}
