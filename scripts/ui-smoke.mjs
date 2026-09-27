// Browser smoke test of the production build under the Pages base path: serves dist/ with `vite preview`,
// drives the app in headless Chrome (real Web Worker) and fails on page errors or failed requests.
// Usage: npm run build && npm run ui-smoke   (CHROME_PATH overrides the browser; SCREENSHOTS=dir saves screenshots)
import { chromium } from "playwright-core";
import { preview } from "vite";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOTS = process.env.SCREENSHOTS;

const server = await preview({ root: process.cwd(), preview: { port: 0, strictPort: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const problems = [];
const watch = (page) => {
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`console error: ${m.text()}`));
  page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
};
const shot = async (page, name, fullPage = false) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
const idle = (page) => page.waitForFunction('!document.querySelector("header").textContent.includes("updating")', null, { timeout: 60_000 });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  watch(page);
  const t0 = Date.now();
  await page.goto(base);
  await page.getByRole("tab", { name: "Results" }).click();
  await page.getByText(/Best set at enchant 0: ×/).waitFor({ timeout: 60_000 });
  console.log(`Oni: automatic result after ${Date.now() - t0} ms, ${await page.locator("table.best-set tbody tr").count()} slot rows`);

  await page.getByRole("tab", { name: /^Inputs/ }).click();
  await idle(page);
  const hidden = await page.locator("details.hidden-inputs summary").textContent();
  console.log(`Oni: ${await page.getByRole("tab", { name: /^Inputs/ }).textContent()} shown, ${hidden}`);
  await shot(page, "inputs");

  await page.getByRole("tab", { name: "Setup" }).click();
  await page.getByLabel("Class", { exact: true }).selectOption("shaman");
  await page.getByRole("tab", { name: "Results" }).click();
  await idle(page);
  await page.getByRole("button", { name: "Run enchant sweep" }).click();
  await page.locator("progress").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Run enchant sweep" }).waitFor({ timeout: 10_000 });
  console.log("Shaman: sweep cancelled");

  const s0 = Date.now();
  await page.getByRole("button", { name: "Run enchant sweep" }).click();
  await page.locator("progress").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Run enchant sweep" }).waitFor({ timeout: 180_000 });
  await page.getByText("Enchant levels where the best set changes").waitFor({ timeout: 5_000 });
  console.log(`Shaman: sweep 0–55 in ${Date.now() - s0} ms, ${await page.locator("table.sweep tbody tr").count()} change rows`);
  await shot(page, "results");
  await shot(page, "results-full", true);

  await page.getByRole("tab", { name: /^Inputs/ }).click();
  const field = page.locator("fieldset .field input[type=text]").first();
  const fieldId = await field.getAttribute("id");
  await field.fill("1e12");
  await page.waitForTimeout(200);
  const shared = page.url();
  const restored = await browser.newPage({ viewport: { width: 1200, height: 1000 }, colorScheme: "dark" });
  watch(restored);
  await restored.goto(shared);
  const cls = await restored.getByLabel("Class", { exact: true }).inputValue();
  await restored.getByRole("tab", { name: /^Inputs/ }).click();
  const value = await restored.locator(`[id="${fieldId}"]`).inputValue();
  if (cls !== "shaman" || value !== "1e12") problems.push(`shared link restored class ${cls} and ${fieldId} = ${value}`);
  await restored.getByRole("tab", { name: "Items" }).click();
  await restored.getByRole("button", { name: /Lucky Amulet/ }).click();
  await shot(restored, "items-dark");
  console.log(`Shared link restores the class (${cls}) and ${fieldId} (${value})`);
} finally {
  await browser.close();
  await server.close();
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("No page errors or failed requests.");
