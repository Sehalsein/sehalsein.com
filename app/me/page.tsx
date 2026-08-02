import { readdir } from "node:fs/promises";
import path from "node:path";
import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import MePage from "@/src/view/me/MePage";
import { POSE_IDS, type PoseId } from "@/src/view/me/poses";

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Sehal Sein — me",
	description:
		"A memoji sticker mapped onto a domed mesh: it tracks your cursor, waves when you arrive, and blinks when you're not looking.",
};

/**
 * Which sticker PNGs actually exist.
 *
 * Done here, on the server, rather than by probing the network from the client:
 * speculative HEAD requests for missing poses would flood the console with 404s,
 * and a manifest file is itself a 404 until someone remembers to write one.
 * `fs` is not a dynamic API, so this still prerenders — the trade is that adding
 * a PNG needs a rebuild (automatic on Vercel; live in dev, where the server
 * component is re-evaluated per request).
 */
async function availablePoses(): Promise<PoseId[]> {
	try {
		const files = new Set(await readdir(path.join(process.cwd(), "public", "memoji")));
		return POSE_IDS.filter((id) => files.has(`${id}.png`));
	} catch {
		return [];
	}
}

export default async function Page() {
	const poses = await availablePoses();
	return (
		<div className={jetbrains.className}>
			<MePage availablePoses={poses} />
		</div>
	);
}
