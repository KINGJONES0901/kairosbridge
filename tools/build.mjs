// Builds every page of the site from assets/js/config.js.
//   node tools/build.mjs
// Netlify runs this on each deploy (see netlify.toml), so editing config.js on
// GitHub is enough. Run it locally to preview, and commit the generated files.
// Page wording lives in this file; don't hand-edit the generated .html files.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_V = 5; // bump when home.css, app.js or form.js change

// ---------- Config ----------
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "assets/js/config.js"), "utf8"), sandbox);
const C = sandbox.window.SITE_CONFIG;
const MODE = ["prelaunch", "limited", "operational"].includes(C.mode) ? C.mode : "prelaunch";
const PRE = MODE === "prelaunch";
const SITE = String(C.siteUrl || "").replace(/\/+$/, "");
const NAME = C.brand.name || "CareLife 365";
const FULL = C.brand.fullName || `${NAME} ${C.brand.descriptor || "Home Care"}`;
const contact = C.contact || {};
const addr = typeof contact.address === "object" && contact.address ? contact.address : {};
const showContact = !PRE || C.showContactInPrelaunch === true;
const PHONE = showContact ? (contact.phone || "") : "";
const EMAIL = showContact ? (contact.email || "") : "";
const FAX = showContact ? (contact.fax || "") : "";
const HOURS = showContact ? (contact.hours || "") : "";
const STREET = showContact ? (addr.street || "") : "";
const counties = (C.serviceCounties || []).filter(Boolean);
const creds = C.credentials || {};
const people = (C.people || []).filter(p => p && p.name);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tel = p => "tel:" + p.replace(/[^\d+]/g, "");
const fmtDate = iso => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
};
const listWords = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + (a.length > 2 ? "," : "") + " and " + a.at(-1);
const areaText = counties.length ? listWords(counties) + (counties.length > 1 ? " counties" : " County") : "metro Atlanta";
const cityLine = [addr.city || "Atlanta", addr.region || "GA"].join(", ");

function serviceStatus(key, es) {
  const s = (C.services || {})[key] || {};
  if (!PRE && s.status === "available") {
    const d = fmtDate(s.effectiveDate);
    return { text: es ? "Disponible" : d ? `Available since ${d}` : "Available", active: true };
  }
  return { text: PRE ? (es ? "Planificado" : "Planned") : (es ? "Aún no disponible" : "Not yet available"), active: false };
}
function programStatus(key, es) {
  const p = (C.programs || {})[key] || {};
  if (!PRE && p.status === "enrolled") {
    const d = fmtDate(p.effectiveDate);
    return { text: es ? "Proveedor participante" : d ? `Participating since ${d}` : "Participating provider", active: true };
  }
  if (p.status === "not-pursuing") return { text: es ? "No ofrecido" : "Not offered by our agency", active: false };
  return { text: es ? "Inscripción pendiente" : "Target program · participation pending", active: false };
}
const badge = st => `<span class="badge${st.active ? " is-active" : ""}" data-status>${esc(st.text)}</span>`;

// ---------- Shared pieces ----------
const NOTICE = {
  prelaunch: ["OPENING SOON IN METRO ATLANTA · Not yet providing care", "PRÓXIMA APERTURA EN EL ÁREA DE ATLANTA · Aún no brindamos atención"],
  limited: ["NOW SERVING FOR SELECTED SERVICES · Check each service’s status", "ATENDEMOS ALGUNOS SERVICIOS · Consulte el estado de cada servicio"],
  operational: ["", ""],
};

const NAV_EN = [["/#care", "Services"], ["/gapp/", "GAPP"], ["/icwp/", "ICWP"], ["/careers/", "Careers"], ["/referrals/", "Referrals"]];
const NAV_ES = [["/es/#servicios", "Servicios"], ["/es/#programas", "Programas"], ["/es/#preguntas", "Preguntas"], ["/", "English"]];

function header(path, es) {
  const nav = es ? NAV_ES : NAV_EN;
  const cta = es ? ["/es/#contacto", "Solicitar atención"] : ["/#contact", "Request care"];
  return `<a class="skip-link" href="#main">${es ? "Ir al contenido" : "Skip to main content"}</a>
${(es ? NOTICE[MODE][1] : NOTICE[MODE][0]) ? `<div class="notice" id="site-notice">${esc(es ? NOTICE[MODE][1] : NOTICE[MODE][0])}</div>` : ""}
<header class="site-header" id="top">
  <nav class="nav" aria-label="${es ? "Navegación principal" : "Main navigation"}">
    <a class="brand" href="${es ? "/es/" : "/"}"><span class="brand-dot" aria-hidden="true"></span><span data-brand-name>${esc(NAME)}</span><small data-brand-descriptor>${esc((C.brand.descriptor || "Home Care").toUpperCase())}</small></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu"><span class="menu-icon" aria-hidden="true"></span>${es ? "Menú" : "Menu"}</button>
    <div class="menu" id="site-menu">
      <ul class="navlinks">
${nav.map(([h, t]) => `        <li><a href="${h}"${path !== "/" && h === path ? ' aria-current="page"' : ""}${t === "English" ? ' lang="en"' : ""}>${t}</a></li>`).join("\n")}
      </ul>
      ${PHONE ? `<a class="pill pill-line nav-call" href="${tel(PHONE)}">${es ? "Llamar" : "Call"} ${esc(PHONE)}</a>` : ""}
      <a class="pill pill-dark nav-cta" href="${cta[0]}">${cta[1]}</a>
    </div>
  </nav>
</header>`;
}

