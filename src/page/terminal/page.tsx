"use client";

import { JetBrains_Mono } from "next/font/google";
import Terminal from "@/src/view/terminal/TerminalPage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export default function TerminalPage() {
	return (
		<div className={`${jetbrains.className} h-screen w-screen`}>
			<Terminal />
		</div>
	);
}
