"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// The engine uses the WebGPU renderer and the DOM — never server-render it.
const PlaygroundCanvas = dynamic(() => import("./PlaygroundCanvas"), {
	ssr: false,
});

export default function PlaygroundPage() {
	return (
		<main className="relative h-screen w-screen overflow-hidden bg-black">
			<PlaygroundCanvas />
			<Link
				href="/"
				className="absolute left-4 top-4 z-50 rounded border border-white/25 bg-black/35 px-2 py-1 text-[12px] text-white/85 backdrop-blur transition-colors hover:border-white/70 hover:text-white"
			>
				← home
			</Link>
		</main>
	);
}