function footer(es) {
  const t = es
    ? { svc: "Servicios", prog: "Programas", co: "Empresa", area: "Servimos", emerg: "En caso de emergencia, llame al 911.", priv: "Privacidad", lic: "Licencia", status: PRE ? "Próxima apertura. Inscripción en Medicaid pendiente." : "" }
    : { svc: "Services", prog: "Programs", co: "Company", area: "Serving", emerg: "For an emergency, call 911.", priv: "Privacy", lic: "License", status: PRE ? "Opening soon. Medicaid program participation pending." : "" };
  const contactLines = [
    PHONE && `<a href="${tel(PHONE)}">${esc(PHONE)}</a>`,
    EMAIL && `<a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>`,
    FAX && `${es ? "Fax" : "Fax"}: ${esc(FAX)}`,
    HOURS && esc(HOURS),
    STREET ? esc(`${STREET}, ${cityLine}${addr.postalCode ? " " + addr.postalCode : ""}`) : esc(cityLine),
  ].filter(Boolean);
  const credLine = [creds.licenseNumber && `${t.lic} #${esc(creds.licenseNumber)}`, creds.npi && `NPI ${esc(creds.npi)}`].filter(Boolean).join(" · ");
  return `<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <p class="footer-name"><span data-brand-full>${esc(C.brand.legalName || FULL)}</span></p>
      <p>${contactLines.join("<br>")}</p>
      <p>${t.area} ${esc(areaText)}</p>
    </div>
    <nav aria-label="${t.svc}"><p class="footer-h">${t.svc}</p><ul>
      <li><a href="/services/skilled-nursing/">${es ? "Enfermería especializada" : "Skilled nursing"}</a></li>
      <li><a href="/services/personal-care/">${es ? "Cuidado personal" : "Personal care"}</a></li>
    </ul></nav>
    <nav aria-label="${t.prog}"><p class="footer-h">${t.prog}</p><ul>
      <li><a href="/gapp/">GAPP</a></li>
      <li><a href="/icwp/">ICWP</a></li>
    </ul></nav>
    <nav aria-label="${t.co}"><p class="footer-h">${t.co}</p><ul>
      <li><a href="/about/">${es ? "Nosotros" : "About"}</a></li>
      <li><a href="/careers/">${es ? "Empleos" : "Careers"}</a></li>
      <li><a href="/referrals/">${es ? "Referencias" : "Referrals"}</a></li>
      <li><a href="/privacy/">${t.priv}</a></li>
      <li>${es ? '<a href="/" lang="en" hreflang="en">English</a>' : '<a href="/es/" lang="es" hreflang="es">Español</a>'}</li>
    </ul></nav>
  </div>
  <p class="footer-fine">${credLine ? credLine + " · " : ""}<span data-footer-status>${t.status}</span> ${t.emerg}</p>
</footer>`;
}

// ---------- Google data ----------
function businessSchema() {
  const b = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": SITE + "/#business",
    name: C.brand.legalName || FULL,
    url: SITE + "/",
    logo: SITE + "/assets/img/apple-touch-icon.png",
    image: SITE + "/assets/img/social-card.png",
    description: "In-home skilled nursing and personal care for children and adults through Georgia Medicaid GAPP and ICWP.",
    areaServed: counties.length
      ? counties.map(c => ({ "@type": "AdministrativeArea", name: `${c} County, Georgia` }))
      : { "@type": "City", name: "Atlanta, Georgia" },
    knowsLanguage: ["en", "es"],
  };
  if (PHONE) b.telephone = "+1-" + PHONE.replace(/\D/g, "").replace(/^1/, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  if (EMAIL) b.email = EMAIL;
  b.address = { "@type": "PostalAddress", addressLocality: addr.city || "Atlanta", addressRegion: addr.region || "GA", addressCountry: "US" };
  if (STREET) { b.address.streetAddress = STREET; if (addr.postalCode) b.address.postalCode = addr.postalCode; }
  if ((C.sameAs || []).length) b.sameAs = C.sameAs;
  if (creds.npi) b.identifier = { "@type": "PropertyValue", propertyID: "NPI", value: creds.npi };
  return b;
}
const crumbs = items => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })),
});

// ---------- Layout ----------
function page({ path, title, description, body, schema = [], es = false, noindex = false, alternate }) {
  const robots = C.indexing === true && !noindex ? "index,follow" : "noindex,nofollow";
  const ld = [businessSchema(), ...schema].map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n  ");
  return `<!doctype html>
<html lang="${es ? "es" : "en"}" data-built>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="${robots}">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${path}">
${alternate ? `  <link rel="alternate" hreflang="en" href="${SITE}/">\n  <link rel="alternate" hreflang="es" href="${SITE}/es/">\n  <link rel="alternate" hreflang="x-default" href="${SITE}/">\n` : ""}  <meta name="theme-color" content="#27235c">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE}${path}">
  <meta property="og:site_name" content="${esc(FULL)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/assets/img/social-card.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(FULL)}: Medicaid home care for kids and adults in metro Atlanta.">
  <meta property="og:locale" content="${es ? "es_US" : "en_US"}">
  <meta name="twitter:card" content="summary_large_image">
  <script>document.documentElement.classList.add("js")</script>
  <link rel="stylesheet" href="/assets/css/home.css?v=${ASSET_V}">
  <script src="/assets/js/config.js?v=${ASSET_V}" defer></script>
  <script src="/assets/js/app.js?v=${ASSET_V}" defer></script>
  <script src="/assets/js/form.js?v=${ASSET_V}" defer></script>
  ${ld}
</head>
<body>
${header(path, es)}

<main id="main" tabindex="-1">
${body}
</main>

${footer(es)}
</body>
</html>
`;
}

// Inner page hero with breadcrumb.
const pageHero = (crumbsList, h1, lead, extra = "") => `  <nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbsList.map(([n, h], i) => i === crumbsList.length - 1 ? `<li aria-current="page">${n}</li>` : `<li><a href="${h}">${n}</a></li>`).join("")}</ol></nav>
  <section class="page-hero">
    <h1>${h1}</h1>
    <p class="lead">${lead}</p>
    ${extra}
  </section>`;

const ctaBand = (es) => `  <section class="section">
    <div class="cta-band">
      <div>
        <h2>${es ? "¿Preguntas sobre atención en casa?" : "Questions about care at home?"}</h2>
        <p>${es ? "Envíenos una solicitud y le llamaremos." : PRE ? "Send a request. We’re opening soon and will call you back." : "Send a request and we’ll call you back."}</p>
      </div>
      <div class="cta-actions">
        <a class="pill pill-light" href="${es ? "/es/#contacto" : "/#contact"}">${es ? "Solicitar atención" : "Request care"}</a>
        ${PHONE ? `<a class="pill pill-outline-light" href="${tel(PHONE)}">${es ? "Llamar" : "Call"} ${esc(PHONE)}</a>` : ""}
      </div>
    </div>
  </section>`;

// ---------- Forms ----------
const consentLine = es => es ? "Acepto que me contacten por teléfono, mensaje de texto o correo electrónico sobre esta solicitud." : "OK to contact me by phone, text or email about this request.";
const formFoot = es => `<p class="fine">${es ? 'Vea nuestro <a href="/privacy/" lang="en">aviso de privacidad</a>. En caso de emergencia, llame al 911.' : 'See our <a href="/privacy/">privacy note</a>. For an emergency, call 911.'}</p>`;
const hidden = (name, honeypot = "company") => `<input type="hidden" name="form-name" value="${name}">
          <p class="hp" hidden><label>Company <input name="${honeypot}" tabindex="-1" autocomplete="off"></label></p>`;

