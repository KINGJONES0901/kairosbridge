# KairoBridge Home Care website

Prelaunch one-page site for an Atlanta in-home nursing and personal care company. Plain HTML, CSS and JavaScript with no build step. It's set up for Netlify, the same way as your other sites, but any static host works.

> **Current status: PRELAUNCH.** Search engines are blocked. Every service reads "Planned", and GAPP and ICWP read "participation pending". No form or contact detail collects anyone's information.

## Deploy on Netlify

**Add new site → Import an existing project → GitHub →** this repository. Leave the base directory and build command empty and the publish directory as `.` (`netlify.toml` already sets this). Netlify gives it a free `*.netlify.app` address. Add the custom domain only after the name is cleared.

## Design versions

| Address | Design |
|---|---|
| `/` | **Astro 0**: the original concept (also reachable as `/astro-0/`) |
| `/astro-1/` | **Pathways**: navy and teal, GAPP/ICWP path picker, program comparison |
| `/astro-2/` | **Editorial**: aubergine, cream and clay, large serif chapters |
| `/astro-3/` | **Bento**: rounded tiles, "Who needs care?" child/adult switch |
| `/versions/` | Side-by-side chooser |
| `/compare/` | One page with a switcher (buttons or ← → keys, Desktop/Phone view). `/compare/#astro-2-phone` opens straight on a design |

All four read the same `assets/js/config.js` and `assets/js/app.js`, so company facts and statuses change everywhere at once. Each Astro folder only has its own `index.html` and `style.css` (Astro 3 adds `tabs.js`). The versions never get indexed, even after launch. When you pick a winner, it can replace the home page.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: prelaunch notice, navigation, hero, planned care, programs, approach, FAQ, launch information, footer, launch-status dialog |
| `assets/js/config.js` | **Company facts: edit this one.** Name, mode, contact, counties, service and program status |
| `assets/js/app.js` | Applies the config, runs the mobile menu and the launch-status dialog |
| `assets/css/site.css` | All styling (forest, ivory and muted gold palette, from the accepted concept) |
| `assets/img/` | Favicon, app icon, link-preview card (`social-card.png`) |
| `tools/check.mjs` | Browser checks (layout at 1280/390/320 px, menu, FAQ, dialog, config modes, contrast) |
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

## Inquiry form (not built yet, on purpose)

The site doesn't collect information. Before a form is added, decide where submissions go (for example Netlify Forms or an email service), who can read them, spam protection, consent wording and a privacy notice. The form must never ask for diagnoses, Medicaid IDs, dates of birth or medical records. A clinical referral portal is a separate, HIPAA-scoped decision.

## Checks

```sh
python3 -m http.server 8765 &
node tools/check.mjs http://localhost:8765/     # needs Playwright + Chromium
```
