import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e)));
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  const buttons = page.getByRole("button");
  const n = await buttons.count();
  console.log("button count:", n);
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    console.log(i, "visible:", await b.isVisible(), "text:", JSON.stringify(await b.innerText()));
  }
  const txt = await page.locator("text=* Add section*").allTextContents();
  console.log("add-section matches:", txt);
  await browser.close();
}
main();