function requestForm(es) {
  const L = es
    ? { iam: "Soy", f: "Busco atención", r: "Refiero a un cliente", n: "Enfermera(o) o cuidador(a)", who: "¿Quién necesita atención?", prog: "Programa de Medicaid", choose: "Elija…", name: "Nombre", phone: "Teléfono", email: "Correo electrónico", opt: "(opcional)", zip: "Código postal", more: "¿Algo más?", hint: "Por favor no incluya diagnósticos, números de Medicaid ni expedientes médicos.", send: "Enviar solicitud",
        whoOpts: [["Child (under 21)", "Niño(a) (menor de 21)"], ["Adult (21 to 64)", "Adulto (21 a 64)"], ["Senior (65+)", "Persona mayor (65+)"], ["Not sure", "No estoy seguro(a)"]],
        progOpts: [["GAPP", "GAPP"], ["ICWP", "ICWP"], ["Other Medicaid", "Otro Medicaid"], ["Not sure", "No estoy seguro(a)"], ["No Medicaid", "Sin Medicaid"]],
        done: "Gracias. Recibimos su solicitud.", doneP: PRE ? "Abriremos pronto y le llamaremos al número que nos dio. En caso de emergencia, llame al 911." : "Le llamaremos pronto. En caso de emergencia, llame al 911.", err: "Lo sentimos, no se pudo enviar. Revise su conexión e inténtelo de nuevo.", sending: "Enviando…" }
    : { iam: "I am", f: "Looking for care", r: "Referring a client", n: "A nurse or caregiver", who: "Who needs care", prog: "Medicaid program", choose: "Choose…", name: "Name", phone: "Phone", email: "Email", opt: "(optional)", zip: "ZIP code", more: "Anything else?", hint: "Please don’t include diagnoses, Medicaid ID numbers or medical records.", send: "Send request",
        whoOpts: [["Child (under 21)"], ["Adult (21 to 64)"], ["Senior (65+)"], ["Not sure"]],
        progOpts: [["GAPP"], ["ICWP"], ["Other Medicaid"], ["Not sure"], ["No Medicaid"]],
        done: "Thanks{name}. We got your request.", doneP: PRE ? "We’re opening soon and will call you at the number you gave us. For an emergency, call 911." : "We’ll call you soon. For an emergency, call 911.", err: "Sorry, that didn’t send. Please check your connection and try again.", sending: "Sending…" };
  const opts = list => list.map(([v, label]) => label ? `<option value="${esc(v)}">${esc(label)}</option>` : `<option>${esc(v)}</option>`).join("");
  return `<form class="form" id="request-form" name="request-care" method="POST" action="/thank-you/" data-netlify="true" netlify-honeypot="company"
          data-done="${esc(L.done)}" data-done-text="${esc(L.doneP)}" data-error="${esc(L.err)}" data-sending="${esc(L.sending)}">
          ${hidden("request-care")}
          <input type="hidden" name="language" value="${es ? "Spanish" : "English"}">
          <fieldset class="choice">
            <legend>${L.iam}</legend>
            <label><input type="radio" name="i_am" value="Looking for care" required checked> ${L.f}</label>
            <label><input type="radio" name="i_am" value="Referring a client"> ${L.r}</label>
            <label><input type="radio" name="i_am" value="Nurse or caregiver looking for work" data-hides-care> ${L.n}</label>
          </fieldset>
          <div class="row" data-care-fields>
            <label>${L.who}
              <select name="who_needs_care"><option value="">${L.choose}</option>${opts(L.whoOpts)}</select>
            </label>
            <label>${L.prog}
              <select name="program"><option value="">${L.choose}</option>${opts(L.progOpts)}</select>
            </label>
          </div>
          <div class="row">
            <label>${L.name} <input name="name" autocomplete="name" required maxlength="80"></label>
            <label>${L.phone} <input name="phone" type="tel" autocomplete="tel" required inputmode="tel" pattern="[0-9 \\(\\)+.\\-]{10,20}" maxlength="20"></label>
          </div>
          <div class="row">
            <label><span>${L.email} <span class="opt">${L.opt}</span></span> <input name="email" type="email" autocomplete="email" maxlength="120"></label>
            <label>${L.zip} <input name="zip" autocomplete="postal-code" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5"></label>
          </div>
          <label><span>${L.more} <span class="opt">${L.opt}</span></span>
            <textarea name="message" rows="3" maxlength="500" aria-describedby="message-hint"></textarea>
          </label>
          <p class="hint" id="message-hint">${L.hint}</p>
          <label class="consent"><input type="checkbox" name="consent" value="yes" required> ${consentLine(es)}</label>
          <button class="pill pill-dark submit" type="submit">${L.send}</button>
          <p class="form-status" role="status" aria-live="polite"></p>
          ${formFoot(es)}
        </form>`;
}

function careersForm() {
  return `<form class="form" id="careers-form" name="careers" method="POST" action="/thank-you/" data-netlify="true" netlify-honeypot="company"
          data-done="Thanks{name}. We got your info." data-done-text="${PRE ? "We’re building our first team and will reach out as we start hiring." : "We’ll be in touch about openings that fit."}" data-error="Sorry, that didn’t send. Please check your connection and try again." data-sending="Sending…">
          ${hidden("careers")}
          <div class="row">
            <label>Name <input name="name" autocomplete="name" required maxlength="80"></label>
            <label>Phone <input name="phone" type="tel" autocomplete="tel" required inputmode="tel" pattern="[0-9 \\(\\)+.\\-]{10,20}" maxlength="20"></label>
          </div>
          <div class="row">
            <label><span>Email <span class="opt">(optional)</span></span> <input name="email" type="email" autocomplete="email" maxlength="120"></label>
            <label>ZIP code <input name="zip" autocomplete="postal-code" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5"></label>
          </div>
          <div class="row">
            <label>Role
              <select name="role" required><option value="">Choose…</option><option>Registered Nurse (RN)</option><option>Licensed Practical Nurse (LPN)</option><option>Certified Nursing Assistant (CNA)</option><option>Personal Care Aide (PCA)</option><option>Office or other</option></select>
            </label>
            <label>Years of experience
              <select name="experience" required><option value="">Choose…</option><option>Less than 1</option><option>1 to 2</option><option>3 to 5</option><option>More than 5</option></select>
            </label>
          </div>
          <fieldset class="choice">
            <legend>Experience with <span class="opt">(optional, pick any)</span></legend>
            <label><input type="checkbox" name="experience_with" value="Pediatrics"> Pediatrics</label>
            <label><input type="checkbox" name="experience_with" value="Trach/vent"> Trach / vent</label>
            <label><input type="checkbox" name="experience_with" value="G-tube"> G-tube</label>
            <label><input type="checkbox" name="experience_with" value="Adults with disabilities"> Adults with disabilities</label>
          </fieldset>
          <fieldset class="choice">
            <legend>Available <span class="opt">(optional, pick any)</span></legend>
            <label><input type="checkbox" name="availability" value="Days"> Days</label>
            <label><input type="checkbox" name="availability" value="Nights"> Nights</label>
            <label><input type="checkbox" name="availability" value="Weekends"> Weekends</label>
          </fieldset>
          <label><span>Anything else? <span class="opt">(optional)</span></span>
            <textarea name="message" rows="3" maxlength="500" aria-describedby="careers-hint"></textarea>
          </label>
          <p class="hint" id="careers-hint">Don’t send your Social Security number, license number or documents here. We’ll ask for what’s needed during hiring.</p>
          <label class="consent"><input type="checkbox" name="consent" value="yes" required> OK to contact me by phone, text or email about jobs.</label>
          <button class="pill pill-dark submit" type="submit">Send my info</button>
          <p class="form-status" role="status" aria-live="polite"></p>
          ${formFoot(false)}
        </form>`;
}

