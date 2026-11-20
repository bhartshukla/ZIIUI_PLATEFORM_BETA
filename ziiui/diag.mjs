import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errors.push(m.type().toUpperCase() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const cards = page.locator('.component-card');
console.log('card count:', await cards.count());
// Click via the preview button which is the intended trigger
const previewBtn = cards.first().locator('.preview-btn');
console.log('preview btn count:', await previewBtn.count());
await previewBtn.first().click();
try {
  await page.waitForFunction(() => {
    const f = document.getElementById('frame');
    if (!f) return false;
    const sd = f.srcdoc || '';
    return sd.length > 100;
  }, { timeout: 8000 });
  console.log('SRCDOC SET OK');
  const sd = await page.evaluate(() => document.getElementById('frame').srcdoc.slice(0, 200));
  console.log('srcdoc:', sd);
  // also check contentDocument
  try {
    const inner = await page.evaluate(() => {
      const f = document.getElementById('frame');
      return f && f.contentDocument ? f.contentDocument.body.innerHTML.slice(0, 200) : 'no contentDocument';
    });
    console.log('contentDocument body:', inner);
  } catch (e) { console.log('contentDocument access err:', e.message); }
} catch (e) {
  console.log('ERROR:', e.message);
}
console.log('errors:', errors.slice(0, 10));
await browser.close();
