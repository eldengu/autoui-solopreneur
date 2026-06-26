// Screenshots the Flutter Catalog screen (all panels rendered via SpecRenderer).
import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 1200;
const VH = 1200;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const log = (m) => console.log(`[catalog] ${m}`);

try {
  log("loading");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);

  log("open Catalog");
  await page.mouse.click(70, 130); // Catalog nav item
  await page.waitForTimeout(4500); // fetch + render
  await page.screenshot({ path: "docs/flutter-catalog.png" });
  log("captured top");

  // scroll to reveal the custom panel lower down
  await page.mouse.move(700, 600);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "docs/flutter-catalog-2.png" });
  log("captured scrolled");
} catch (e) {
  console.error("[catalog] error:", e?.message ?? e);
} finally {
  await browser.close();
}
console.log("done");
