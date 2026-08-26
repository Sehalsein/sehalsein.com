import { cloudflare } from "@cloudflare/vite-plugin";
import netlify from "@netlify/vite-plugin-tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const tanstack = () =>
	tanstackStart({
		srcDirectory: "src",
		router: { autoCodeSplitting: true },
	});

export default defineConfig(() => {
	const isNetlify = process.env.NETLIFY === "true";
	const isVercel = process.env.VERCEL === "1";

	return {
		server: { port: 3000 },
		resolve: {
			alias: {
				"@": fileURLToPath(new URL(".", import.meta.url)),
			},
		},
		plugins: isNetlify
			? [tanstack(), viteReact(), netlify()]
			: isVercel
				? [
						tanstack(),
						nitro({
							preset: "vercel",
							vercel: { functions: { runtime: "nodejs22.x" } },
						}),
						viteReact(),
					]
				: [
						cloudflare({ viteEnvironment: { name: "ssr" } }),
						tanstack(),
						viteReact(),
					],
	};
});
