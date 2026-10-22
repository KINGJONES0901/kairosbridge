// Browser checks for the site. Serve the folder first, then run:
//   python3 -m http.server 8000      (in the site folder)
//   node tools/check.mjs [http://localhost:8000/] [screenshot-dir]
import { chromium } from "playwright";

const URL_ = process.argv[2] || "http://localhost:8000/";
const SHOTS = process.argv[3] || "";
const at = p => new URL(p, URL_).href;
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
  await page.goto(at(opts.path || ""), { waitUntil: "load" });
  return { ctx, page, errors };
}
const focusedId = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.textContent.trim().slice(0, 30)));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// ---- Home page layout ----
for (const w of [1280, 390, 320]) {
  const { ctx, page, errors } = await open(w);
  ok(await overflow(page) <= 0, `home ${w}px: no horizontal overflow`);
  ok(errors.length === 0, `home ${w}px: no console errors ${errors.join(" | ")}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${w}.png`, fullPage: true });
  await ctx.close();
}

// ---- Home page content ----
{
  const { ctx, page } = await open(1280);
  const r = await page.evaluate(() => {
    const hrefs = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute("href")).filter(h => h.length > 1);
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    const form = document.querySelector('form[name="request-care"]');
    return {
      missing: hrefs.filter(h => document.querySelectorAll(h).length !== 1),
      dupes: ids.filter((id, i) => ids.indexOf(id) !== i),
      robots: document.querySelector('meta[name="robots"]')?.content,
      h1: document.querySelectorAll("h1").length,
      forms: document.querySelectorAll("form").length,
      netlify: form?.hasAttribute("data-netlify") && form.getAttribute("netlify-honeypot") === "company" && form.querySelector('input[name="form-name"]')?.value === "request-care",
      action: form?.getAttribute("action"),
      fieldNames: [...form.elements].map(e => e.name).filter(Boolean),
      tags: [...document.querySelectorAll("[data-status]")].map(t => t.textContent),
      telOrMail: document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').length,
      bodyText: document.body.innerText,
    };
  });
  ok(r.missing.length === 0 && r.dupes.length === 0, `home: in-page links resolve, no duplicate ids ${r.missing} ${r.dupes}`);
  ok(r.robots === "noindex,nofollow" && r.h1 === 1, "home: noindex in prelaunch, one h1");
  ok(r.forms === 1 && r.netlify && r.action === "/thank-you/", "home: one Netlify form with honeypot and no-JS fallback");
  ok(!r.fieldNames.some(n => /birth|dob|diagnos|medicaid_?id|ssn|social|insurance_?id|record/i.test(n)), "home: form asks for no medical or ID details: " + r.fieldNames.join(", "));
  ok(r.tags.length === 5 && r.tags.every(t => /Planned|pending/i.test(t)), "home: every service/program reads planned/pending");
  ok(r.telOrMail === 0, "home: no contact links until configured");
  ok(!/\b(licensed and insured|accredited|24\/7|free care|Medicaid approved|now accepting)\b/i.test(r.bodyText), "home: no unsupported claims");
  for (const p of ["docs/Home-Care-Launch-Workbook.html", "Home-Care-Launch-Workbook.html"]) {
    ok((await page.request.get(at(p))).status() === 404, `owner workbook not served at /${p}`);
  }
  for (const p of ["thank-you/", "privacy/"]) {
    ok((await page.request.get(at(p))).status() === 200, `/${p} loads`);
  }
  await page.locator("summary").first().click();
  ok(await page.locator("details").first().evaluate(d => d.open), "home: FAQ opens");
  await page.keyboard.press("Tab");
  await page.goto(at(""));
  await page.keyboard.press("Tab");
  ok(await page.evaluate(() => document.activeElement.classList.contains("skip-link")), "home: skip link is first Tab stop");
  await ctx.close();
}