function referralForm() {
  return `<form class="form" id="referral-form" name="referral-contact" method="POST" action="/thank-you/" data-netlify="true" netlify-honeypot="company"
          data-done="Thanks{name}. We’ll call you." data-done-text="${PRE ? "We’re opening soon. We’ll call to talk through referrals and take patient details over a secure channel." : "We’ll call to take the referral details over a secure channel."}" data-error="Sorry, that didn’t send. Please check your connection and try again." data-sending="Sending…">
          ${hidden("referral-contact")}
          <div class="row">
            <label>Your name <input name="name" autocomplete="name" required maxlength="80"></label>
            <label>Organization <input name="organization" autocomplete="organization" required maxlength="120"></label>
          </div>
          <div class="row">
            <label>Your role
              <select name="role" required><option value="">Choose…</option><option>Case manager</option><option>Hospital discharge planner</option><option>Physician or practice staff</option><option>Social worker</option><option>Other</option></select>
            </label>
            <label>Program
              <select name="program"><option value="">Choose…</option><option>GAPP</option><option>ICWP</option><option>Other or not sure</option></select>
            </label>
          </div>
          <div class="row">
            <label>Phone <input name="phone" type="tel" autocomplete="tel" required inputmode="tel" pattern="[0-9 \\(\\)+.\\-]{10,20}" maxlength="20"></label>
            <label><span>Email <span class="opt">(optional)</span></span> <input name="email" type="email" autocomplete="email" maxlength="120"></label>
          </div>
          <label><span>Patient’s county <span class="opt">(optional)</span></span> <input name="county" maxlength="40"></label>
          <p class="hint">Please don’t include the patient’s name, date of birth, Medicaid ID or health details. We’ll call you and take those over a secure channel.</p>
          <label class="consent"><input type="checkbox" name="consent" value="yes" required> OK to contact me by phone or email about this referral.</label>
          <button class="pill pill-dark submit" type="submit">Ask us to call</button>
          <p class="form-status" role="status" aria-live="polite"></p>
          ${formFoot(false)}
        </form>`;
}

// ---------- Pages ----------
const pages = [];
const svcCard = (key, cls, icon, h, p, href, es) => `      <article class="card ${cls}" data-service="${key}">
        <span class="emoji" aria-hidden="true">${icon}</span>
        <h3>${h}</h3>
        ${badge(serviceStatus(key, es))}
        <p>${p}</p>
        ${href ? `<a class="card-link" href="${href}">${es ? "Más información" : "Learn more"} <span aria-hidden="true">→</span></a>` : ""}
      </article>`;
const progCard = (key, cls, h, sub, p, href, es) => `      <article class="panel ${cls}" data-program="${key}">
        <h3>${h} <span>${sub}</span></h3>
        <p>${p}</p>
        ${badge(programStatus(key, es))}
        <a class="card-link" href="${href}">${es ? "Más sobre " + h : "How " + h + " works"} <span aria-hidden="true">→</span></a>
      </article>`;

// Home
{
  const accepting = PRE
    ? "Not yet. We’re finishing licensing and Medicaid enrollment. Send a request and we’ll call you when we open."
    : `Yes, for the services marked available. Send a request${PHONE ? " or call " + PHONE : ""}.`;
  pages.push({
    file: "index.html", path: "/", alternate: true,
    title: `${FULL} | GAPP & ICWP home care in Atlanta`,
    description: `In-home nursing and personal care for children and adults through Georgia Medicaid GAPP and ICWP in ${areaText}.${PRE ? " Opening soon." : ""}`,
    schema: [{ "@context": "https://schema.org", "@type": "WebSite", name: FULL, url: SITE + "/", inLanguage: ["en", "es"] }],
    body: `  <section class="bento" aria-labelledby="hero-title">
    <div class="tile tile-hero">
      <p class="tag-line"><span data-brand-city>${esc(C.brand.city || "Atlanta, Georgia")}</span> · Medicaid home care</p>
      <h1 id="hero-title">Home care through Georgia Medicaid, for kids <span class="and">&amp;</span> adults.</h1>
      <p class="lead">Nursing and personal care at home, through GAPP and ICWP.</p>
      <div class="actions">
        <a class="pill pill-dark" href="#contact">Request care</a>
        ${PHONE ? `<a class="pill pill-line" href="${tel(PHONE)}">Call ${esc(PHONE)}</a>` : `<a class="pill pill-line" href="#programs">Programs</a>`}
      </div>
    </div>
    <a class="tile tile-mint" href="/gapp/">
      <span class="tile-label">Children under 21</span>
      <strong>GAPP</strong>
      <span>Georgia Pediatric Program</span>
    </a>
    <a class="tile tile-peach" href="/icwp/">
      <span class="tile-label">Adults 21 to 64</span>
      <strong>ICWP</strong>
      <span>Independent Care Waiver Program</span>
    </a>
    <div class="tile tile-ink">
      <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M6 70 Q60 4 114 70" fill="none" stroke="#c8efdf" stroke-width="6" stroke-linecap="round"/><path d="M24 70V48M42 70V32M60 70V26M78 70V32M96 70V48" stroke="#ffd8c2" stroke-width="4" stroke-linecap="round"/></svg>
      <span>RN &amp; LPN nursing<br>Personal care<br>Care coordination</span>
    </div>
    <div class="tile tile-sun">
      <span class="tile-label">Status</span>
      <strong class="small-strong">${PRE ? "Opening soon" : MODE === "limited" ? "Now serving" : "Open"}</strong>
      <span>${PRE ? "Licensing and Medicaid enrollment in progress." : `Serving ${esc(areaText)}.`}</span>
    </div>
  </section>

  <section class="section" id="care" aria-labelledby="care-title">
    <h2 id="care-title">Services</h2>
    <div class="cards">
${svcCard("nursing", "card-ink", "✚", "Skilled nursing", "RN and LPN care at home, following physician orders.", "/services/skilled-nursing/")}
${svcCard("personalCare", "card-mint", "♡", "Personal care", "Bathing, dressing, meals and getting around safely.", "/services/personal-care/")}
${svcCard("coordination", "card-peach", "☰", "Care coordination", "One contact for orders, authorizations and scheduling.", "")}
    </div>
  </section>

  <section class="section" id="programs" aria-labelledby="programs-title">
    <h2 id="programs-title">Medicaid programs</h2>
    <div class="programs">
${progCard("gapp", "panel-mint", "GAPP", "Georgia Pediatric Program", "Medically fragile children under 21 who need nursing or personal care at home.", "/gapp/")}
${progCard("icwp", "panel-peach", "ICWP", "Independent Care Waiver Program", "Adults 21 to 64 with severe physical disabilities or a brain injury.", "/icwp/")}
    </div>
  </section>

  <section class="section" id="contact" aria-labelledby="contact-title">
    <div class="contact-card">
      <div class="contact-copy">
        <h2 id="contact-title">Request care</h2>
        <p>${PRE ? "Tell us what you need. We’re opening soon and will call you back as we start taking clients." : "Tell us what you need and we’ll call you back."}</p>
        ${PHONE ? `<p class="call-line">Prefer to call? <a href="${tel(PHONE)}">${esc(PHONE)}</a>${HOURS ? `<br><span>${esc(HOURS)}</span>` : ""}</p>` : ""}
      </div>
      <div class="form-card">
        ${requestForm(false)}
      </div>
    </div>
  </section>

  <section class="section split-tiles" aria-label="Referrals and careers">
    <a class="tile tile-line" href="/referrals/">
      <span class="tile-label">Case managers &amp; doctors</span>
      <strong class="small-strong">Refer a client</strong>
      <span>How to send GAPP and ICWP referrals.</span>
    </a>
    <a class="tile tile-line" href="/careers/">
      <span class="tile-label">RNs, LPNs, CNAs &amp; aides</span>
      <strong class="small-strong">Join our team</strong>
      <span>${PRE ? "We’re building our first team." : "See how to apply."}</span>
    </a>
  </section>

  <section class="section" id="questions" aria-labelledby="questions-title">
    <h2 id="questions-title">FAQ</h2>
    <div class="faq">
      <details>
        <summary>Are you taking clients now?</summary>
        <p data-faq="accepting">${esc(accepting)}</p>
      </details>
      <details>
        <summary>Will care cost my family anything?</summary>
        <p>For approved GAPP or ICWP services, Medicaid pays the agency. Coverage depends on eligibility and authorization.</p>
      </details>
      <details>
        <summary>Where do you serve?</summary>
        <p data-faq="area">${counties.length ? `${PRE ? "We plan to start in" : "We serve"} ${esc(areaText)}.` : "Metro Atlanta. We’ll confirm counties before we open."}</p>
      </details>
      <details>
        <summary>Are you hiring nurses and caregivers?</summary>
        <p data-faq="apply">Yes. See <a href="/careers/">Careers</a> to send us your info.</p>
      </details>
    </div>
  </section>`,
  });
}

