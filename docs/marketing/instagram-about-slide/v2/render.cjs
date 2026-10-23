// Renders the v2 "about v2" slide. Usage (web repo root):
//   node docs/marketing/instagram-about-slide/v2/build-data.mjs
//   node docs/marketing/instagram-about-slide/v2/render.cjs
const { chromium } = require('playwright');
const path = require('path');
const SIZES = { feed: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] });
  for (const [f, size] of Object.entries(SIZES)) {
    const page = await (await browser.newContext({ viewport: size })).newPage();
    await page.goto('file://' + path.join(__dirname, 'template.html'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(fmt => window.render(fmt), f);
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => ({ top: document.querySelector('.wordmark').getBoundingClientRect().top, bottom: document.querySelector('.get').getBoundingClientRect().bottom, dayBottom: document.querySelector('.index').getBoundingClientRect().bottom, footTop: document.querySelector('.who').getBoundingClientRect().top }));
    const out = path.join(__dirname, `plantspack-about-v2-${f}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, ...size } });
    console.log(out, JSON.stringify(box));
  }
  await browser.close();
})();
