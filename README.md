# KairoBridge Home Care website

Website for an Atlanta Medicaid home care agency (GAPP and ICWP): in-home skilled nursing and personal care for children and adults. Plain HTML, CSS and JavaScript on Netlify, with a tiny build script and no packages.

> **Current status: PRELAUNCH.** Search engines are blocked (`indexing: false`). Every service reads "Planned", and GAPP and ICWP read "participation pending". The only things collected are what people send through the three forms.

## Pages

| Address | What it is |
|---|---|
| `/` | Home: hero tiles, services, programs, Request care form, referral/careers tiles, FAQ |
| `/gapp/`, `/icwp/` | Program guides: who qualifies, what's covered, how to start |
| `/services/skilled-nursing/`, `/services/personal-care/` | Service pages |
| `/careers/` | Roles, requirements and the **careers** form |
| `/referrals/` | For case managers and doctors, with the **referral-contact** form |
| `/about/` | Mission, focus, leadership (from config) and credentials |
| `/es/` | Spanish home page with the Request care form |
| `/privacy/`, `/thank-you/`, `/404.html` | Privacy note, no-JavaScript form confirmation, page not found |
| `/astro-0/`, `/astro-1/`, `/astro-2/`, `/versions/`, `/compare/` | Older design versions, kept for comparison. Never indexed |

## How the pages are made

**Company facts live in `assets/js/config.js`. Page wording lives in `tools/build.mjs`.** The build writes every page, `sitemap.xml` and `robots.txt`.

- **Netlify runs the build on every deploy**, so editing `config.js` on GitHub (phone, domain, statuses) updates the whole site a minute or two later.
- Locally: `node tools/build.mjs`, then commit the script and the regenerated files together. Don't hand-edit the generated `.html` files.
- Styling: `assets/css/home.css`. Behavior: `assets/js/app.js` (menu) and `assets/js/form.js` (forms). After changing any of these, bump `ASSET_V` in `tools/build.mjs`.
- The older versions under `/astro-*` are hand-made and read `config.js` in the browser.

## Changing company facts (`assets/js/config.js`)

| Setting | What it does |
|---|---|
| `contact.phone` | Adds Call buttons (header, hero, form, footer) and the phone in Google's business data |
| `contact.email`, `fax`, `hours` | Footer, referral page and privacy page |
| `contact.address` | Leave `street` empty to show only "Atlanta, GA" (normal for a service-area business) |
| `serviceCounties` | e.g. `["Fulton", "DeKalb"]`: FAQ, footer, referral page and Google data |
| `credentials.licenseNumber`, `credentials.npi` | Footer and About page |
| `people` | Leadership on the About page, e.g. `[{ name: "Jane Doe, RN", role: "Director of Nursing" }]` |
| `sameAs` | Social profile links for Google, e.g. your Facebook page |
| `mode` | `"prelaunch"`, then `"limited"`, then `"operational"` |
| `services.*`, `programs.*` | Mark each one `available` / `enrolled` only when approved. Prelaunch overrides them |
| `siteUrl` | Your domain. Used for canonical links, sitemap, previews and Google data |
| `indexing` | **The Google switch** (see below) |

## Going live on Google

1. Connect your domain in Netlify (**Domain management → Add a domain**) and let Netlify issue HTTPS.
2. In `config.js`, set `siteUrl` to the domain (e.g. `"https://www.kairobridgehomecare.com"`), add `contact.phone`, and set `indexing: true`.
3. Deploy. The build switches every page to `index,follow`, opens `robots.txt` and points it at the sitemap. The older versions, `/compare/`, `/versions/` and `/thank-you/` stay hidden.
4. **Google Search Console:** add the domain, verify it (DNS record), then submit `https://YOUR-DOMAIN/sitemap.xml`.
5. **Google Business Profile:** create it as a service-area business (hide the address), category "Home health care service", same name and phone as the site.
6. Re-run `node tools/make-images.mjs` if the name changes, so link previews match.

## Forms (Netlify Forms)

| Form | Page | Fields |
|---|---|---|
| `request-care` | `/`, `/es/` | I am, who needs care, program, name, phone, email (optional), ZIP, message (optional), consent, language |
| `careers` | `/careers/` | Name, phone, email (optional), ZIP, role, years, experience, availability, message, consent |
| `referral-contact` | `/referrals/` | Referrer name, organization, role, program, phone, email (optional), county (optional), consent |

One-time Netlify setup: **Forms → Enable form detection**, redeploy, then **Forms → Form notifications → Email notification** for each form. Spam: a hidden honeypot field plus Netlify's spam filter.

None of the forms asks for diagnoses, Medicaid ID numbers, birth dates, Social Security or license numbers. Keep it that way: Netlify Forms isn't a HIPAA-covered service. Before taking real patient intakes, move intake to a HIPAA-ready form service with a business associate agreement, and post a HIPAA Notice of Privacy Practices plus the Section 1557 nondiscrimination notice.

## Checks

```sh
python3 -m http.server 8765 &
node tools/check.mjs http://localhost:8765/     # needs Playwright + Chromium
```

The checks cover every page at phone widths, titles and descriptions, canonical links, Google data, internal links, the menu, all three forms (validation, delivery, errors, honeypot), the Spanish page, and a test build with a phone number, counties and indexing switched on.
