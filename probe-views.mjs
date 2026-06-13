// Visual audit: screenshots from arbitrary cameras via ?cam=
import { chromium } from "playwright";
const VIEWS = JSON.parse(process.argv[2]); // [[name, x,y,z, tx,ty,tz], ...]
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
for (const [name, ...cam] of VIEWS) {
	const page = await ctx.newPage();
	page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
	await page.goto(`http://localhost:3000/playground?skip-intro&nofx&far&cam=${cam.join(",")}`, { waitUntil: "networkidle" });
	await page.waitForTimeout(9000);
	await page.screenshot({ path: `/tmp/view-${name}.png` });
	await page.close();
	console.log(name, "ok");
}
await browser.close();