// ---- Request care form ----
async function fill(page) {
  await page.fill('input[name="name"]', "Test Person");
  await page.fill('input[name="phone"]', "404-000-0000");
  await page.fill('input[name="zip"]', "30303");
  await page.selectOption('select[name="who_needs_care"]', "Child (under 21)");
  await page.selectOption('select[name="program"]', "GAPP");
  await page.check('input[name="consent"]');
}
{
  const { ctx, page, errors } = await open(390);
  let posts = [];
  await page.route(at(""), (route, req) => {
    if (req.method() !== "POST") return route.continue();
    posts.push(req.postData());
    return route.fulfill({ status: posts.length === 1 ? 500 : 200, body: "ok" });
  });

  await page.locator("#request-form .submit").click();
  ok(posts.length === 0 && !(await page.locator('input[name="name"]').evaluate(e => e.validity.valid)), "form: empty submit is blocked by required fields");

  await page.check('input[value="Nurse or caregiver looking for work"]');
  ok(await page.locator("[data-care-fields]").isHidden(), "form: care questions hide for nurses and caregivers");
  await page.check('input[value="Looking for care"]');
  ok(await page.locator("[data-care-fields]").isVisible(), "form: care questions return for families");

  await fill(page);
  await page.fill('input[name="zip"]', "303");
  await page.locator("#request-form .submit").click();
  ok(posts.length === 0, "form: a 3-digit ZIP is rejected");
  await page.fill('input[name="phone"]', "call me");
  ok(!(await page.locator('input[name="phone"]').evaluate(e => e.validity.valid)), "form: a phone without digits is rejected");
  ok(await page.locator('input[name="phone"]').evaluate(e => { e.value = "(404) 000-0000"; return e.validity.valid; }), "form: a normal phone format is accepted");
  await page.fill('input[name="zip"]', "30303");

  await page.locator("#request-form .submit").click();
  await page.waitForTimeout(300);
  ok(posts.length === 1 && /is-error/.test(await page.locator(".form-status").getAttribute("class")) && await page.locator("#request-form .submit").isEnabled(), "form: a server error shows a message and lets you retry");

  await page.locator("#request-form .submit").click();
  await page.waitForTimeout(300);
  const body = new URLSearchParams(posts[1] || "");
  ok(body.get("form-name") === "request-care" && body.get("name") === "Test Person" && body.get("program") === "GAPP" && body.get("consent") === "yes", "form: posts the fields Netlify expects");
  ok(await page.locator(".form-done").isVisible() && /Thanks, Test/.test(await page.locator(".form-done").innerText()), "form: success message replaces the form");
  ok(await focusedId(page) !== "" && await page.evaluate(() => document.activeElement.classList.contains("form-done")), "form: focus moves to the success message");
  ok(errors.filter(e => !/500/.test(e)).length === 0, "form: no script errors " + errors.join(" | "));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/form-done-390.png` });
  await ctx.close();

  // Honeypot: bots that fill the hidden field send nothing.
  const bot = await open(1280);
  let botPosts = 0;
  await bot.page.route(at(""), (route, req) => { if (req.method() === "POST") { botPosts++; return route.fulfill({ status: 200 }); } return route.continue(); });
  await fill(bot.page);
  await bot.page.evaluate(() => { document.querySelector('input[name="company"]').value = "spam"; });
  await bot.page.locator("#request-form .submit").click();
  await bot.page.waitForTimeout(300);
  ok(botPosts === 0, "form: honeypot submissions are dropped");
  await bot.ctx.close();
}

// ---- Mobile menu (home) ----
for (const w of [390, 320]) {
  const { ctx, page } = await open(w);
  const toggle = page.locator(".menu-toggle");
  ok(await page.locator(".navlinks a").first().isHidden(), `home ${w}px: links collapsed by default`);
  await toggle.focus(); await page.keyboard.press("Enter");
  ok((await toggle.getAttribute("aria-expanded")) === "true", `home ${w}px: menu opens`);
  const hrefs = await page.locator(".menu a").evaluateAll(as => as.map(a => a.getAttribute("href")));
  ok(["#care", "#programs", "#questions", "#contact"].every(h => hrefs.includes(h)), `home ${w}px: menu reaches every section`);
  await page.keyboard.press("Escape");
  ok((await toggle.getAttribute("aria-expanded")) === "false" && await focusedId(page) === "Menu", `home ${w}px: Escape closes and returns focus`);
  await toggle.click();
  await page.locator('.menu a[href="#contact"]').click();
  await page.waitForTimeout(800);
  ok((await toggle.getAttribute("aria-expanded")) === "false", `home ${w}px: choosing a link closes the menu`);
  ok((await toggle.boundingBox()).height >= 44, `home ${w}px: 44px menu button`);
  await ctx.close();
}

// ---- No JavaScript ----
{
  const { ctx, page } = await open(390, { js: false });
  ok(await page.locator('.navlinks a[href="#programs"]').isVisible(), "no-JS phone: navigation visible");
  ok(await page.locator("[data-care-fields]").isVisible() && await page.locator("#request-form").isVisible(), "no-JS phone: full form visible");
  ok(await overflow(page) <= 0, "no-JS phone: no overflow");
  await ctx.close();
}

// ---- Config switches (simulated "limited" launch) ----
{
  const cfg = `window.SITE_CONFIG = {
    brand: { name: "TestBrand", descriptor: "Home Care", city: "Atlanta, Georgia" },
    mode: "limited",
    contact: { phone: "404-000-0000", email: "test@example.invalid", careersEmail: "jobs@example.invalid" },
    serviceCounties: ["Fulton", "DeKalb"],
    services: { nursing: { status: "available", effectiveDate: "2027-03-01" }, personalCare: { status: "planned" }, coordination: { status: "planned" } },
    programs: { gapp: { status: "enrolled", effectiveDate: "2027-04-01" }, icwp: { status: "target" } },
  };`;
  const { ctx, page, errors } = await open(390, { config: cfg });
  const r = await page.evaluate(() => ({
    brand: document.querySelector(".brand").innerText,
    nursing: document.querySelector('[data-service="nursing"] [data-status]').textContent,
    personal: document.querySelector('[data-service="personalCare"] [data-status]').textContent,
    gapp: document.querySelector('[data-program="gapp"] [data-status]').textContent,
    icwp: document.querySelector('[data-program="icwp"] [data-status]').textContent,
    tel: document.querySelector('a[href^="tel:"]')?.getAttribute("href"),
    area: document.querySelector('[data-faq="area"]').textContent,
  }));
  ok(r.brand.startsWith("TestBrand"), "config: brand name changes");
  ok(r.nursing === "Available since March 1, 2027" && r.personal === "Not yet available", "config: services switch independently");
  ok(r.gapp === "Participating since April 1, 2027" && /pending/.test(r.icwp), "config: GAPP and ICWP switch independently");
  ok(r.tel === "tel:4040000000", "config: phone appears once set");
  ok(r.area === "We currently serve Fulton and DeKalb counties.", "config: counties");
  ok(errors.length === 0, "config: no console errors " + errors.join(" | "));
  await ctx.close();

  const pre = await open(1280, { config: cfg.replace('mode: "limited"', 'mode: "prelaunch"') });
  ok((await pre.page.locator("[data-status]").allTextContents()).every(t => /Planned|pending/.test(t)), "config: prelaunch overrides available/enrolled flags");
  await pre.ctx.close();
}

// ---- Older design versions ----
for (const v of ["astro-0/", "astro-1/", "astro-2/"]) {
  for (const w of [1280, 390]) {
    const { ctx, page, errors } = await open(w, { path: v });
    ok(await overflow(page) <= 0 && errors.length === 0, `${v} ${w}px: no overflow, no errors ${errors.join(" | ")}`);
    if (w === 1280) {
      ok((await page.locator('meta[name="robots"]').getAttribute("content")) === "noindex,nofollow", `${v}: noindex`);
      await page.locator("#launch").focus(); await page.keyboard.press("Enter");
      ok((await page.getByRole("dialog", { name: "Preparing to launch" }).count()) === 1, `${v}: named dialog opens`);
      await page.keyboard.press("Escape");
      ok(await focusedId(page) === "launch", `${v}: Escape restores focus`);
    } else {
      await page.locator(".menu-toggle").click();
      const hrefs = await page.locator(".menu a").evaluateAll(as => as.filter(a => a.offsetParent).map(a => a.getAttribute("href")));
      ok(["#care", "#programs", "#approach", "#questions", "#contact"].every(h => hrefs.includes(h)), `${v} ${w}px: menu reaches every section`);
    }
    await ctx.close();
  }
}

// ---- Comparison pages ----
{
  const { ctx, page, errors } = await open(1280, { path: "compare/#astro-2" });
  const visible = () => page.locator("iframe.frame:not([hidden])").getAttribute("src");
  ok(await visible() === "/astro-2/", "compare: opens on the design named in the link");
  await page.keyboard.press("ArrowRight");
  ok(await visible() === "/", "compare: Astro 3 is the home page");
  await page.locator('button[data-device="phone"]').click();
  ok(await page.locator("iframe.frame:not([hidden])").evaluate(f => f.getBoundingClientRect().width) === 390, "compare: phone view is 390px");
  ok(errors.length === 0, "compare: no console errors");
  await page.goto(at("versions/"));
  for (const l of await page.locator("a.pick").evaluateAll(as => as.map(a => a.href))) {
    ok((await page.request.get(l)).status() === 200, `versions link works: ${l}`);
  }
  await ctx.close();
}

// ---- Contrast (home palette) ----
{
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  for (const [fg, bg, label] of [["#514d78", "#f4f2fb", "copy"], ["#514d78", "#ffffff", "form hints"], ["#27235c", "#c8efdf", "on mint"], ["#514d78", "#ffd8c2", "on peach"], ["#514d78", "#ffe9a8", "on sun"], ["#d8d5f3", "#27235c", "on ink"], ["#b42318", "#ffffff", "form error"]]) {
    const r = ratio(fg, bg); ok(r >= 4.5, `contrast ${label} ${r.toFixed(2)}:1`);
  }
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
