// Records a walkthrough of autoui-solopreneur with Playwright Chromium.
// Output: a .webm in docs/_video (converted to docs/demo.mp4 afterwards).
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "docs/_video";
const VW = 1280;
const VH = 800;

const log = (m) => console.log(`[demo] ${m}`);
const pause = (page, ms) => page.waitForTimeout(ms);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: VW, height: VH },
  recordVideo: { dir: OUT, size: { width: VW, height: VH } },
});
const page = await context.newPage();
const video = page.video();

async function ask(question) {
  const ta = page.getByTestId("multimodal-input");
  await ta.click();
  await ta.fill(question);
  await pause(page, 700);
  await page.getByTestId("send-button").click();
  // Wait for at least one finance panel to render in the answer.
  await page.locator("[data-finance-panel]").last().waitFor({ timeout: 120_000 });
  await pause(page, 2500);
}

try {
  log("open chat");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("multimodal-input").waitFor({ timeout: 60_000 });
  await pause(page, 2000);

  // Step 1 — taxes question, then thumbs up.
  log("step 1: How are my taxes?");
  await ask("How are my taxes?");
  const thumbsUp = page.getByRole("button", { name: "Thumbs up" }).first();
  await thumbsUp.click();
  await pause(page, 2000);

  // Step 2 — runway question (different panels).
  log("step 2: Am I going under?");
  await ask("Am I going under?");
  await pause(page, 2500);

  // Step 3 — combine two panels into a new custom one.
  log("step 3: remix panels");
  await page.getByRole("button", { name: "Create custom panel" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 15_000 });
  await pause(page, 1500);
  await dialog
    .getByRole("button", { name: "CashPanel", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "RunwayPanel", exact: true })
    .click();
  await pause(page, 800);
  await dialog
    .locator("#remix-instruction")
    .fill(
      "Combine these into one compact panel with the total cash metric and the runway projection line graph."
    );
  await pause(page, 1000);
  await dialog
    .getByRole("button", { name: "Create panel", exact: true })
    .click();
  await dialog.waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
  await pause(page, 3000);

  // Step 4 — open the memory page.
  log("step 4: open /memory");
  await page.goto(`${BASE}/memory`, { waitUntil: "domcontentloaded" });
  await page.getByText("Declarative", { exact: false }).first().waitFor({
    timeout: 30_000,
  });
  await pause(page, 2000);
  await page.mouse.wheel(0, 500);
  await pause(page, 2000);
  await page.mouse.wheel(0, 500);
  await pause(page, 2500);
  log("walkthrough complete");
} catch (err) {
  console.error("[demo] step failed:", err?.message ?? err);
} finally {
  await context.close();
  await browser.close();
}

const path = await video.path();
console.log(`VIDEO_PATH=${path}`);
