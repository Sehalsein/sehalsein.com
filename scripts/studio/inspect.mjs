import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
await mkdir("/tmp/studio-inspect", { recursive: true });
const b = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", (e) => console.log("ERROR", e.message));
  await p.goto("http://127.0.0.1:3000/");
  await p.waitForFunction(() => window.__STUDIO__?.state.ready);
  await p
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const w = window.__STUDIO__;
    w.paused = true;
    w.lighting.ao.enabled = false;
    w.lighting.render(0.016, false, true, true);
  });
  await p.screenshot({ path: "/tmp/studio-inspect/room-noAO.png" });
  await p.evaluate(() => {
    const w = window.__STUDIO__;
    w.camera.position.set(1.4, 1.75, 3.0);
    w.camera.lookAt(-0.4, 0.93, 0.76);
    w.camera.updateMatrixWorld();
    w.lighting.render(0.016, false, true, true);
  });
  await p.screenshot({ path: "/tmp/studio-inspect/character.png" });
  await p.evaluate(() => {
    const w = window.__STUDIO__;
    w.paused = false;
    w.visit("bed");
  });
  await p.waitForFunction(() => window.__STUDIO__.action?.elapsed > 3.6);
  await p.evaluate(() => {
    const w = window.__STUDIO__;
    w.paused = true;
    w.actor.reset(0);
    w.sleeping();
    w.actor.sync();
    w.lighting.render(0.016, false, true, true);
  });
  await p.screenshot({ path: "/tmp/studio-inspect/bed-noAO.png" });
  console.log(
    await p.evaluate(() => {
      const w = window.__STUDIO__,
        q = w.node("Quilt"),
        a = w.actor;
      return {
        morph: q.morphTargetInfluences,
        bed: w.node("Bed").position.toArray(),
        quilt: q.position.toArray(),
        sizes: q.geometry.attributes.position.count,
        feet: a.feet.map((f) =>
          f.getWorldPosition(a.root.position.clone()).toArray(),
        ),
        hips: a.pelvis.getWorldPosition(a.root.position.clone()).toArray(),
        shirt: a.model.getObjectByName("Burnt_sienna_cotton")?.material.name,
      };
    }),
  );
} finally {
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 3000))]);
  process.exit(0);
}
