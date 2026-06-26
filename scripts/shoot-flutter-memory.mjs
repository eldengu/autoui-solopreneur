// Screenshots the Flutter Memory screen (declarative + procedural columns).
import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 1200;
const VH = 1000;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const log = (m) => console.log(`[memory] ${m}`);

try {
  log("loading");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);

  log("open Memory");
  await page.mouse.click(70, 172); // Memory nav item
  await page.waitForTimeout(4500); // fetch + render
  await page.screenshot({ path: "docs/flutter-memory.png" });
  log("captured docs/flutter-memory.png");
} catch (e) {
  console.error("[memory] error:", e?.message ?? e);
} finally {
  await browser.close();
}
console.log("done");
