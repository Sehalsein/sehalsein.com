import { lazy, Suspense } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import Link from "@/src/components/AppLink";

// The engine uses WebGL and the DOM — never server-render it.
const loadRacerCanvas = createClientOnlyFn(() => import("./RacerCanvas"));
const RacerCanvas = lazy(loadRacerCanvas);

export default function RacerPage() {
	return (
		<main className="relative h-screen w-screen overflow-hidden bg-black">
			<Suspense fallback={<div className="h-full w-full bg-black" />}>
				<RacerCanvas />
			</Suspense>
			<Link
				href="/"
				className="absolute left-4 top-4 z-50 rounded border border-white/25 bg-black/35 px-2 py-1 text-[12px] text-white/85 backdrop-blur transition-colors hover:border-white/70 hover:text-white"
			>
				← home
			</Link>
		</main>
	);
}
