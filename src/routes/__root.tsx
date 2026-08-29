import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../../app/globals.css?url";
import faviconUrl from "../../app/favicon.ico?url";
import ThemeProvider from "@/src/view/ThemeProvider";
import Analytics from "@/src/view/Analytics";

const restorePreferences = `
try {
  var palette = localStorage.getItem('terminal-palette') || 'default';
  document.documentElement.dataset.palette = palette;
  var homeLayout = localStorage.getItem('home-layout') || 'readme';
  if (homeLayout === 'readme' || homeLayout === 'sketch') {
    document.documentElement.dataset.homeLayout = homeLayout;
  }
} catch (_) {}
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title: "Sehal Sein — Engineering Lead & Builder",
			},
			{
				name: "description",
				content:
					"Engineering lead building ambitious products, scalable systems, and occasionally entire worlds in the browser.",
			},
			{ name: "theme-color", content: "#0b0d0c" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: faviconUrl },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&family=Patrick+Hand&family=Pirata+One&family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
			},
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: restorePreferences }} />
			</head>
			<body className="bg-term-bg text-term-ink">
				<ThemeProvider>
					{children}
					<Analytics />
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}

function NotFound() {
	return (
		<main className="grid min-h-screen place-items-center bg-term-bg px-6 text-term-ink">
			<div className="font-mono text-center">
				<p className="mb-3 text-xs uppercase tracking-[0.2em] text-term-faint">
					404 / lost process
				</p>
				<a className="text-term-blue hover:underline" href="/">
					← return home
				</a>
			</div>
		</main>
	);
}
