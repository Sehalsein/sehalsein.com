// Headless playground probe: boots the world, drives the truck, screenshots.
// Usage: node probe5-pw.mjs [path-with-query] [shot-prefix]
//   e.g. node probe5-pw.mjs "/playground?nofx&skip-intro" phase-a
import { chromium } from "playwright";

const path = process.argv[2] ?? "/playground?nofx";
const prefix = process.argv[3] ?? "probe";
const drive = !process.argv.includes("--no-drive");

const browser = await chromium.launch({
	args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await (
	await browser.newContext({ viewport: { width: 1280, height: 800 } })
).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 600)));
page.on("console", (m) => {
	const t = m.text();
	if (/posthog|ReadPixels|Clock|PCFSoft|initialization function|Download the React DevTools|Vercel Web Analytics|HMR/i.test(t)) return;
	console.log(m.type().toUpperCase().slice(0, 4) + ":", t.slice(0, 500));
});
await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(9000);

const dbg = () => page.evaluate(() => window.__dbg);
const before = await dbg();
console.log("boot:", JSON.stringify(before));
await page.screenshot({ path: `/tmp/${prefix}-1-boot.png` });

if (drive) {
	await page.keyboard.down("w");
	await page.waitForTimeout(2200);
	await page.keyboard.down("a");
	await page.waitForTimeout(1300);
	await page.keyboard.up("a");
	await page.keyboard.up("w");
	const after = await dbg();
	console.log("drove:", JSON.stringify(after));
	await page.screenshot({ path: `/tmp/${prefix}-2-drive.png` });
	if (before && after) {
		const dx = after.player.x - before.player.x;
		const dz = after.player.z - before.player.z;
		const moved = Math.hypot(dx, dz);
		console.log(
			`moved ${moved.toFixed(1)} units, frames ${before.frames}→${after.frames}`,
		);
		if (moved < 3) console.log("WARN: truck barely moved");
		if (after.frames <= before.frames) console.log("WARN: render loop stalled");
	}
}
await browser.close();
console.log(`screenshots: /tmp/${prefix}-*.png`);
