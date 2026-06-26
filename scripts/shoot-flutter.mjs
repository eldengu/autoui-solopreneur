// Drives the Flutter web app (served at :8090) with Playwright and screenshots
// the AI-selected panels. CanvasKit has no DOM, so we interact by coordinates.
import { chromium } from "@playwright/test";

const URL = "http://localhost:8090/";
const VW = 900;
const VH = 1150;
const shots = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

const log = (m) => console.log(`[shoot] ${m}`);

try {
  log("loading flutter app");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(7000); // Flutter bootstrap + first frame
  await page.screenshot({ path: "docs/flutter-empty.png" });
  shots.push("docs/flutter-empty.png");

  async function ask(q, shotPath, waitMs = 40000) {
    log(`typing: ${q}`);
    await page.mouse.click(VW / 2 - 40, VH - 36);
    await page.waitForTimeout(800);
    await page.keyboard.type(q, { delay: 35 });
    await page.waitForTimeout(400);
    await page.keyboard.press("Enter");
    log("waiting for panels (Claude)…");
    await page.waitForTimeout(waitMs);
    await page.screenshot({ path: shotPath });
    shots.push(shotPath);
    log(`captured ${shotPath}`);
  }

  // Q1: taxes -> Card/Metric/ProgressBar/Grid/Badge/ListItem
  await ask("How are my taxes?", "docs/flutter-demo.png");
  // Q2: business overview -> BarGraph (income) + LineGraphs (expense/cash/runway)
  await ask("How's my business doing?", "docs/flutter-charts.png");
} catch (e) {
  console.error("[shoot] error:", e?.message ?? e);
  await page.screenshot({ path: "docs/flutter-demo.png" }).catch(() => {});
} finally {
  await browser.close();
}
console.log("SHOTS=" + shots.join(","));
