/*
 * KairoBridge Home Care: the one place to change company facts.
 *
 * Rules for editing:
 * - Leave a value empty ("" or []) until it is verified. Empty values are hidden;
 *   the site never shows a placeholder phone, email or address.
 * - Service availability and program participation are separate on purpose.
 *   A state license does not make a service payer-approved, and Medicaid
 *   enrollment does not make every program active. Change each one only when
 *   you hold the approval for it.
 * - After editing, also update the <title> and description meta tags at the top
 *   of index.html if the company name changes (search engines and link previews
 *   read those before this file runs).
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

  // Verified public contact details. Each one appears only when filled in, and
  // only outside prelaunch mode.
  contact: {
    phone: "",        // e.g. "404-555-0123"
    email: "",        // e.g. "care@example.com"
    hours: "",        // e.g. "Monday to Friday, 9 am to 5 pm"
    address: "",      // public operating address, only if you want it published
    careersEmail: "", // recruiting contact; enables the "apply" answer in the FAQ
  },

  // Contact details are hidden in prelaunch mode. Set true to publish them for
  // general questions before opening (clients still cannot be accepted).
  showContactInPrelaunch: false,

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
