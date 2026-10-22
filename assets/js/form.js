/*
 * "Request care" form. Submissions go to Netlify Forms (form name "request-care").
 * Without JavaScript the browser posts the form normally and lands on /thank-you/.
 */
(function () {
  "use strict";

  var form = document.getElementById("request-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var button = form.querySelector('button[type="submit"]');
  var careFields = form.querySelector("[data-care-fields]");

  // Nurses and caregivers don't need the "who needs care" questions.
  function syncCareFields() {
    var picked = form.querySelector('input[name="i_am"]:checked');
    var jobSeeker = picked && /nurse or caregiver/i.test(picked.value);
    careFields.hidden = jobSeeker;
    Array.prototype.forEach.call(careFields.querySelectorAll("select"), function (s) { s.disabled = jobSeeker; });
  }
  form.addEventListener("change", function (e) { if (e.target.name === "i_am") syncCareFields(); });
  syncCareFields();

  function encode(data) {
    var parts = [];
    data.forEach(function (value, key) { parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value)); });
    return parts.join("&");
  }

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !window.FormData) return; // fall back to a normal post
    e.preventDefault();
    var data = new FormData(form);
    if (data.get("company")) return; // honeypot filled: quietly ignore bots

    button.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";

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
      h.textContent = "Thanks" + (first ? ", " + first : "") + ". We got your request.";
      var p = document.createElement("p");
      p.textContent = "We’re opening soon and will call you at the number you gave us. For an emergency, call 911.";
      done.append(h, p);
      form.replaceWith(done);
      done.focus();
    }).catch(function () {
      button.disabled = false;
      status.className = "form-status is-error";
      status.textContent = "Sorry, that didn’t send. Please check your connection and try again.";
    });
  });
})();
