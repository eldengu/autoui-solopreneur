import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 1000;
const VH = 1000;
const stage = process.argv[2] || "locate";

async function customCount() {
  const r = await fetch("http://localhost:8090/api/custom-panels");
  const j = await r.json();
  return (j.panels || []).filter((p) => p.custom).length;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const log = (m) => console.log(`[remix] ${m}`);

try {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);

  // Open the remix dialog via the "+" button in the composer.
  await page.mouse.click(278, 960);
  await page.waitForTimeout(1800);

  if (stage === "locate") {
    await page.screenshot({ path: "docs/_remix_dialog.png" });
    log("captured dialog (locate)");
  } else {
    // stage "act": select two panels + instruction + create.
    const before = await customCount();
    log(`custom panels BEFORE: ${before}`);
    // chip coords (from locate screenshot)
    await page.mouse.click(Number(process.argv[3]), Number(process.argv[4])); // chip 1
    await page.waitForTimeout(400);
    await page.mouse.click(Number(process.argv[5]), Number(process.argv[6])); // chip 2
    await page.waitForTimeout(400);
    await page.mouse.click(Number(process.argv[7]), Number(process.argv[8])); // instruction field
    await page.waitForTimeout(300);
    await page.keyboard.type("merge into one compact panel", { delay: 25 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/_remix_filled.png" });
    await page.mouse.click(Number(process.argv[9]), Number(process.argv[10])); // Create
    log("clicked Create — waiting for generation…");
    await page.waitForTimeout(45000);
    await page.screenshot({ path: "docs/flutter-remix.png" });
    const after = await customCount();
    log(`custom panels AFTER: ${after}`);
    log(after > before ? "PANEL CREATED ✓" : "no change");
  }
} catch (e) {
  console.error("[remix] error:", e?.message ?? e);
} finally {
  await browser.close();
}
console.log("done");
