// Screenshots the Flutter app's sidebar navigation (Chat / Catalog / Memory).
import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 1100;
const VH = 720;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const log = (m) => console.log(`[nav] ${m}`);

// Sidebar nav-item approximate centers (x within the 232px rail).
const NAV = { chat: [70, 88], catalog: [70, 130], memory: [70, 172] };

try {
  log("loading");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: "docs/flutter-nav-chat.png" });
  log("captured chat");

  await page.mouse.click(...NAV.catalog);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/flutter-nav-catalog.png" });
  log("captured catalog");

  await page.mouse.click(...NAV.memory);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/flutter-nav-memory.png" });
  log("captured memory");

  // back to chat to confirm two-way nav
  await page.mouse.click(...NAV.chat);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "docs/flutter-nav-chat2.png" });
  log("captured chat again");
} catch (e) {
  console.error("[nav] error:", e?.message ?? e);
} finally {
  await browser.close();
}
console.log("done");
