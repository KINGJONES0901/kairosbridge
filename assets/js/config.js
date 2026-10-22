/*
 * KairoBridge Home Care: the one place to change company facts.
 *
 * Every page is generated from this file by tools/build.mjs. Netlify runs that
 * build on each deploy, so editing this file on GitHub updates the whole site
 * (titles, phone, footer, Google data and sitemap) a minute or two later.
 *
 * Rules for editing:
 * - Leave a value empty ("" or []) until it is verified. Empty values are hidden;
 *   the site never shows a placeholder phone, email or address.
 * - Service availability and program participation are separate on purpose.
 *   A state license does not make a service payer-approved, and Medicaid
 *   enrollment does not make every program active. Change each one only when
 *   you hold the approval for it.
 */
window.SITE_CONFIG = {
  brand: {
    name: "KairoBridge",          // shown large in the header
    descriptor: "Home Care",      // shown small under the name
    legalName: "",                // e.g. "KairoBridge Home Care LLC" once registered
    city: "Atlanta, Georgia",
  },

  /*
   * "prelaunch"   Not accepting clients. Planned-service wording everywhere.
   * "limited"     Licensed for some services. Only services marked "available"
   *               below are described as available.
   * "operational" Open. Program wording still follows each program's status.
   */
  mode: "prelaunch",

  // The site's address. Change to your own domain once it is connected in
  // Netlify, e.g. "https://www.kairobridgehomecare.com" (no trailing slash).
  siteUrl: "https://kairosbridge.netlify.app",

  // Google switch. false = hidden from search engines (prelaunch preview).
  // Set true once the domain is connected and the name is cleared.
  indexing: false,

  // Verified public contact details. Each one appears only when filled in.
  contact: {
    phone: "",        // e.g. "404-555-0123"  (adds Call buttons and Google data)
    email: "",        // e.g. "care@example.com"
    fax: "",          // secure fax for referrals, e.g. "404-555-0199"
    hours: "",        // e.g. "Monday to Friday, 9 am to 5 pm"
    // Public office address, only if you want it published. Leave street empty
    // to show only the city (fine for a service-area business on Google).
    address: { street: "", city: "Atlanta", region: "GA", postalCode: "" },
    careersEmail: "", // recruiting contact; enables the "apply" answer in the FAQ
  },

  // Show the contact details above while still in prelaunch mode.
  showContactInPrelaunch: true,

  // Credentials, shown in the footer and About page once filled in.
  credentials: {
    licenseNumber: "", // Georgia license/permit number
    npi: "",           // agency NPI
  },

  // Leadership shown on the About page, e.g.
  // [{ name: "Jane Doe, RN", role: "Director of Nursing" }]
  people: [],

  // Social profile links, e.g. ["https://www.facebook.com/kairobridge"]
  sameAs: [],

  // The license you actually hold, worded for the public FAQ, e.g.
  // "Georgia Private Home Care Provider permit (nursing and personal care services)".
  license: { description: "" },

  // Counties confirmed by your license and staffing. Empty = "proposed metro Atlanta".
  serviceCounties: [],

  /*
   * Services: status is "planned" or "available".
   * Set "available" only for services within your approved license scope and
   * staffing, and give the effective date (YYYY-MM-DD).
   */
  services: {
    nursing:      { status: "planned", effectiveDate: "" },
    personalCare: { status: "planned", effectiveDate: "" },
    coordination: { status: "planned", effectiveDate: "" },
  },

  /*
   * Payer programs: status is "target", "enrolled" or "not-pursuing".
   * "enrolled" means your agency is enrolled and authorized to deliver and bill
   * this specific program, not just enrolled as a Georgia Medicaid provider.
   */
  programs: {
    gapp: { status: "target", effectiveDate: "" },
    icwp: { status: "target", effectiveDate: "" },
  },

  // Preview only: the "Design 0 1 2 3" bar at the bottom of every page.
  // Set to false once you have picked a design.
  designSwitcher: false,

  // Shown in the footer.
  footerNote: "Working brand concept · October 2026",
};
