import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 600)));
page.on("console", (m) => {
	const t = m.text();
	if (/posthog|ReadPixels|Clock|PCFSoft|initialization function|Download the React DevTools/i.test(t)) return;
	console.log(m.type().toUpperCase().slice(0, 4) + ":", t.slice(0, 500));
});
await page.goto("http://localhost:3000/playground?nofx&skip-intro", { waitUntil: "networkidle" });
await page.waitForTimeout(8000);
console.log("dbg:", JSON.stringify(await page.evaluate(() => (window).__dbg)));
await browser.close();