// GAPP
pages.push({
  file: "gapp/index.html", path: "/gapp/",
  title: `GAPP home nursing in Atlanta | ${FULL}`,
  description: "How Georgia’s GAPP program covers in-home nursing and personal care for medically fragile children under 21, who qualifies, and how to get started.",
  schema: [crumbs([["Home", "/"], ["GAPP", "/gapp/"]])],
  body: `${pageHero([["Home", "/"], ["GAPP", "/gapp/"]], "GAPP home nursing for children", "The Georgia Pediatric Program (GAPP) is a Georgia Medicaid program that pays for nursing and personal care at home for medically fragile children.", badge(programStatus("gapp")))}

  <section class="section prose-grid">
    <div class="prose">
      <h2>Who GAPP is for</h2>
      <ul class="checks">
        <li>Children and young adults <strong>under 21</strong></li>
        <li>Eligible for <strong>Georgia Medicaid</strong></li>
        <li><strong>Medically fragile</strong> and needing skilled nursing and/or personal care that is medically necessary</li>
      </ul>
      <p>The state makes the final decision on eligibility and approved hours. Program rules change, so we check current requirements with each family.</p>

      <h2>What care can include</h2>
      <ul class="checks">
        <li><strong>Skilled nursing</strong> at home by RNs and LPNs, often called private duty nursing</li>
        <li><strong>Personal care support</strong> with bathing, dressing, feeding and moving safely</li>
      </ul>

      <h2>How to get started</h2>
      <ol class="steps-list">
        <li><strong>Talk with your child’s doctor.</strong> GAPP care starts with a physician’s order.</li>
        <li><strong>Choose a GAPP agency.</strong> Families pick a Medicaid-enrolled GAPP provider.</li>
        <li><strong>The agency requests approval.</strong> It gathers the orders and submits the prior authorization request.</li>
        <li><strong>Care begins.</strong> A nurse builds the care plan and staff start the approved hours.</li>
      </ol>
      ${PRE ? `<p class="note">${esc(NAME)} is preparing to become a GAPP provider. Enrollment isn’t complete yet, so we can’t submit GAPP requests today. Send us a request and we’ll follow up when we can.</p>` : ""}
      <p><a href="https://www.mmis.georgia.gov/" target="_blank" rel="noopener noreferrer">Georgia Medicaid portal<span class="visually-hidden"> (opens in a new tab)</span> ↗</a></p>
    </div>
    <aside class="side-card">
      <h2>Common questions</h2>
      <h3>Does my family pay?</h3>
      <p>For approved GAPP services, Medicaid pays the agency.</p>
      <h3>Is GAPP the same as ICWP?</h3>
      <p>No. GAPP is for children under 21. <a href="/icwp/">ICWP</a> is for adults 21 to 64.</p>
      <h3>Can I change agencies?</h3>
      <p>Families choose their GAPP provider and can ask to change. Your physician and the program will guide the process.</p>
    </aside>
  </section>
${ctaBand(false)}`,
});

