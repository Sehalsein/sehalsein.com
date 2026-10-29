import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.STUDIO_QA_DIR || "/tmp/studio-review";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
let exit = 0;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("ERROR", e.message);
  });
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE", m.text());
  });
  await page.goto("http://127.0.0.1:3000/");
  await page.waitForFunction(() => window.__STUDIO__?.state.ready, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  const snap = async (name) => {
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, await page.evaluate(() => window.__STUDIO__.snapshot()));
  };
  await snap("welcome");
  await page
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  await snap("room");
  const view = async (view) => {
    await page.waitForFunction(
      (v) => {
        const s = window.__STUDIO__.snapshot();
        return s.view === v && !s.busy && !s.moving && !s.pending;
      },
      view,
      { timeout: 35000 },
    );
    await page.waitForTimeout(950);
  };
  await page.evaluate(() => window.__STUDIO__.visit("computer"));
  await page.waitForFunction(() => window.__STUDIO__.state.busy);
  await page.waitForTimeout(550);
  await snap("chair-pull");
  await page.waitForTimeout(850);
  await snap("chair-sit");
  await view("desk");
  await snap("desk");
  await page.getByRole("button", { name: "Take a sip", exact: true }).click();
  await page.waitForTimeout(1100);
  await snap("sip");
  await view("desk");
  await page.getByRole("button", { name: "Use computer", exact: true }).click();
  await view("computer");
  await snap("monitor");
  await page.evaluate(() => window.__STUDIO__.back());
  await view("desk");
  await page.evaluate(() => window.__STUDIO__.visit("resume"));
  await view("resume");
  await snap("resume");
  await page.evaluate(() => window.__STUDIO__.back());
  await view("desk");
  await page.evaluate(() => window.__STUDIO__.back());
  await view("room");
  await page.evaluate(() => window.__STUDIO__.visit("bed"));
  await page.waitForFunction(() => window.__STUDIO__.state.busy);
  await page.waitForTimeout(700);
  await snap("bed-sit");
  await page.waitForTimeout(1000);
  await snap("bed-legs");
  await page.waitForTimeout(1100);
  await snap("bed-lie");
  await view("dream");
  await snap("dream");
  await page.evaluate(() => window.__STUDIO__.wake());
  await view("room");
  await snap("awake");
  await page.evaluate(() => window.__STUDIO__.setNight());
  await page.waitForTimeout(1600);
  await snap("evening");
  await writeFile(`${out}/errors.json`, JSON.stringify(errors));
  if (errors.length) exit = 1;
} catch (e) {
  console.error(e);
  exit = 1;
} finally {
  await Promise.race([
    browser.close(),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  process.exit(exit);
}
