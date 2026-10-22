# KairoBridge Home Care website

Short one-page site for an Atlanta Medicaid home care company (GAPP and ICWP), with a "Request care" form. Plain HTML, CSS and JavaScript with no build step. It's set up for Netlify, the same way as your other sites, but any static host works.

> **Current status: PRELAUNCH.** Search engines are blocked. Every service reads "Planned", and GAPP and ICWP read "participation pending". The only thing collected is what people send through the "Request care" form.

## Deploy on Netlify

**Add new site → Import an existing project → GitHub →** this repository. Leave the base directory and build command empty and the publish directory as `.` (`netlify.toml` already sets this). Netlify gives it a free `*.netlify.app` address. Add the custom domain only after the name is cleared.

## Design versions

| Address | Design |
|---|---|
| `/` | **Home page** (Astro 3, Bento): short copy and the Request care form |
| `/astro-0/` | **Original**: forest, ivory and gold concept |
| `/astro-1/` | **Pathways**: navy and teal, GAPP/ICWP path picker, program comparison |
| `/astro-2/` | **Editorial**: aubergine, cream and clay, large serif chapters |
| `/astro-3/` | Redirects to the home page |
| `/thank-you/`, `/privacy/` | Form confirmation (when JavaScript is off) and privacy note |
| `/versions/` | Side-by-side chooser |
| `/compare/` | One page with a switcher (buttons or ← → keys, Desktop/Phone view). `/compare/#astro-2-phone` opens straight on a design |

All four read the same `assets/js/config.js` and `assets/js/app.js`, so company facts and statuses change everywhere at once. The home page uses `assets/css/home.css`; each older version keeps its own stylesheet (Astro 0 uses `assets/css/site.css`). The older versions never get indexed, even after launch. Set `designSwitcher: true` in `config.js` to show a Design 0-3 bar on every page.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page: notice, hero tiles, services, programs, Request care form, FAQ |
| `assets/js/config.js` | **Company facts: edit this one.** Name, mode, contact, counties, service and program status |
| `assets/js/app.js` | Applies the config, runs the mobile menu and the launch-status dialog |
| `assets/css/home.css` | Home page, thank-you and privacy styling |
| `assets/js/form.js` | Sends the form to Netlify Forms, success and error messages |
| `assets/css/site.css` | Astro 0 styling |
| `assets/img/` | Favicon, app icon, link-preview card (`social-card.png`) |
| `tools/check.mjs` | Browser checks (layouts at 1280/390/320 px, menu, FAQ, form validation/success/error/honeypot, config modes, versions, contrast) |
| `tools/make-images.mjs` | Regenerates the icons and the preview card |
| `netlify.toml`, `robots.txt` | Hosting headers and the prelaunch search block |

The owner workbook and handoff notes are **not** in this folder and must never be added. `netlify.toml` also returns 404 for `/docs/`, `/tools/` and `README.md` as a backstop.

## Preview

```sh
python3 -m http.server 8000      # from this folder, then open http://localhost:8000
```

Or just open `index.html` in a browser.

## Changing company facts

Everything is in `assets/js/config.js`. Leave anything unverified empty, and the site hides it rather than showing a placeholder.

- **Name:** `brand.name`, `brand.descriptor`, `brand.legalName`. Also update `<title>`, `description` and the `og:` tags at the top of `index.html`, because link previews read those before the script runs. Rerun `tools/make-images.mjs` to rename the preview card.
- **Mode:** `"prelaunch"`, then `"limited"`, then `"operational"`. While the mode is prelaunch, every service stays "Planned" and every program stays "pending" whatever the flags below say.
- **Services:** set `status: "available"` and `effectiveDate` per service, only within your approved license scope.
- **Programs:** set `status: "enrolled"` per program (GAPP and ICWP are independent). Use `"not-pursuing"` to say you don't offer one.
- **Contact:** `phone`, `email`, `hours`, `address` appear outside prelaunch, or before opening if you set `showContactInPrelaunch: true`. `careersEmail` turns on the recruiting answer in the FAQ.
- **Counties:** `serviceCounties: ["Fulton", "DeKalb"]`.
- **License wording:** `license.description`, shown in the FAQ once you're out of prelaunch.

If you change `site.css` or `app.js`, bump the `?v=1` numbers in `index.html` so browsers fetch the new copy.

## Going public (launch switch)

Do this only once the license, contact details and domain are final:
1. Remove `X-Robots-Tag` in `netlify.toml`.
2. Change the robots meta tag in `index.html` to `index,follow`.
3. Replace `robots.txt` with `Allow: /`.
4. Change `og:url` and `og:image` in `index.html` from `kairosbridge.netlify.app` to the real domain, and add a canonical link. Only add LocalBusiness structured data with verified address and phone details. Never add ratings.

## Request care form

Submissions go to **Netlify Forms** (form name `request-care`). Two one-time steps in Netlify:
1. **Site configuration → Forms → Enable form detection**, then redeploy (Deploys → Trigger deploy).
2. **Forms → Form notifications → Add notification → Email notification**: enter the email that should get each request.

Submissions also show under **Forms → request-care** in Netlify. Spam: a hidden honeypot field plus Netlify's built-in spam filter.

Fields: I am (looking for care / referring / nurse or caregiver), who needs care, Medicaid program, name, phone, optional email, ZIP, optional message, and contact consent. Keep it that way: never add fields for diagnoses, Medicaid ID numbers, dates of birth or medical records. Netlify Forms isn't a HIPAA-covered service; once you're operating, collect medical details privately during intake. A clinical referral portal is a separate decision.

## Checks

```sh
python3 -m http.server 8765 &
node tools/check.mjs http://localhost:8765/     # needs Playwright + Chromium
```
