import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "vite";

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const engineName = process.env.BROWSER_ENGINE || "chromium";
const engine = { chromium, webkit }[engineName];
const browser = await engine.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const vite = await createServer({ root: process.cwd(), logLevel: "silent", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await vite.listen();
const address = vite.httpServer.address();
const base = `http://127.0.0.1:${address.port}`;
const widths = (process.env.R55_WIDTHS
  ? process.env.R55_WIDTHS.split(",").map(Number)
  : [375, 390, 430, 600, 700, 768, 820, 900, 1024, 1180, 1366, 1512]
).filter((width) => Number.isSafeInteger(width) && width > 0);
const output = process.env.R55_OUTPUT_DIR || "/tmp/meetro-r55-customer-history";
mkdirSync(output, { recursive: true });
const results = [];

try {
  for (const width of widths) {
    const height = width < 768 ? 844 : width < 1024 ? 1024 : 900;
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: width < 768, deviceScaleFactor: 1 });
    await page.goto(`${base}/tests/browser/customerHistoryFixture.html`);
    const customer = page.getByRole("button", { name: /Open Customer History: Alex Morgan/ });
    await customer.waitFor();
    await customer.click();
    await page.locator("#customer-relationship-detail-title").waitFor();
    const selectedName = await page.locator("#customer-relationship-detail-title").textContent();
    const reads = await page.evaluate(() => window.__customerHistoryReads);
    const scroller = page.locator(".app-page");

    const box = await scroller.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(300, box.height / 2));
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 100, { steps: 8 });
    await page.mouse.up();
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await scroller.evaluate((element) => { element.scrollTop = Math.min(620, element.scrollHeight - element.clientHeight); element.dispatchEvent(new Event("scroll")); });
    await page.waitForTimeout(40);
    assert.equal(await page.locator("#customer-relationship-detail-title").textContent(), selectedName);

    const originalHeight = height;
    await page.setViewportSize({ width: Math.max(375, Math.min(1512, height)), height: width });
    await page.waitForTimeout(40);
    assert.equal(await page.locator("#customer-relationship-detail-title").textContent(), selectedName);
    await page.setViewportSize({ width, height: originalHeight });
    await page.waitForTimeout(40);
    assert.equal(await page.locator("#customer-relationship-detail-title").textContent(), selectedName);
    assert.equal(await page.evaluate(() => window.__customerHistoryReads), reads);

    await page.getByRole("button", { name: "Jobs", exact: true }).click();
    assert.equal(await page.locator("#customer-relationship-detail-title").textContent(), selectedName);
    assert.equal(await page.getByRole("heading", { name: "Active Jobs", exact: true }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Completed Jobs", exact: true }).count(), 1);

    const measure = await page.evaluate(() => {
      const root = document.documentElement;
      const detail = document.querySelector('[aria-labelledby="customer-relationship-detail-title"]');
      const tablist = document.querySelector('[aria-label="Customer History"]');
      const actions = [...detail.querySelectorAll("button")].map((button) => button.getBoundingClientRect().height);
      const pageStyle = getComputedStyle(document.querySelector(".app-page"));
      const sidebarStyle = getComputedStyle(document.querySelector(".desktop-sidebar"));
      const bottomNavStyle = getComputedStyle(document.querySelector(".bottom-nav-dock"));
      return {
        layoutMode: document.getElementById("root").dataset.appLayout,
        documentWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        detailWidth: detail.getBoundingClientRect().width,
        tabsContained: tablist.getBoundingClientRect().left >= detail.getBoundingClientRect().left - 1 && tablist.getBoundingClientRect().right <= detail.getBoundingClientRect().right + 1,
        minAction: Math.min(...actions),
        bottomPadding: parseFloat(pageStyle.paddingBottom),
        touchAction: pageStyle.touchAction,
        scrollable: document.querySelector(".app-page").scrollHeight > document.querySelector(".app-page").clientHeight,
        sidebarDisplay: sidebarStyle.display,
        bottomNavDisplay: bottomNavStyle.display,
      };
    });
    assert.ok(measure.documentWidth <= measure.clientWidth + 1, `${width}px has horizontal overflow`);
    assert.ok(measure.detailWidth > 0);
    assert.equal(measure.tabsContained, true);
    assert.ok(measure.minAction >= 44, `${width}px has an action below 44px`);
    if (width < 768) {
      assert.equal(measure.layoutMode, "mobile");
      assert.ok(measure.bottomPadding >= 96);
      assert.notEqual(measure.bottomNavDisplay, "none");
      assert.equal(measure.sidebarDisplay, "none");
    } else {
      assert.ok(["tablet", "desktop"].includes(measure.layoutMode));
      assert.ok(measure.bottomPadding >= 32);
      assert.equal(measure.bottomNavDisplay, "none");
      assert.equal(measure.sidebarDisplay, "flex");
    }
    assert.equal(measure.touchAction, "pan-y");
    assert.equal(measure.scrollable, true);
    if ([390, 820, 1366].includes(width)) {
      await page.screenshot({ path: `${output}/${engineName}-${width}.png`, fullPage: false });
    }
    results.push({ width, height, ...measure });
    await page.close();
  }
} finally {
  await browser.close();
  await vite.close();
  writeFileSync(`${output}/${engineName}-results.json`, JSON.stringify(results, null, 2));
}

console.log(`${engineName}: ${results.length} Customer History viewport and interaction fixtures passed (${output})`);
