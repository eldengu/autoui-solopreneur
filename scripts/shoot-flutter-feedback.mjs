// Drives the Flutter chat: ask a question, then press thumb-up under a panel,
// verifying /api/finance-feedback updates memory. Screenshots before/after.
import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 1000;
const VH = 1150;

async function memCount() {
  const r = await fetch("http://localhost:8090/api/memory");
  const j = await r.json();
  return (j.declarative || []).length;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const log = (m) => console.log(`[fb] ${m}`);

try {
  log("loading");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);

  log("ask: How much cash do I have?");
  await page.mouse.click(VW / 2 - 40, VH - 36);
  await page.waitForTimeout(700);
  await page.keyboard.type("How much cash do I have?", { delay: 35 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(40000);
  await page.screenshot({ path: "docs/_fb_preclick.png" });
  log("captured pre-click");

  const before = await memCount();
  log(`memory declarative BEFORE: ${before}`);

  // Click the thumb-up under the first panel (right-aligned feedback row).
  await page.mouse.click(861, 609);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "docs/flutter-feedback.png" });

  const after = await memCount();
  log(`memory declarative AFTER:  ${after}`);
  log(after > before ? "FEEDBACK RECORDED ✓" : "no change (adjust click)");
} catch (e) {
  console.error("[fb] error:", e?.message ?? e);
} finally {
  await browser.close();
}
console.log("done");
