// Records the autoui-solopreneur walkthrough (web app) with Playwright.
// Sequence: Catalog -> Chat (taxes + thumb-up, runway) -> Memory -> remix -> Catalog.
// Output: a .webm in docs/_video (converted to docs/demo.mp4 afterwards).
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "docs/_video";
const VW = 1280;
const VH = 820;

const log = (m) => console.log(`[demo] ${m}`);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: VW, height: VH },
  recordVideo: { dir: OUT, size: { width: VW, height: VH } },
});
// Start with the sidebar expanded so the Catalog/Memory labels are clickable.
await context.addCookies([
  { name: "sidebar_state", value: "true", url: BASE },
]);
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);

async function slowScroll(steps, dy) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy);
    await pause(900);
  }
}

async function ask(question) {
  const ta = page.getByTestId("multimodal-input");
  await ta.click();
  await ta.fill(question);
  await pause(700);
  await page.getByTestId("send-button").click();
  await page.locator("[data-finance-panel]").last().waitFor({ timeout: 120_000 });
  await pause(2500);
}

try {
  log("open app (establishes guest session)");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("multimodal-input").waitFor({ timeout: 60_000 });
  await pause(2000);

  // (1) Catalog — show all rendered panels.
  log("(1) Catalog");
  await page.getByRole("link", { name: "Catalog" }).click();
  await page.locator("[data-panel]").first().waitFor({ timeout: 30_000 });
  await pause(2500);
  await slowScroll(4, 320);
  await pause(1500);

  // (2) Chat — taxes, thumb-up TaxPanel, then runway.
  log("(2) Chat: How are my taxes?");
  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByTestId("multimodal-input").waitFor({ timeout: 30_000 });
  await pause(1200);
  await ask("How are my taxes?");
  log("thumb-up on TaxPanel");
  await page
    .locator('[data-finance-panel="TaxPanel"]')
    .getByRole("button", { name: "Thumbs up" })
    .click();
  await pause(2500);
  log("(2) Chat: Am I going under?");
  await ask("Am I going under?");
  await slowScroll(2, 300);
  await pause(2000);

  // (3) Memory — declarative + procedural from the thumb-up.
  log("(3) Memory");
  await page.getByRole("link", { name: "Memory" }).click();
  await page.getByText("Declarative", { exact: false }).first().waitFor({
    timeout: 30_000,
  });
  await pause(2500);
  await slowScroll(3, 320);
  await pause(2000);

  // (4) Remix — combine CashPanel + RunwayPanel into a new custom panel.
  log("(4) Remix");
  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByTestId("multimodal-input").waitFor({ timeout: 30_000 });
  await pause(1000);
  await page.getByRole("button", { name: "Create custom panel" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 15_000 });
  await pause(1500);
  await dialog.getByRole("button", { name: "CashPanel", exact: true }).click();
  await pause(500);
  await dialog.getByRole("button", { name: "RunwayPanel", exact: true }).click();
  await pause(700);
  await dialog.locator("#remix-instruction").fill("merge into one compact panel");
  await pause(1000);
  await dialog.getByRole("button", { name: "Create panel", exact: true }).click();
  await dialog.waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
  await pause(2500);

  // (5) Catalog — show the new combined panel with its "custom" badge.
  log("(5) Catalog (new custom panel)");
  await page.getByRole("link", { name: "Catalog" }).click();
  await page.getByText("custom", { exact: false }).first().waitFor({
    timeout: 30_000,
  });
  await pause(2500);
  await slowScroll(4, 320);
  await pause(2500);
  log("walkthrough complete");
} catch (err) {
  console.error("[demo] step failed:", err?.message ?? err);
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) console.log(`VIDEO_PATH=${await video.path()}`);
}
