import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.STUDIO_QA_DIR || "/tmp/studio-all";
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
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:3000/");
  await p.waitForFunction(() => window.__STUDIO__?.state.ready, null, {
    timeout: 60000,
  });
  await p
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  await p.evaluate(() => {
    window.__audit = { contact: [], times: [], phases: [] };
    let last = performance.now(),
      phase = "";
    function tick(t) {
      const w = window.__STUDIO__,
        s = w.snapshot();
      window.__audit.times.push(t - last);
      last = t;
      if (s.contactError > 0.015)
        window.__audit.contact.push({
          object: s.held,
          error: s.contactError,
          time: s.actionTime,
        });
      if (s.label !== phase) {
        phase = s.label;
        window.__audit.phases.push(phase);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  const view = async (id) => {
    await p.waitForFunction(
      (id) => {
        const s = window.__STUDIO__.snapshot();
        return s.view === id && !s.busy && !s.pending && !s.moving;
      },
      id,
      { timeout: 40000 },
    );
    await p.waitForTimeout(900);
  };
  const visit = async (id) => {
    await p.evaluate((id) => window.__STUDIO__.visit(id), id);
  };
  const back = async () => {
    await p.evaluate(() => window.__STUDIO__.back());
  };
  const snap = async (name) => {
    await p.screenshot({ path: `${out}/${name}.png` });
    console.log(
      "CHECK",
      name,
      await p.evaluate(() => window.__STUDIO__.snapshot()),
    );
  };
  for (const id of ["books", "figure", "tv"]) {
    await visit(id);
    await view(id);
    await snap(id);
    await back();
    await view("room");
  }
  for (const id of ["window", "lamp", "wardrobe", "plant"]) {
    await visit(id);
    await p.waitForFunction(() => window.__STUDIO__.state.busy);
    if (id === "plant") {
      await p.waitForTimeout(1250);
      await snap("watering");
    }
    await view("room");
    await snap(id);
  }
  await visit("computer");
  await view("desk");
  assert.equal(
    await p.evaluate(() => window.__STUDIO__.actor.headClose.value),
    1,
    "The seated lens must completely hide the head, including during breathing",
  );
  await visit("mug");
  await p.waitForFunction(() => window.__STUDIO__.state.busy);
  await p.waitForTimeout(1100);
  assert(
    (await p.locator(".studio-caption").boundingBox()).height < 80,
    "An interaction caption must not stretch between top and bottom anchors",
  );
  assert.equal(
    await p.evaluate(() => window.__STUDIO__.actor.headClose.value),
    1,
  );
  await view("desk");
  await visit("computer");
  await view("computer");
  await p
    .locator(".surface-computer .os-dock")
    .getByRole("button", { name: "Notes", exact: true })
    .click();
  await p
    .locator(".surface-computer textarea")
    .fill("A note from the new room.");
  await p.locator(".surface-computer textarea").blur();
  await p.waitForTimeout(300);
  assert.equal(
    await p.locator(".surface-computer textarea").inputValue(),
    "A note from the new room.",
  );
  await back();
  await view("desk");
  await visit("resume");
  await view("resume");
  await snap("resume");
  await back();
  await view("desk");
  await back();
  await view("room");
  await visit("bed");
  await view("sleep");
  await snap("sleep");
  await view("dream");
  await p.evaluate(() => window.__STUDIO__.wake());
  await view("room");
  const audit = await p.evaluate(() => window.__audit);
  audit.errors = errors;
  audit.times.sort((a, b) => a - b);
  audit.median = audit.times[Math.floor(audit.times.length * 0.5)];
  audit.p95 = audit.times[Math.floor(audit.times.length * 0.95)];
  await writeFile(`${out}/audit.json`, JSON.stringify(audit, null, 2));
  console.log(
    "AUDIT",
    JSON.stringify({
      errors,
      contactFailures: audit.contact.length,
      maxError: Math.max(0, ...audit.contact.map((c) => c.error)),
      median: audit.median,
      p95: audit.p95,
    }),
  );
  assert.equal(errors.length, 0);
  assert.equal(
    audit.contact.length,
    0,
    "Every held prop must remain on its intended hand target within 15 mm",
  );
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
