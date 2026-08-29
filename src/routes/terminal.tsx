import { createFileRoute } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";

const loadTerminalPage = createClientOnlyFn(
	() => import("@/src/view/terminal/TerminalPage"),
);
const TerminalPage = lazy(loadTerminalPage);

export const Route = createFileRoute("/terminal")({
	ssr: false,
	head: () => ({ meta: [{ title: "Terminal — Sehal Sein" }] }),
	component: TerminalRoute,
});

function TerminalRoute() {
	return (
		<div className="h-screen w-screen font-mono">
			<Suspense fallback={<div className="h-screen w-screen bg-term-bg" />}>
				<TerminalPage />
			</Suspense>
		</div>
	);
}
