import { JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import type { Metadata } from "next";
import ConsentPage from "@/src/view/consent/ConsentPage";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Consent · Sehal Sein",
	description: "Authorize an OAuth client.",
};

export default function Page() {
	return (
		<div className={jetbrains.variable}>
			<Suspense>
				<ConsentPage />
			</Suspense>
		</div>
	);
}
