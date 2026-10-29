import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.STUDIO_QA_DIR || "/tmp/studio-recording";
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--enable-unsafe-swiftshader",
    "--auto-accept-this-tab-capture",
    "--enable-usermedia-screen-capturing",
    "--allow-http-screen-capture",
  ],
});
let exit = 0;
try {
  const c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const p = await c.newPage();
  const chunks = [],
    errors = [],
    chapters = [];
  await p.exposeFunction("__recordChunk", (encoded) =>
    chunks.push(Buffer.from(encoded, "base64")),
  );
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:3000/");
  await p.waitForFunction(() => window.__STUDIO__?.state.ready, null, {
    timeout: 60000,
  });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 60, max: 60 }, displaySurface: "browser" },
      audio: false,
      preferCurrentTab: true,
    });
    if (stream.getVideoTracks()[0].getSettings().displaySurface !== "browser") {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Only the app tab may be recorded");
    }
    window.__RECORD_STARTED__ = performance.now();
    window.__RECORD_JOBS__ = Promise.resolve();
    const recorder = (window.__RECORDER__ = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 8000000,
    }));
    recorder.ondataavailable = (event) => {
      window.__RECORD_JOBS__ = window.__RECORD_JOBS__.then(async () => {
        const data = new Uint8Array(await event.data.arrayBuffer());
        let value = "";
        for (let i = 0; i < data.length; i += 32768)
          value += String.fromCharCode(...data.subarray(i, i + 32768));
        await window.__recordChunk(btoa(value));
      });
    };
    window.__RECORD_DONE__ = new Promise(
      (resolve) =>
        (recorder.onstop = async () => {
          await window.__RECORD_JOBS__;
          stream.getTracks().forEach((t) => t.stop());
          resolve();
        }),
    );
    recorder.start(1000);
  });

  const started = Date.now();
  const chapter = (title) => {
    chapters.push({ title, seconds: (Date.now() - started) / 1000 });
    console.log(title);
  };
  const visit = (id) => p.evaluate((id) => window.__STUDIO__.visit(id), id);
  const back = () => p.evaluate(() => window.__STUDIO__.back());
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
  await p.evaluate(() => {
    window.__motionAudit = { times: [], contacts: [] };
    let last = performance.now();
    function tick(t) {
      if (window.__stopAudit) return;
      const s = window.__STUDIO__.snapshot();
      window.__motionAudit.times.push(t - last);
      last = t;
      if (s.contactError > 0.015)
        window.__motionAudit.contacts.push({
          object: s.held,
          error: s.contactError,
          time: s.actionTime,
        });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  chapter("An entirely new room");
  await p.waitForTimeout(1800);
  await p
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  await p.waitForTimeout(1100);
  chapter("Walking");
  await p.keyboard.down("d");
  await p.waitForTimeout(550);
  await p.keyboard.up("d");
  await p.waitForTimeout(400);
  await p.keyboard.down("a");
  await p.waitForTimeout(430);
  await p.keyboard.up("a");
  await p.waitForTimeout(500);
  chapter("Pull up a chair");
  await visit("computer");
  await view("desk");
  await p.screenshot({ path: out + "/desk.png" });
  chapter("Coffee, in hand");
  await visit("mug");
  await p.waitForTimeout(1150);
  await p.screenshot({ path: out + "/coffee.png" });
  await view("desk");
  chapter("Inside the monitor");
  await visit("computer");
  await view("computer");
  await p.waitForTimeout(1700);
  await p.screenshot({ path: out + "/monitor.png" });
  await back();
  await view("desk");
  chapter("The résumé");
  await visit("resume");
  await view("resume");
  await p.waitForTimeout(1200);
  await back();
  await view("desk");
  await back();
  await view("room");
  chapter("Under the blanket");
  await visit("bed");
  await view("sleep");
  await p.screenshot({ path: out + "/sleep.png" });
  await view("dream");
  await p.waitForTimeout(1800);
  await p.evaluate(() => window.__STUDIO__.wake());
  await view("room");
  chapter("An evening at home");
  await p.evaluate(() => window.__STUDIO__.setNight());
  await p.waitForTimeout(2000);
  await p.screenshot({ path: out + "/evening.png" });
  chapter("After hours");
  await visit("tv");
  await view("tv");
  await p.waitForTimeout(1900);
  await back();
  await view("room");
  await p.waitForTimeout(900);
  const audit = await p.evaluate(() => {
    window.__stopAudit = true;
    return window.__motionAudit;
  });
  audit.errors = errors;
  audit.times.sort((a, b) => a - b);
  audit.median = audit.times[Math.floor(audit.times.length * 0.5)];
  audit.p95 = audit.times[Math.floor(audit.times.length * 0.95)];
  await p.evaluate(async () => {
    window.__RECORDER__.stop();
    await window.__RECORD_DONE__;
  });
  await writeFile(out + "/walkthrough-raw.webm", Buffer.concat(chunks));
  await writeFile(out + "/audit.json", JSON.stringify(audit, null, 2));
  await writeFile(out + "/chapters.json", JSON.stringify(chapters, null, 2));
  console.log(
    JSON.stringify({
      duration: (Date.now() - started) / 1000,
      median: audit.median,
      p95: audit.p95,
      errors,
      contacts: audit.contacts.length,
    }),
  );
  if (errors.length) exit = 1;
} catch (e) {
  console.error(e);
  exit = 1;
} finally {
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 3000))]);
  process.exit(exit);
}
