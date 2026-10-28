import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const out = "/tmp/studio-viewports";
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
let exit = 0;
try {
  const c = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const p = await c.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:3000/");
  await p.waitForFunction(() => window.__STUDIO__?.state.ready, null, {
    timeout: 60000,
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: out + "/welcome.png" });
  await p
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  const view = async (id) => {
    await p.waitForFunction(
      (id) => {
        const w = window.__STUDIO__,
          s = w.snapshot();
        return s.view === id && !s.busy && !s.pending && !s.moving && !w.lens;
      },
      id,
      { timeout: 40000 },
    );
    await p.waitForTimeout(300);
  };
  const visit = (id) => p.evaluate((id) => window.__STUDIO__.visit(id), id);
  const back = () => p.evaluate(() => window.__STUDIO__.back());
  await visit("computer");
  await view("desk");
  await p.screenshot({ path: out + "/desk.png" });
  await visit("computer");
  await view("computer");
  await p.screenshot({ path: out + "/monitor-portrait.png" });
  const bounds = await p.locator(".surface-computer").boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 391);
  assert(bounds.y >= 0 && bounds.y + bounds.height <= 845);
  assert(bounds.height > bounds.width);
  await p
    .locator(".surface-computer .os-dock")
    .getByRole("button", { name: "Notes", exact: true })
    .click();
  await p.locator(".surface-computer textarea").fill("A thought from a phone.");
  await p.keyboard.press("Escape");
  await view("desk");
  await visit("resume");
  await view("resume");
  await p.screenshot({ path: out + "/resume.png" });
  await back();
  await view("desk");
  await visit("computer");
  await view("computer");
  await p.setViewportSize({ width: 1100, height: 760 });
  await view("computer");
  await p.screenshot({ path: out + "/rotated.png" });
  assert((await p.locator(".surface-computer").boundingBox()).width > 700);
  await back();
  await view("desk");
  await back();
  await view("room");
  await visit("bed");
  await p.waitForFunction(() => window.__STUDIO__.state.busy);
  await p.keyboard.press("Escape");
  await view("room");
  assert.equal(await p.evaluate(() => window.__STUDIO__.snapshot().held), null);
  await p.getByRole("button", { name: "About me", exact: true }).click();
  assert.equal(await p.locator("dialog[open]").count(), 1);
  await p.keyboard.press("Escape");
  assert.equal(await p.locator("dialog[open]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: portrait monitor, touch UI, editable notes, Escape in a text field, resize, safe bed cancellation, native quick-page dialog.",
  );
} catch (e) {
  console.error(e);
  exit = 1;
} finally {
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 3000))]);
  process.exit(exit);
}
