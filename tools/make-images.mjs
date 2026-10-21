// Regenerates the PNG icons and the social card from the brand SVGs.
// Run: node tools/make-images.mjs   (needs Playwright with Chromium)
// Only rerun when the name, tagline or illustration changes.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const favicon = readFileSync(join(root, "assets/img/favicon.svg"), "utf8");
const page = readFileSync(join(root, "index.html"), "utf8");
const art = page.match(/<svg viewBox="0 0 470 430"[\s\S]*?<\/svg>/)[0];

const card = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#faf8f1;color:#183e39;font-family:Georgia,serif;display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:40px;padding:0 70px;box-sizing:border-box">
<div><div style="font:600 20px system-ui;letter-spacing:.17em;color:#5f7258">ATLANTA, GEORGIA</div>
<div style="font-size:84px;line-height:1.02;letter-spacing:-.05em;margin:24px 0">Care that feels closer to home.</div>
<div style="font-size:34px">KairoBridge <span style="font:15px system-ui;letter-spacing:.28em">HOME CARE</span></div>
<div style="margin-top:22px;display:inline-block;background:#183e39;color:#fff;font:15px system-ui;letter-spacing:.08em;padding:9px 16px;border-radius:4px">PREPARING TO LAUNCH</div></div>
<div style="background:#e5e9dc;border-radius:220px 220px 10px 10px;padding:30px 22px 14px">${art.replace('viewBox="0 0 470 430"', 'viewBox="0 0 470 430" width="100%"')}</div></body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(card);
await p.screenshot({ path: join(root, "assets/img/social-card.png") });
for (const [size, name] of [[32, "favicon-32.png"], [180, "apple-touch-icon.png"]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<body style="margin:0">${favicon.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await p.screenshot({ path: join(root, "assets/img/" + name), omitBackground: true });
}
await browser.close();
console.log("images written");
