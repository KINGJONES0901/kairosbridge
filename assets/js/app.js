/*
 * Applies assets/js/config.js to the page and runs the menu and launch-status dialog.
 * The HTML already holds the prelaunch wording, so without JavaScript (or with a
 * broken config) visitors see the most conservative version of every claim.
 */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var brand = cfg.brand || {};
  var contact = cfg.contact || {};
  var mode = ["prelaunch", "limited", "operational"].indexOf(cfg.mode) >= 0 ? cfg.mode : "prelaunch";
  var isPrelaunch = mode === "prelaunch";

  var SERVICE_NAMES = { nursing: "In-home nursing", personalCare: "Personal care", coordination: "Coordinated support" };
  var PROGRAM_NAMES = { gapp: "GAPP", icwp: "ICWP" };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function setText(sel, text) { $$(sel).forEach(function (el) { el.textContent = text; }); }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function listWords(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + (items.length > 2 ? "," : "") + " and " + items[items.length - 1];
  }

  // A paragraph built from text pieces and optional links, without innerHTML.
  function fill(el, parts) {
    el.textContent = "";
    parts.forEach(function (part) {
      if (typeof part === "string") { el.appendChild(document.createTextNode(part)); return; }
      var a = document.createElement("a");
      a.href = part.href;
      a.textContent = part.text;
      el.appendChild(a);
    });
  }

  function telHref(phone) { return "tel:" + phone.replace(/[^\d+]/g, ""); }

  // Only services within the license, outside prelaunch, count as available.
  function serviceAvailable(key) {
    var s = (cfg.services || {})[key];
    return !isPrelaunch && !!s && s.status === "available";
  }
  function programEnrolled(key) {
    var p = (cfg.programs || {})[key];
    return !isPrelaunch && !!p && p.status === "enrolled";
  }

  /* ---------- Brand ---------- */
  function applyBrand() {
    var name = brand.name || "KairoBridge";
    var descriptor = brand.descriptor || "Home Care";
    var full = name + " " + descriptor;
    setText("[data-brand-name]", name);
    setText("[data-brand-descriptor]", descriptor.toUpperCase());
    setText("[data-brand-full]", brand.legalName || full);
    if (brand.city) setText("[data-brand-city]", brand.city);
    if (cfg.footerNote) setText("[data-footer-note]", cfg.footerNote);
    document.title = document.title.replace("KairoBridge Home Care", full);
  }

  /* ---------- Services and programs ---------- */
  function applyStatuses() {
    $$("[data-service]").forEach(function (card) {
      var key = card.getAttribute("data-service");
      var tag = $("[data-status]", card);
      var s = (cfg.services || {})[key] || {};
      if (serviceAvailable(key)) {
        var since = formatDate(s.effectiveDate);
        tag.textContent = since ? "Available since " + since : "Available";
        tag.classList.add("is-active");
      } else {
        tag.textContent = isPrelaunch ? "Planned" : "Not yet available";
      }
    });

    var enrolled = [];
    $$("[data-program]").forEach(function (article) {
      var key = article.getAttribute("data-program");
      var tag = $("[data-status]", article);
      var p = (cfg.programs || {})[key] || {};
      if (programEnrolled(key)) {
        enrolled.push(PROGRAM_NAMES[key] || key);
        var since = formatDate(p.effectiveDate);
        tag.textContent = since ? "Participating since " + since : "Participating provider";
        tag.classList.add("is-active");
      } else if (p.status === "not-pursuing") {
        tag.textContent = "Not offered by our agency";
      }
    });

    if (enrolled.length) {
      setText("[data-programs-summary]", "PARTICIPATING: " + enrolled.join(" · ").toUpperCase());
      setText("[data-programs-intro]", "We participate in the Georgia Medicaid programs marked below. Each program has its own eligibility, medical-necessity and authorization requirements.");
    }
  }

  /* ---------- Notice, FAQ, footer ---------- */
  function applyMode() {
    var notice = $("#site-notice");
    var available = Object.keys(SERVICE_NAMES).filter(serviceAvailable);
    var counties = (cfg.serviceCounties || []).filter(Boolean);
    var countyText = counties.length ? listWords(counties) + (counties.length > 1 ? " counties" : " County") : "";

    if (mode === "limited") {
      notice.textContent = "NOW SERVING FOR SELECTED SERVICES · Check each service’s status below";
    } else if (mode === "operational") {
      notice.hidden = true;
    }

    var accepting = $('[data-faq="accepting"]');
    if (!isPrelaunch) {
      var phrase = available.length
        ? "for " + listWords(available.map(function (k) { return SERVICE_NAMES[k].toLowerCase(); }))
        : "for the services marked available above";
      accepting.textContent = mode === "limited"
        ? "Yes, " + phrase + ". Other services are still being prepared. Please contact us to discuss whether we can help."
        : "Yes, " + phrase + ". Please contact us to discuss your needs.";
    }

    var licensed = $('[data-faq="licensed"]');
    if (!isPrelaunch) {
      var lic = (cfg.license || {}).description;
      licensed.textContent = (lic ? "We hold a " + lic + ". " : "We are licensed for the services marked available above. ") +
        "Medicaid program participation is shown separately for each program under Programs.";
    }

    var area = $('[data-faq="area"]');
    if (countyText) {
      area.textContent = isPrelaunch
        ? "Our planned starting area is " + countyText + ". Final availability will be confirmed through the licensing and staffing process."
        : "We currently serve " + countyText + ".";
    }

    var apply = $('[data-faq="apply"]');
    if (contact.careersEmail) {
      fill(apply, [
        (isPrelaunch ? "We are building our team. " : "") + "Nurses and caregivers can email ",
        { href: "mailto:" + contact.careersEmail, text: contact.careersEmail },
        " to ask about openings. Please do not send identification, Social Security numbers or other sensitive documents by email.",
      ]);
    }

    if (!isPrelaunch) {
      setText("[data-footer-status]", "Services and program participation are listed on this page.");
    }
  }

  /* ---------- Launch information / contact ---------- */
  function applyContact() {
    var showContact = !isPrelaunch || cfg.showContactInPrelaunch === true;
    var list = $("[data-contact-list]");
    var items = [];
    if (showContact) {
      if (contact.phone) items.push(["Phone: ", { href: telHref(contact.phone), text: contact.phone }]);
      if (contact.email) items.push(["Email: ", { href: "mailto:" + contact.email, text: contact.email }]);
      if (contact.hours) items.push(["Hours: " + contact.hours]);
      if (contact.address) items.push([contact.address]);
    }
    if (!items.length) return;

    items.forEach(function (parts) {
      var li = document.createElement("li");
      fill(li, parts);
      list.appendChild(li);
    });
    list.hidden = false;

    var intro = $("[data-contact-intro]");
    intro.textContent = isPrelaunch
      ? "We are not yet accepting clients, but you can reach us with general questions. Please do not send medical records or personal health information by email, text or voicemail."
      : "Reach us using the details below. Please do not send medical records or personal health information by email, text or voicemail. For an emergency, call 911.";
  }

  /* ---------- Launch-status dialog ---------- */
  function buildDialogBody() {
    if (isPrelaunch) return; // the prelaunch wording is already in the HTML
    $("#status-title").textContent = "Current status";
    var body = $("#status-body");
    body.textContent = "";

    var services = document.createElement("ul");
    Object.keys(SERVICE_NAMES).forEach(function (k) {
      var li = document.createElement("li");
      li.textContent = SERVICE_NAMES[k] + ": " + (serviceAvailable(k) ? "available" : "not yet available");
      services.appendChild(li);
    });
    var programs = document.createElement("ul");
    Object.keys(PROGRAM_NAMES).forEach(function (k) {
      var p = (cfg.programs || {})[k] || {};
      var li = document.createElement("li");
      li.textContent = PROGRAM_NAMES[k] + ": " + (programEnrolled(k) ? "participating" : p.status === "not-pursuing" ? "not offered" : "participation pending");
      programs.appendChild(li);
    });
    var h1 = document.createElement("p"); h1.textContent = "Services";
    var h2 = document.createElement("p"); h2.textContent = "Medicaid programs";
    body.append(h1, services, h2, programs);
  }

  function initDialog() {
    var dialog = $("#status");
    var openBtn = $("#launch");
    var closeBtn = $("#close");
    if (!dialog || !openBtn || typeof dialog.showModal !== "function") {
      // Very old browsers: keep the button honest by pointing at the FAQ instead.
      if (openBtn) openBtn.addEventListener("click", function () { location.hash = "#questions"; });
      return;
    }
    var opener = null;
    openBtn.addEventListener("click", function () {
      opener = document.activeElement;
      dialog.showModal();
      closeBtn.focus();
    });
    closeBtn.addEventListener("click", function () { dialog.close(); });
    // A click on the backdrop lands on the dialog element itself.
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    // Escape fires "cancel" then "close"; every close path restores focus here.
    dialog.addEventListener("close", function () {
      if (opener && typeof opener.focus === "function") opener.focus();
      opener = null;
    });
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var toggle = $(".menu-toggle");
    var menu = $("#site-menu");
    if (!toggle || !menu) return;

    function setOpen(open, returnFocus) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      if (!open && returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
      if (open) $("a", menu).focus();
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setOpen(false, true);
    });
    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !e.target.closest(".nav")) setOpen(false);
    });
    // Close the menu when focus leaves it (keyboard Tab past the last item).
    menu.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !e.relatedTarget.closest(".nav")) setOpen(false);
    });
    window.matchMedia("(min-width: 761px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  applyBrand();
  applyStatuses();
  applyMode();
  applyContact();
  buildDialogBody();
  initDialog();
  initMenu();
})();