// ICWP
pages.push({
  file: "icwp/index.html", path: "/icwp/",
  title: `ICWP home care in Atlanta | ${FULL}`,
  description: "How Georgia’s Independent Care Waiver Program (ICWP) supports adults 21 to 64 with severe physical disabilities or brain injury at home, and how to apply.",
  schema: [crumbs([["Home", "/"], ["ICWP", "/icwp/"]])],
  body: `${pageHero([["Home", "/"], ["ICWP", "/icwp/"]], "ICWP home care for adults", "The Independent Care Waiver Program (ICWP) is a Georgia Medicaid waiver that helps adults with severe physical disabilities or a traumatic brain injury live at home instead of in a facility.", badge(programStatus("icwp")))}

  <section class="section prose-grid">
    <div class="prose">
      <h2>Who ICWP is for</h2>
      <ul class="checks">
        <li>Adults aged <strong>21 to 64</strong> when they apply and start services</li>
        <li>A <strong>severe physical disability</strong> or <strong>traumatic brain injury</strong></li>
        <li>Eligible for <strong>Georgia Medicaid</strong>, with care needs the program approves</li>
      </ul>
      <p>People already in ICWP before age 65 can generally keep their services after 65. The state decides eligibility and the service plan.</p>

      <h2>What care can include</h2>
      <ul class="checks">
        <li><strong>Personal support</strong> with bathing, dressing, meals, mobility and daily routines</li>
        <li><strong>Home health services</strong>, including nursing, when they’re in the service plan</li>
      </ul>
      <p>ICWP also covers things outside our services, such as equipment, home changes and emergency response systems.</p>

      <h2>How to apply</h2>
      <ol class="steps-list">
        <li><strong>Apply to ICWP.</strong> Start with Georgia’s official application page.</li>
        <li><strong>Assessment.</strong> The program reviews medical and daily-living needs.</li>
        <li><strong>Case manager and plan.</strong> Once approved, a case manager builds the service plan with you.</li>
        <li><strong>Choose providers.</strong> You pick the agencies that deliver your care.</li>
      </ol>
      ${PRE ? `<p class="note">${esc(NAME)} is preparing to become an ICWP provider. Enrollment isn’t complete yet. Send us a request and we’ll follow up when we can.</p>` : ""}
      <p><a href="https://georgia.gov/apply-independent-care-waiver-program-icwp" target="_blank" rel="noopener noreferrer">Apply for ICWP on georgia.gov<span class="visually-hidden"> (opens in a new tab)</span> ↗</a></p>
    </div>
    <aside class="side-card">
      <h2>Common questions</h2>
      <h3>Does ICWP cost anything?</h3>
      <p>Approved ICWP services are paid by Medicaid. The program will tell you about any costs that apply to you.</p>
      <h3>What about people over 65?</h3>
      <p>New applicants must be 21 to 64. Older adults may qualify for other Georgia waivers.</p>
      <h3>What about children?</h3>
      <p>Children under 21 may qualify for <a href="/gapp/">GAPP</a>.</p>
    </aside>
  </section>
${ctaBand(false)}`,
});

// Skilled nursing
pages.push({
  file: "services/skilled-nursing/index.html", path: "/services/skilled-nursing/",
  title: `In-home skilled nursing in Atlanta (RN & LPN) | ${FULL}`,
  description: "RN and LPN private duty nursing at home for medically complex children and adults in metro Atlanta, through Georgia Medicaid GAPP and ICWP.",
  schema: [crumbs([["Home", "/"], ["Skilled nursing", "/services/skilled-nursing/"]])],
  body: `${pageHero([["Home", "/"], ["Services", "/#care"], ["Skilled nursing", "/services/skilled-nursing/"]], "In-home skilled nursing", "RN and LPN care at home for children and adults with complex medical needs, following the physician’s orders.", badge(serviceStatus("nursing")))}

  <section class="section prose-grid">
    <div class="prose">
      <h2>What our nurses will do</h2>
      <ul class="checks">
        <li>Scheduled nursing shifts at home (private duty nursing)</li>
        <li>Medications, tube feedings and respiratory care, as ordered</li>
        <li>Monitoring, notes and updates to the family and doctor</li>
        <li>Care plans written and supervised by a registered nurse</li>
      </ul>
      <p>Each nurse works within their license and training, and the plan follows the physician’s orders.</p>
      <h2>Who pays</h2>
      <p>We focus on Georgia Medicaid: <a href="/gapp/">GAPP</a> for children under 21 and <a href="/icwp/">ICWP</a> for adults 21 to 64.</p>
    </div>
    <aside class="side-card">
      <h2>Who it’s for</h2>
      <p>Children and adults who need skilled care at home, for example after a hospital stay or with a long-term condition.</p>
      <p><a href="/services/personal-care/">Need help with daily routines instead? See personal care →</a></p>
    </aside>
  </section>
${ctaBand(false)}`,
});

// Personal care
pages.push({
  file: "services/personal-care/index.html", path: "/services/personal-care/",
  title: `In-home personal care in Atlanta | ${FULL}`,
  description: "Help at home with bathing, dressing, meals and mobility for children and adults in metro Atlanta, through Georgia Medicaid GAPP and ICWP.",
  schema: [crumbs([["Home", "/"], ["Personal care", "/services/personal-care/"]])],
  body: `${pageHero([["Home", "/"], ["Services", "/#care"], ["Personal care", "/services/personal-care/"]], "In-home personal care", "Help with the routines of daily life, delivered with patience and respect for privacy.", badge(serviceStatus("personalCare")))}

  <section class="section prose-grid">
    <div class="prose">
      <h2>What personal care includes</h2>
      <ul class="checks">
        <li>Bathing, grooming and dressing</li>
        <li>Toileting and incontinence care</li>
        <li>Meals and help with eating</li>
        <li>Moving, transfers and walking safely</li>
      </ul>
      <p>Aides work within their training, under a care plan overseen by a registered nurse.</p>
      <h2>Who pays</h2>
      <p>Personal care can be covered through <a href="/gapp/">GAPP</a> (as personal care support for children) and <a href="/icwp/">ICWP</a> (as personal support for adults), when approved.</p>
    </div>
    <aside class="side-card">
      <h2>Need nursing too?</h2>
      <p>Some families need both. We plan care so nurses and aides work from the same plan.</p>
      <p><a href="/services/skilled-nursing/">See skilled nursing →</a></p>
    </aside>
  </section>
${ctaBand(false)}`,
});

// Careers
pages.push({
  file: "careers/index.html", path: "/careers/",
  title: `Home care jobs in Atlanta: RN, LPN, CNA | ${FULL}`,
  description: `Nursing and caregiver jobs in metro Atlanta with ${FULL}: RNs, LPNs, CNAs and personal care aides for pediatric and adult home care.`,
  schema: [crumbs([["Home", "/"], ["Careers", "/careers/"]])],
  body: `${pageHero([["Home", "/"], ["Careers", "/careers/"]], "Join our team", PRE ? "We’re building our first team of nurses and caregivers in metro Atlanta. Send your info and we’ll reach out as we start hiring." : "Nurses and caregivers: send your info and we’ll reach out about openings that fit.")}

  <section class="section">
    <div class="cards">
      <article class="card card-ink"><span class="emoji" aria-hidden="true">✚</span><h3>RNs</h3><p>Assessments, care plans, supervision and skilled shifts.</p></article>
      <article class="card card-mint"><span class="emoji" aria-hidden="true">✚</span><h3>LPNs</h3><p>Private duty nursing shifts for children and adults.</p></article>
      <article class="card card-peach"><span class="emoji" aria-hidden="true">♡</span><h3>CNAs &amp; aides</h3><p>Personal care and daily support at home.</p></article>
    </div>
  </section>

  <section class="section prose-grid">
    <div class="prose">
      <h2>What we look for</h2>
      <ul class="checks">
        <li>Active Georgia RN or LPN license, or CNA certification / personal care aide training</li>
        <li>Current CPR certification</li>
        <li>Pediatric, trach/vent or G-tube experience is a plus</li>
        <li>Reliable transportation in metro Atlanta</li>
        <li>Able to pass a background check</li>
      </ul>
    </div>
    <div class="form-card form-card-light">
      <h2 class="form-title">Send your info</h2>
      ${careersForm()}
    </div>
  </section>`,
});

