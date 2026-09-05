import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL = process.env.APP_URL ?? "http://localhost:3100";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await page.screenshot({ path: "docs/screenshots/01-map.png" });

await page.getByRole("button", { name: "Get briefing" }).click();
await page.waitForTimeout(9000);
await page.screenshot({ path: "docs/screenshots/02-briefing.png" });

await page.getByText("Live traffic", { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ path: "docs/screenshots/03-traffic.png" });

await page.getByRole("button", { name: "Co-pilot" }).click();
await page.getByPlaceholder("Aircraft, load, fuel, route…").fill("C172, 2 POB, 100L fuel, EGTK to EGKA");
await page.keyboard.press("Enter");
await page.waitForTimeout(4000);
await page.screenshot({ path: "docs/screenshots/04-copilot.png" });

await browser.close();
console.log("captured");
