/**
 * Audit horizontal overflow at 390px. Usage:
 *   node scripts/mobile-overflow-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const base = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");

const routes = [
  "/en",
  "/en/products?cat=laptops",
  "/en/products?cat=monitors",
  "/en/product/205",
  "/admin",
  "/admin/products",
  "/admin/products/new",
  "/admin/products/edit/205",
  "/admin/categories",
  "/admin/data-quality",
  "/admin/classification",
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "en-US",
});

console.log("Mobile overflow audit @ 390px — " + base + "\n");

for (const path of routes) {
  const url = base + path;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth > doc.clientWidth;
      const offenders = [];
      for (const el of document.querySelectorAll("*")) {
        if (el.scrollWidth > doc.clientWidth + 1) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? "#" + el.id : "";
          const cls =
            typeof el.className === "string" && el.className
              ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
              : "";
          offenders.push(tag + id + cls + " (" + el.scrollWidth + "px)");
          if (offenders.length >= 8) break;
        }
      }
      return {
        overflow,
        offenders,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    const status = result.overflow ? "OVERFLOW" : "OK";
    console.log(
      status +
        "  " +
        path +
        "  (" +
        result.scrollWidth +
        "/" +
        result.clientWidth +
        ")",
    );
    if (result.offenders.length) {
      for (const o of result.offenders) console.log("       → " + o);
    }
  } catch (e) {
    console.log("ERROR  " + path + "  " + (e instanceof Error ? e.message : String(e)));
  } finally {
    await page.close();
  }
}

await browser.close();
