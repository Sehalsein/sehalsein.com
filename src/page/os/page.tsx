"use client";

import { JetBrains_Mono } from "next/font/google";
import OSShell from "@/src/view/os/OSShell";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export default function OSPage() {
	return (
		<div className={jetbrains.className}>
			<OSShell />
		</div>
	);
}
