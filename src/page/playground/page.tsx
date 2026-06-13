"use client";

import dynamic from "next/dynamic";
import { JetBrains_Mono } from "next/font/google";

const Playground = dynamic(
	() => import("@/src/view/playground/PlaygroundPage"),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full w-full items-center justify-center bg-term-bg">
				<p className="text-[13px] text-term-dim">
					<span className="text-term-green">›</span> booting world…
					<span className="ml-1 inline-block h-[12px] w-1.5 animate-[blink_1.05s_steps(1)_infinite] bg-term-ink align-middle" />
				</p>
			</div>
		),
	},
);

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export default function PlaygroundPage() {
	return (
		<div className={`${jetbrains.className} h-screen w-screen`}>
			<Playground />
		</div>
	);
}
