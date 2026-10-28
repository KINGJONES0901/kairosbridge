// Regenerates the PNG icons and the social card from the brand SVGs.
// Run: node tools/make-images.mjs   (needs Playwright with Chromium)
// Only rerun when the name or tagline changes.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const favicon = readFileSync(join(root, "assets/img/favicon.svg"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/js/config.js"), "utf8"), sandbox);
const brand = sandbox.window.SITE_CONFIG.brand;
const escHtml = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const tile = (bg, color, label, big, sub) => `<div style="background:${bg};color:${color};border-radius:28px;padding:26px;display:grid;align-content:space-between"><div style="font:800 15px system-ui;letter-spacing:.08em;text-transform:uppercase">${label}</div><div style="font:900 62px/1 system-ui;letter-spacing:-.03em">${big}</div><div style="font:500 17px system-ui">${sub}</div></div>`;
const card = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#f4f2fb;color:#27235c;font-family:system-ui,sans-serif;display:grid;grid-template-columns:1.25fr 1fr;gap:18px;padding:40px;box-sizing:border-box">
<div style="background:#fff;border-radius:32px;padding:44px;display:grid;align-content:center;gap:18px">
<div style="display:flex;align-items:center;gap:12px;font:800 28px system-ui"><span style="width:34px;height:34px;border-radius:50%;background:conic-gradient(#c8efdf 0 33%,#ffd8c2 0 66%,#ffe9a8 0);box-shadow:inset 0 0 0 7px #27235c"></span>${escHtml(brand.name)} <span style="font:700 14px system-ui;letter-spacing:.16em;color:#514d78">${escHtml((brand.descriptor || "").toUpperCase())}</span></div>
<div style="font:900 58px/1.05 system-ui;letter-spacing:-.03em">Home care through Georgia Medicaid, for kids <span style="color:#7b6cf6">&amp;</span> adults.</div>
<div style="font:600 22px system-ui;color:#514d78">Nursing &amp; personal care at home · Metro Atlanta</div></div>
<div style="display:grid;grid-template-rows:1fr 1fr;gap:18px">${tile("#c8efdf", "#27235c", "Children under 21", "GAPP", "Georgia Pediatric Program")}${tile("#ffd8c2", "#27235c", "Adults 21 to 64", "ICWP", "Independent Care Waiver Program")}</div>
</body></html>`;

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
