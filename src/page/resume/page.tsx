import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import ResumePage from "@/src/view/resume/ResumePage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Resume · Sehal Sein",
	description: "Sehal Sein — Sr Software Engineer. Resume and contact info.",
};

export default function Page() {
	return (
		<div className={jetbrains.variable}>
			<ResumePage />
		</div>
	);
}
