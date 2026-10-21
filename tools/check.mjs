// Browser checks for the site. Serve the folder first, then run:
//   python3 -m http.server 8000      (in the site folder)
//   node tools/check.mjs [http://localhost:8000/] [screenshot-dir]
import { chromium } from "playwright";

const URL_ = process.argv[2] || "http://localhost:8000/";
const SHOTS = process.argv[3] || "";
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) failures++; };

const browser = await chromium.launch();

async function open(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 860 }, javaScriptEnabled: opts.js !== false });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  if (opts.config) {
    await page.route("**/assets/js/config.js*", r => r.fulfill({ contentType: "text/javascript", body: opts.config }));
  }
  await page.goto(URL_, { waitUntil: "load" });
  return { ctx, page, errors };
}
const focusedId = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.textContent.trim().slice(0, 30)));

// ---- Layout at three widths ----
for (const w of [1280, 390, 320]) {
  const { ctx, page, errors } = await open(w);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 0, `${w}px: no horizontal overflow (${overflow})`);
  ok(errors.length === 0, `${w}px: no console errors ${errors.join(" | ")}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${w}.png`, fullPage: true });
  await ctx.close();
}

// ---- Static structure ----
{
  const { ctx, page } = await open(1280);
  const r = await page.evaluate(() => {
    const hrefs = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute("href")).filter(h => h.length > 1);
    const missing = hrefs.filter(h => document.querySelectorAll(h).length !== 1);
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    const ext = [...document.querySelectorAll('a[target="_blank"]')].map(a => ({ href: a.href, rel: a.rel }));
    return {
      missing, dupes, ext,
      robots: document.querySelector('meta[name="robots"]')?.content,
      title: document.title,
      forms: document.querySelectorAll("form, input, textarea, select").length,
      h1: document.querySelectorAll("h1").length,
      telOrMail: document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').length,
      notice: document.querySelector("#site-notice").textContent,
      tags: [...document.querySelectorAll("[data-status]")].map(t => t.textContent),
      bodyText: document.body.innerText,
    };
  });
  ok(r.missing.length === 0, `in-page links all hit a unique id ${r.missing}`);
  ok(r.dupes.length === 0, `no duplicate ids ${r.dupes}`);
  ok(r.ext.length === 2 && r.ext.every(e => /noopener/.test(e.rel) && /^https:\/\/(www\.mmis\.georgia\.gov|georgia\.gov)\//.test(e.href)), "external links are official Georgia sites, noopener");
  ok(r.robots === "noindex,nofollow", "robots noindex in prelaunch");
  ok(r.title === "KairoBridge Home Care | Care begins at home", "title preserved");
  ok(r.forms === 0, "no form fields collect data in prelaunch");
  ok(r.h1 === 1, "single h1");
  ok(r.telOrMail === 0, "no contact links when none are configured");
  ok(/PREPARING TO LAUNCH/.test(r.notice), "prelaunch notice shown");
  ok(r.tags.every(t => /Planned|pending/i.test(t)), "every service/program reads planned/pending: " + r.tags.join(", "));
  ok(!/\b(licensed and insured|accredited|24\/7|free care|Medicaid approved)\b/i.test(r.bodyText), "no unsupported claims in copy");
  for (const p of ["/docs/Home-Care-Launch-Workbook.html", "/Home-Care-Launch-Workbook.html"]) {
    const res = await page.request.get(new URL(p, URL_).href);
    ok(res.status() === 404, `owner workbook not served at ${p}`);
  }

  // FAQ: keyboard and pointer
  const summary = page.locator("summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  ok(await page.locator("details").first().evaluate(d => d.open), "FAQ opens with Enter");
  await page.keyboard.press(" ");
  ok(!(await page.locator("details").first().evaluate(d => d.open)), "FAQ closes with Space");
  await page.locator("summary").nth(2).click();
  ok(await page.locator("details").nth(2).evaluate(d => d.open), "FAQ opens on click");

  // Dialog
  await page.locator("#launch").focus();
  await page.keyboard.press("Enter");
  ok(await page.locator("#status").evaluate(d => d.open), "dialog opens from keyboard");
  const name = await page.locator("#status").evaluate(d => document.getElementById(d.getAttribute("aria-labelledby")).textContent);
  ok(name === "Preparing to launch", "dialog has accessible name");
  ok((await page.getByRole("dialog", { name: "Preparing to launch" }).count()) === 1, "dialog exposed by role and name");
  ok(await focusedId(page) === "close", "focus moves into dialog");
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  const inside = await page.evaluate(() => !document.activeElement || document.activeElement === document.body || !!document.activeElement.closest("dialog"));
  ok(inside, "Tab does not reach page content behind the dialog");
  await page.keyboard.press("Escape");
  ok(!(await page.locator("#status").evaluate(d => d.open)), "Escape closes dialog");
  ok(await focusedId(page) === "launch", "focus returns to trigger after Escape");
  await page.locator("#launch").click();
  await page.locator("#close").click();
  ok(await focusedId(page) === "launch", "focus returns to trigger after Close");
  await page.locator("#launch").click();
  await page.mouse.click(5, 5);
  ok(!(await page.locator("#status").evaluate(d => d.open)), "backdrop click closes dialog");

  // Skip link
  await page.keyboard.press("Tab");
  await page.goto(URL_);
  await page.keyboard.press("Tab");
  ok(await page.evaluate(() => document.activeElement.classList.contains("skip-link")), "skip link is first Tab stop");
  ok(await page.locator(".menu-toggle").isHidden(), "menu button hidden on desktop");
  await ctx.close();
}

// ---- Mobile menu ----
for (const w of [390, 320]) {
  const { ctx, page } = await open(w);
  const toggle = page.locator(".menu-toggle");
  ok(await toggle.isVisible(), `${w}px: menu button visible`);
  ok(await page.locator(".navlinks a").first().isHidden(), `${w}px: links collapsed by default`);
  const box = await toggle.boundingBox();
  ok(box.height >= 44, `${w}px: menu button touch target ${box.height}px`);
  await toggle.focus(); await page.keyboard.press("Enter");
  ok((await toggle.getAttribute("aria-expanded")) === "true", `${w}px: menu opens, aria-expanded true`);
  ok(await page.evaluate(() => document.activeElement.getAttribute("href") === "#care"), `${w}px: focus moves to first link`);
  if (SHOTS && w === 390) await page.screenshot({ path: `${SHOTS}/menu-390.png` });
  const visible = await page.locator(".menu a").evaluateAll(as => as.map(a => a.getAttribute("href")));
  ok(["#care", "#programs", "#approach", "#questions", "#contact"].every(h => visible.includes(h)), `${w}px: menu reaches all sections`);
  await page.keyboard.press("Escape");
  ok((await toggle.getAttribute("aria-expanded")) === "false" && await focusedId(page) === "Menu", `${w}px: Escape closes and returns focus`);
  await toggle.click();
  await page.locator('.menu a[href="#questions"]').click();
  await page.waitForTimeout(800);
  ok((await toggle.getAttribute("aria-expanded")) === "false", `${w}px: choosing a link closes the menu`);
  const top = await page.locator("#questions").evaluate(e => e.getBoundingClientRect().top);
  ok(Math.abs(top) < 80, `${w}px: link scrolls to section (${Math.round(top)})`);
  await ctx.close();
}

// ---- No JavaScript ----
{
  const { ctx, page } = await open(390, { js: false });
  ok(await page.locator('.navlinks a[href="#programs"]').isVisible(), "no-JS phone: navigation links visible");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 0, "no-JS phone: no overflow");
  await ctx.close();
}

// ---- Config switches (simulated "limited" launch) ----
{
  const cfg = `window.SITE_CONFIG = {
    brand: { name: "TestBrand", descriptor: "Home Care", city: "Atlanta, Georgia" },
    mode: "limited",
    contact: { phone: "404-000-0000", email: "test@example.invalid", hours: "Weekdays", careersEmail: "jobs@example.invalid" },
    license: { description: "test permit" },
    serviceCounties: ["Fulton", "DeKalb"],
    services: { nursing: { status: "available", effectiveDate: "2027-03-01" }, personalCare: { status: "planned" }, coordination: { status: "planned" } },
    programs: { gapp: { status: "enrolled", effectiveDate: "2027-04-01" }, icwp: { status: "target" } },
  };`;
  const { ctx, page, errors } = await open(390, { config: cfg });
  const r = await page.evaluate(() => ({
    brand: document.querySelector(".brand").innerText,
    title: document.title,
    nursing: document.querySelector('[data-service="nursing"] [data-status]').textContent,
    personal: document.querySelector('[data-service="personalCare"] [data-status]').textContent,
    gapp: document.querySelector('[data-program="gapp"] [data-status]').textContent,
    icwp: document.querySelector('[data-program="icwp"] [data-status]').textContent,
    tel: document.querySelector('a[href^="tel:"]')?.getAttribute("href"),
    mail: [...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute("href")),
    area: document.querySelector('[data-faq="area"]').textContent,
    accepting: document.querySelector('[data-faq="accepting"]').textContent,
  }));
  ok(r.brand.startsWith("TestBrand") && r.title.startsWith("TestBrand Home Care"), "brand name changes from config");
  ok(r.nursing === "Available since March 1, 2027", "available service shows effective date");
  ok(r.personal === "Not yet available", "other services stay unavailable");
  ok(r.gapp === "Participating since April 1, 2027", "enrolled program shows participation");
  ok(/pending/.test(r.icwp), "ICWP stays pending independently of GAPP");
  ok(r.tel === "tel:4040000000" && r.mail.includes("mailto:test@example.invalid") && r.mail.includes("mailto:jobs@example.invalid"), "contact links appear once configured");
  ok(r.area === "We currently serve Fulton and DeKalb counties.", "counties from config");
  ok(/in-home nursing/.test(r.accepting), "FAQ names only available services");
  await page.locator("#launch").click();
  const dlg = await page.locator("#status").innerText();
  ok(/In-home nursing: available/.test(dlg) && /ICWP: participation pending/.test(dlg), "status dialog reflects config");
  ok(errors.length === 0, "no console errors with launch config");
  if (SHOTS) { await page.keyboard.press("Escape"); await page.screenshot({ path: `${SHOTS}/limited-390.png`, fullPage: true }); }
  await ctx.close();

  // Prelaunch must ignore "available"/"enrolled" flags.
  const { ctx: c2, page: p2 } = await open(1280, { config: cfg.replace('mode: "limited"', 'mode: "prelaunch"') });
  const tags = await p2.locator("[data-status]").allTextContents();
  ok(tags.every(t => /Planned|pending/.test(t)), "prelaunch mode overrides service/program flags");
  ok((await p2.locator('a[href^="tel:"]').count()) === 0, "prelaunch hides phone unless explicitly allowed");
  await c2.close();
}

// ---- Contrast ----
{
  const { ctx, page } = await open(1280);
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  for (const [fg, bg, label] of [["#5c6f67", "#faf8f1", "body copy"], ["#52645c", "#e5e9dc", "copy on pale green"], ["#5f7258", "#faf8f1", "eyebrow"], ["#536650", "#e5e9dc", "eyebrow on pale"], ["#7c6845", "#faf8f1", "step numbers"], ["#183e39", "#e5e9dc", "ink on pale"]]) {
    const r = ratio(fg, bg); ok(r >= 4.5, `contrast ${label} ${r.toFixed(2)}:1`);
  }
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