// Referrals
pages.push({
  file: "referrals/index.html", path: "/referrals/",
  title: `Refer a GAPP or ICWP client | ${FULL}`,
  description: "For case managers, discharge planners and physicians: how to refer children (GAPP) and adults (ICWP) for in-home nursing and personal care in metro Atlanta.",
  schema: [crumbs([["Home", "/"], ["Referrals", "/referrals/"]])],
  body: `${pageHero([["Home", "/"], ["Referrals", "/referrals/"]], "For case managers &amp; doctors", "How to refer clients for in-home nursing and personal care.")}

  <section class="section prose-grid">
    <div class="prose">
      <h2>Who we plan to serve</h2>
      <ul class="checks">
        <li><strong>GAPP:</strong> medically fragile children under 21 ${badge(programStatus("gapp"))}</li>
        <li><strong>ICWP:</strong> adults 21 to 64 with severe physical disabilities or TBI ${badge(programStatus("icwp"))}</li>
        <li><strong>Services:</strong> RN/LPN skilled nursing, personal care, care coordination</li>
        <li><strong>Area:</strong> ${esc(areaText)}</li>
      </ul>
      <h2>How to refer</h2>
      <ol class="steps-list">
        <li><strong>Ask us to call.</strong> Use the form with your contact details only${PHONE ? `, or call <a href="${tel(PHONE)}">${esc(PHONE)}</a>` : ""}.</li>
        <li><strong>Secure handoff.</strong> We take patient details by phone${FAX ? ` or secure fax (${esc(FAX)})` : ""}, never through this website.</li>
        <li><strong>Fast follow-up.</strong> We confirm staffing, then work with you on orders and authorization.</li>
      </ol>
      ${PRE ? `<p class="note">${esc(NAME)} is completing licensing and Medicaid enrollment. We can’t accept patients yet, but we’d like to meet referral partners now.</p>` : ""}
    </div>
    <div class="form-card form-card-light">
      <h2 class="form-title">Ask us to call</h2>
      ${referralForm()}
    </div>
  </section>`,
});

// About
{
  const credItems = [
    ["Georgia license", creds.licenseNumber ? `#${esc(creds.licenseNumber)}` : PRE ? "In progress" : ""],
    ["NPI", creds.npi ? esc(creds.npi) : PRE ? "In progress" : ""],
    ["GAPP", esc(programStatus("gapp").text)],
    ["ICWP", esc(programStatus("icwp").text)],
  ].filter(([, v]) => v);
  pages.push({
    file: "about/index.html", path: "/about/",
    title: `About ${FULL} | Atlanta Medicaid home care`,
    description: `${FULL} is a locally owned metro Atlanta agency focused on Medicaid-funded home nursing and personal care through GAPP and ICWP.`,
    schema: [crumbs([["Home", "/"], ["About", "/about/"]])],
    body: `${pageHero([["Home", "/"], ["About", "/about/"]], `About ${esc(NAME)}`, "A locally owned metro Atlanta home care agency focused on families who rely on Georgia Medicaid.")}

  <section class="section prose-grid">
    <div class="prose">
      <h2>Why we exist</h2>
      <p>Families caring for a medically fragile child or an adult with a disability should be able to get skilled, reliable care at home. We’re building an agency around that: nurses and aides who show up, one contact who answers, and care plans that follow the person.</p>
      <h2>What we focus on</h2>
      <ul class="checks">
        <li>Skilled nursing (RN and LPN) and personal care at home</li>
        <li>Georgia Medicaid programs: GAPP for children, ICWP for adults</li>
        <li>${esc(areaText.charAt(0).toUpperCase() + areaText.slice(1))}</li>
      </ul>
${people.length ? `      <h2>Leadership</h2>
      <ul class="people">
${people.map(p => `        <li><strong>${esc(p.name)}</strong>${p.role ? `<span>${esc(p.role)}</span>` : ""}</li>`).join("\n")}
      </ul>` : ""}
    </div>
    <aside class="side-card">
      <h2>Credentials</h2>
      <dl class="creds">
${credItems.map(([k, v]) => `        <div><dt>${k}</dt><dd>${v}</dd></div>`).join("\n")}
      </dl>
    </aside>
  </section>
${ctaBand(false)}`,
  });
}

