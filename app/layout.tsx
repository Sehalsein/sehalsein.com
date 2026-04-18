import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import ThemeProvider from "@/src/view/ThemeProvider";

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

export const metadata: Metadata = {
	title: "Sehal Sein",
	description:
		"Software Engineer with hands-on experience in building real world react application and web services.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="bg-term-bg text-term-ink">
				<ThemeProvider>
					<main>{children}</main>
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
