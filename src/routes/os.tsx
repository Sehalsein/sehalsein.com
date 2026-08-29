import { createFileRoute } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";

const loadOSShell = createClientOnlyFn(() => import("@/src/view/os/OSShell"));
const OSShell = lazy(loadOSShell);

export const Route = createFileRoute("/os")({
	ssr: false,
	head: () => ({ meta: [{ title: "sehalOS — Sehal Sein" }] }),
	component: () => (
		<Suspense fallback={<div className="h-screen w-screen bg-term-bg" />}>
			<div className="font-mono">
				<OSShell />
			</div>
		</Suspense>
	),
});