// Spanish home
pages.push({
  file: "es/index.html", path: "/es/", es: true, alternate: true,
  title: `${FULL} | Atención en casa con Medicaid en Atlanta`,
  description: "Enfermería y cuidado personal en casa para niños y adultos a través de los programas GAPP e ICWP de Medicaid de Georgia en el área de Atlanta.",
  body: `  <section class="bento" aria-labelledby="hero-title">
    <div class="tile tile-hero">
      <p class="tag-line">Atlanta, Georgia · Atención en casa con Medicaid</p>
      <h1 id="hero-title">Atención en casa con Medicaid de Georgia, para niños <span class="and">y</span> adultos.</h1>
      <p class="lead">Enfermería y cuidado personal en casa, a través de GAPP e ICWP.</p>
      <div class="actions">
        <a class="pill pill-dark" href="#contacto">Solicitar atención</a>
        ${PHONE ? `<a class="pill pill-line" href="${tel(PHONE)}">Llamar ${esc(PHONE)}</a>` : `<a class="pill pill-line" href="#programas">Programas</a>`}
      </div>
    </div>
    <a class="tile tile-mint" href="#programas"><span class="tile-label">Menores de 21</span><strong>GAPP</strong><span lang="en">Georgia Pediatric Program</span></a>
    <a class="tile tile-peach" href="#programas"><span class="tile-label">Adultos de 21 a 64</span><strong>ICWP</strong><span lang="en">Independent Care Waiver Program</span></a>
    <div class="tile tile-ink">
      <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M6 70 Q60 4 114 70" fill="none" stroke="#c8efdf" stroke-width="6" stroke-linecap="round"/><path d="M24 70V48M42 70V32M60 70V26M78 70V32M96 70V48" stroke="#ffd8c2" stroke-width="4" stroke-linecap="round"/></svg>
      <span>Enfermería RN y LPN<br>Cuidado personal<br>Coordinación de atención</span>
    </div>
    <div class="tile tile-sun">
      <span class="tile-label">Estado</span>
      <strong class="small-strong">${PRE ? "Próxima apertura" : "Abierto"}</strong>
      <span>${PRE ? "Licencia e inscripción en Medicaid en proceso." : `Servimos ${esc(areaText)}.`}</span>
    </div>
  </section>

  <section class="section" id="servicios" aria-labelledby="care-title">
    <h2 id="care-title">Servicios</h2>
    <div class="cards">
${svcCard("nursing", "card-ink", "✚", "Enfermería especializada", "Atención de enfermeras RN y LPN en casa, según las órdenes del médico.", "", true)}
${svcCard("personalCare", "card-mint", "♡", "Cuidado personal", "Ayuda para bañarse, vestirse, comer y moverse con seguridad.", "", true)}
${svcCard("coordination", "card-peach", "☰", "Coordinación de atención", "Un solo contacto para órdenes, autorizaciones y horarios.", "", true)}
    </div>
  </section>

  <section class="section" id="programas" aria-labelledby="programs-title">
    <h2 id="programs-title">Programas de Medicaid</h2>
    <div class="programs">
      <article class="panel panel-mint" data-program="gapp">
        <h3>GAPP <span lang="en">Georgia Pediatric Program</span></h3>
        <p>Niños y jóvenes menores de 21 años, médicamente frágiles, que necesitan enfermería o cuidado personal en casa.</p>
        ${badge(programStatus("gapp", true))}
      </article>
      <article class="panel panel-peach" data-program="icwp">
        <h3>ICWP <span lang="en">Independent Care Waiver Program</span></h3>
        <p>Adultos de 21 a 64 años con discapacidades físicas graves o una lesión cerebral.</p>
        ${badge(programStatus("icwp", true))}
      </article>
    </div>
  </section>

  <section class="section" id="contacto" aria-labelledby="contact-title">
    <div class="contact-card">
      <div class="contact-copy">
        <h2 id="contact-title">Solicitar atención</h2>
        <p>${PRE ? "Cuéntenos qué necesita. Abriremos pronto y le llamaremos cuando empecemos a aceptar clientes." : "Cuéntenos qué necesita y le llamaremos."}</p>
        ${PHONE ? `<p class="call-line">¿Prefiere llamar? <a href="${tel(PHONE)}">${esc(PHONE)}</a></p>` : ""}
      </div>
      <div class="form-card">
        ${requestForm(true)}
      </div>
    </div>
  </section>

  <section class="section" id="preguntas" aria-labelledby="questions-title">
    <h2 id="questions-title">Preguntas frecuentes</h2>
    <div class="faq">
      <details><summary>¿Ya aceptan clientes?</summary><p>${PRE ? "Todavía no. Estamos terminando la licencia y la inscripción en Medicaid. Envíe una solicitud y le llamaremos cuando abramos." : "Sí, para los servicios marcados como disponibles."}</p></details>
      <details><summary>¿Le costará algo a mi familia?</summary><p>Para los servicios aprobados de GAPP o ICWP, Medicaid le paga a la agencia. La cobertura depende de la elegibilidad y la autorización.</p></details>
      <details><summary>¿Dónde ofrecen servicios?</summary><p>En el área metropolitana de Atlanta.</p></details>
      <details><summary>¿Están contratando enfermeras y cuidadores?</summary><p>Sí. Visite <a href="/careers/" lang="en">Careers</a> para enviarnos su información.</p></details>
    </div>
  </section>`,
});

// Privacy
pages.push({
  file: "privacy/index.html", path: "/privacy/",
  title: `Privacy | ${FULL}`,
  description: `What ${FULL} collects through this website and how it is used.`,
  body: `${pageHero([["Home", "/"], ["Privacy", "/privacy/"]], "Privacy note", "What we collect through this website, and why.")}
  <section class="section prose">
    <p><strong>What we collect.</strong> Only what you type into our forms: your name, phone, optional email, ZIP code, the kind of care, job or referral you’re asking about, and an optional message.</p>
    <p><strong>Why.</strong> To call you back about care, jobs or referrals with ${esc(FULL)}. We don’t sell it or use it for advertising.</p>
    <p><strong>Who can see it.</strong> Our team. Form messages are delivered through our website host, Netlify.</p>
    <p><strong>Please don’t send medical information.</strong> Leave out diagnoses, Medicaid ID numbers, Social Security numbers and medical records. We’ll collect what’s needed privately once care is being arranged.</p>
    <p><strong>Removing your information.</strong> Ask us${EMAIL ? ` at <a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>` : PHONE ? ` at ${esc(PHONE)}` : " when we call"}, and we’ll delete it.</p>
    <p>This website doesn’t use analytics or advertising cookies.</p>
  </section>`,
});

// Thank you (no-JavaScript fallback)
pages.push({
  file: "thank-you/index.html", path: "/thank-you/", noindex: true,
  title: `Thank you | ${FULL}`,
  description: "Your message was sent.",
  body: `  <section class="page-hero page-hero-solo">
    <h1>Thanks. We got your message.</h1>
    <p class="lead">${PRE ? "We’re opening soon and will call you at the number you gave us." : "We’ll call you soon."} For an emergency, call 911.</p>
    <a class="pill pill-dark" href="/">Back to home</a>
  </section>`,
});

// 404
pages.push({
  file: "404.html", path: "/404.html", noindex: true,
  title: `Page not found | ${FULL}`,
  description: "This page doesn’t exist.",
  body: `  <section class="page-hero page-hero-solo">
    <h1>Page not found</h1>
    <p class="lead">That page doesn’t exist. Try one of these:</p>
    <div class="actions">
      <a class="pill pill-dark" href="/">Home</a>
      <a class="pill pill-line" href="/gapp/">GAPP</a>
      <a class="pill pill-line" href="/icwp/">ICWP</a>
      <a class="pill pill-line" href="/careers/">Careers</a>
    </div>
  </section>`,
});

// ---------- Write ----------
for (const p of pages) {
  const out = join(ROOT, p.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(p));
}

const indexable = pages.filter(p => !p.noindex);
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(p => `  <url><loc>${SITE}${p.path}</loc></url>`).join("\n")}
</urlset>
`);

writeFileSync(join(ROOT, "robots.txt"), C.indexing === true
  ? `User-agent: *
Allow: /
Disallow: /astro-0/
Disallow: /astro-1/
Disallow: /astro-2/
Disallow: /compare/
Disallow: /versions/
Disallow: /thank-you/

Sitemap: ${SITE}/sitemap.xml
`
  : `# PRELAUNCH: indexing is off in assets/js/config.js. Set indexing: true to open the site to Google.
User-agent: *
Disallow: /
`);

console.log(`Built ${pages.length} pages for ${SITE} (indexing ${C.indexing === true ? "ON" : "off"}, mode ${MODE}${PHONE ? ", phone shown" : ""}).`);
