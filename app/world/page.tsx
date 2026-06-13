import type { Metadata } from "next";
import WorldEmbed from "./world-embed";

export const metadata: Metadata = {
	title: "world — sehal sein",
	description: "A driveable low-poly 3D world.",
};

/**
 * The /world route serves the built folio app (Vite/WebGPU→WebGL) statically
 * from /public/world-app, embedded full-screen. Build + copy with:
 *   cd ../folio-2025 && npm run build && \
 *     rm -rf ../sehalsein.com/public/world-app && \
 *     cp -r dist ../sehalsein.com/public/world-app
 */
export default function Page() {
	return <WorldEmbed />;
}
