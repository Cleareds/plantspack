// Renders the six slides for a country from data.json, in one or both formats:
//   story  1080x1920  TikTok, Reels, Shorts, Stories (TikTok 3:4 crop + overlays respected)
//   feed   1080x1350  Instagram / LinkedIn / Facebook carousel
// Usage (web repo root):
//   node docs/marketing/tiktok-templates/country-slides/render.cjs belgium [--format story|feed|all] [--slides 1,3]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FORMATS = { story: { width: 1080, height: 1920 }, feed: { width: 1080, height: 1350 } };

(async () => {
  const args = process.argv.slice(2);
  const countryDir = args.find(a => !a.startsWith('--'));
  if (!countryDir) { console.error('usage: render.cjs <country-dir> [--format story|feed|all] [--slides 1,2]'); process.exit(1); }
  const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const formats = opt('--format', 'all') === 'all' ? Object.keys(FORMATS) : [opt('--format', 'all')];
  const wanted = opt('--slides', '1,2,3,4,5,6').split(',').map(Number);
  const base = path.resolve(__dirname);
  const dir = path.join(base, countryDir);
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));

  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files', '--hide-scrollbars'] });
  for (const format of formats) {
    const size = FORMATS[format];
    if (!size) { console.error('unknown format', format); continue; }
    const out = path.join(dir, 'slides', format); fs.mkdirSync(out, { recursive: true });
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + path.join(base, 'template.html'), { waitUntil: 'load' });
    await page.evaluate(f => { document.body.dataset.format = f; }, format);
    for (const n of wanted) {
      await page.evaluate(([d, i]) => window.renderSlide(d, i), [data, n]);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.evaluate(() => Promise.all(Array.from(document.images).filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))));
      await page.waitForTimeout(250);
      const file = path.join(out, `${String(n).padStart(2, '0')}-${data.iso2.toLowerCase()}-${format}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size.width, height: size.height } });
      console.log(file);
    }
    await ctx.close();
  }
  await browser.close();
})();
