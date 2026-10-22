/*
 * Site forms (request-care, careers, referral-contact). Submissions go to
 * Netlify Forms. Without JavaScript the browser posts normally and lands on
 * /thank-you/. Messages come from each form's data-done, data-done-text,
 * data-error and data-sending attributes, so they can be translated.
 */
(function () {
  "use strict";

  function encode(data) {
    var parts = [];
    data.forEach(function (value, key) { parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value)); });
    return parts.join("&");
  }

  function setup(form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    var careFields = form.querySelector("[data-care-fields]");

    // Nurses and caregivers don't need the "who needs care" questions.
    if (careFields) {
      var sync = function () {
        var picked = form.querySelector('input[name="i_am"]:checked');
        var hide = !!(picked && picked.hasAttribute("data-hides-care"));
        careFields.hidden = hide;
        Array.prototype.forEach.call(careFields.querySelectorAll("select"), function (s) { s.disabled = hide; });
      };
      form.addEventListener("change", function (e) { if (e.target.name === "i_am") sync(); });
      sync();
    }

    form.addEventListener("submit", function (e) {
      if (!window.fetch || !window.FormData) return; // fall back to a normal post
      e.preventDefault();
      var data = new FormData(form);
      if (data.get("company")) return; // honeypot filled: quietly ignore bots

      button.disabled = true;
      status.className = "form-status";
      status.textContent = form.getAttribute("data-sending") || "Sending…";

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(data),
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var first = String(data.get("name") || "").trim().split(/\s+/)[0];
        var done = document.createElement("div");
        done.className = "form-done";
        done.setAttribute("tabindex", "-1");
        var h = document.createElement("h3");
        h.textContent = (form.getAttribute("data-done") || "Thanks{name}. We got your message.").replace("{name}", first ? ", " + first : "");
        var p = document.createElement("p");
        p.textContent = form.getAttribute("data-done-text") || "";
        done.append(h, p);
        form.replaceWith(done);
        done.focus();
      }).catch(function () {
        button.disabled = false;
        status.className = "form-status is-error";
        status.textContent = form.getAttribute("data-error") || "Sorry, that didn’t send. Please try again.";
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-netlify]"), setup);
})();
