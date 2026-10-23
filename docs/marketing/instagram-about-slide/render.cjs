// Renders the closing "about us" slide. Usage (web repo root):
//   node docs/marketing/instagram-about-slide/build-data.mjs   (refresh numbers + dots)
//   node docs/marketing/instagram-about-slide/render.cjs
const { chromium } = require('playwright');
const path = require('path');
const SIZES = { feed: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };
(async () => {
  const base = __dirname;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] });
  for (const [f, size] of Object.entries(SIZES)) {
    const page = await (await browser.newContext({ viewport: size })).newPage();
    await page.goto('file://' + path.join(base, 'template.html'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(fmt => window.render(fmt), f);
    await page.waitForTimeout(300);
    const out = path.join(base, `plantspack-about-${f}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, ...size } });
    console.log(out);
  }
  await browser.close();
})();
