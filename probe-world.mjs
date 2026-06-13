// Headless /world probe: boots the arena, drives the car, screenshots.
// Usage: node probe-world.mjs [shot-prefix]
import { chromium } from "playwright";

const prefix = process.argv[2] ?? "world";
const browser = await chromium.launch({
	args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await (
	await browser.newContext({ viewport: { width: 1280, height: 800 } })
).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 600)));
page.on("console", (m) => {
	const t = m.text();
	if (/posthog|ReadPixels|Clock|PCFSoft|initialization function|Download the React DevTools|Vercel Web Analytics|HMR|\[Fast Refresh\]/i.test(t)) return;
	console.log(m.type().toUpperCase().slice(0, 4) + ":", t.slice(0, 400));
});

await page.goto("http://localhost:3000/world", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
await page.screenshot({ path: `/tmp/${prefix}-intro.png` });
console.log("shot intro");

// start + drive forward, then steer
await page.keyboard.down("w");
await page.waitForTimeout(2500);
await page.screenshot({ path: `/tmp/${prefix}-drive.png` });
console.log("shot drive");
await page.keyboard.down("d");
await page.waitForTimeout(2500);
await page.keyboard.up("d");
await page.keyboard.up("w");
await page.screenshot({ path: `/tmp/${prefix}-turn.png` });
console.log("shot turn");

// open the map
await page.keyboard.press("m");
await page.waitForTimeout(600);
await page.screenshot({ path: `/tmp/${prefix}-map.png` });
console.log("shot map");

const dump = await page.evaluate(() => {
	try {
		return localStorage.getItem("world-save");
	} catch {
		return null;
	}
});
console.log("SAVE:", dump);

await browser.close();
console.log("done");
