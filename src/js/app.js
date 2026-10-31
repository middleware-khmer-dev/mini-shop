(function () {
  "use strict";

  // Telegram WebApp integration (safe no-op outside Telegram)
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    applyTelegramTheme();
    syncViewportHeight();
    tg.onEvent("themeChanged", applyTelegramTheme);
    tg.onEvent("viewportChanged", syncViewportHeight);
    document.documentElement.classList.add("in-telegram");
  }

  function applyTelegramTheme() {
    var p = tg.themeParams || {};
    var root = document.documentElement.style;
    if (p.bg_color) root.setProperty("--tg-theme-bg-color", p.bg_color);
    if (p.text_color) root.setProperty("--tg-theme-text-color", p.text_color);
    if (p.hint_color) root.setProperty("--tg-theme-hint-color", p.hint_color);
    if (p.button_color) root.setProperty("--tg-theme-button-color", p.button_color);
    if (p.button_text_color) root.setProperty("--tg-theme-button-text-color", p.button_text_color);
  }

  // Keep the app shell sized to Telegram's actual viewport (differs per
  // device/screen and changes when the client's own chrome resizes it).
  function syncViewportHeight() {
    var height = tg.viewportStableHeight || tg.viewportHeight;
    if (height) {
      document.documentElement.style.setProperty("--tg-viewport-height", height + "px");
    }
  }

  // Open links via Telegram's own browser when running inside the mini app,
  // otherwise let the link open normally (new tab in a regular browser/app).
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;
    var isExternal = /^https?:\/\//i.test(href) && link.hostname !== window.location.hostname;
    if (tg && (isExternal || link.target === "_blank")) {
      e.preventDefault();
      tg.openLink(href, { try_instant_view: false });
    }
  });

  // ---- Tabs (Login / Register) ----
  var tabLogin = document.getElementById("tabLogin");
  var tabRegister = document.getElementById("tabRegister");
  var panelLogin = document.getElementById("panelLogin");
  var panelRegister = document.getElementById("panelRegister");
  var indicator = document.getElementById("tabsIndicator");
  var switchToRegister = document.getElementById("switchToRegister");
  var switchToLogin = document.getElementById("switchToLogin");

  function showLogin() {
    tabLogin.classList.add("is-active");
    tabRegister.classList.remove("is-active");
    tabLogin.setAttribute("aria-selected", "true");
    tabRegister.setAttribute("aria-selected", "false");
    indicator.classList.remove("to-register");

    panelLogin.hidden = false;
    panelRegister.hidden = true;
    panelLogin.classList.add("is-active");
    panelRegister.classList.remove("is-active");

    switchToRegister.hidden = false;
    switchToLogin.hidden = true;
  }

  function showRegister() {
    tabRegister.classList.add("is-active");
    tabLogin.classList.remove("is-active");
    tabRegister.setAttribute("aria-selected", "true");
    tabLogin.setAttribute("aria-selected", "false");
    indicator.classList.add("to-register");

    panelRegister.hidden = false;
    panelLogin.hidden = true;
    panelRegister.classList.add("is-active");
    panelLogin.classList.remove("is-active");

    switchToLogin.hidden = false;
    switchToRegister.hidden = true;
  }

  tabLogin.addEventListener("click", showLogin);
  tabRegister.addEventListener("click", showRegister);
  switchToRegister.querySelector("a").addEventListener("click", showRegister);
  switchToLogin.querySelector("a").addEventListener("click", showLogin);

  // ---- Password visibility toggles ----
  document.querySelectorAll("[data-toggle-password]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // ---- Simple field validation helpers ----
  function setError(field, message) {
    field.classList.add("field--error");
    var existing = field.querySelector(".field__error-text");
    if (!existing) {
      existing = document.createElement("span");
      existing.className = "field__error-text";
      field.appendChild(existing);
    }
    existing.textContent = message;
  }

  function clearError(field) {
    field.classList.remove("field--error");
    var existing = field.querySelector(".field__error-text");
    if (existing) existing.remove();
  }

  // ---- Password strength meter (register) ----
  var registerForm = document.getElementById("registerForm");
  var pwInput = registerForm.querySelector('input[name="password"]');
  var pwMeterBar = document.getElementById("pwMeterBar");

  pwInput.addEventListener("input", function () {
    var val = pwInput.value;
    var score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    var pct = (score / 4) * 100;
    pwMeterBar.style.width = pct + "%";
    pwMeterBar.style.background =
      score <= 1 ? "#ef4444" : score === 2 ? "#f59e0b" : score === 3 ? "#eab308" : "#22c55e";
  });

  // ---- Form submit handlers (use Auth from auth.js) ----
  if (Auth.isLoggedIn()) { Auth.goHome(); return; }
  var loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var phoneField = loginForm.querySelector('input[name="phone"]').closest("label");
    var pwField = loginForm.querySelector('input[name="password"]').closest("label");
    clearError(phoneField);
    clearError(pwField);

    var phone = loginForm.phone.value.trim();
    var password = loginForm.password.value;
    var ok = true;

    if (!/^0\d{7,9}$/.test(phone.replace(/\s/g, ""))) {
      setError(phoneField, "សូមបញ្ចូលលេខទូរស័ព្ទឱ្យត្រឹមត្រូវ");
      ok = false;
    }
    if (password.length < 1) {
      setError(pwField, "សូមបញ្ចូលពាក្យសម្ងាត់");
      ok = false;
    }
    if (ok) {
      var btn = loginForm.querySelector('button[type="submit"]');
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "...";
      Auth.login(phone.replace(/\s/g, ""), password, loginForm.remember.checked)
        .then(function () { Auth.goHome(); })
        .catch(function () {
          setError(pwField, "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
          btn.disabled = false;
          btn.textContent = label;
        });
    }
  });

  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = {
      fullname: registerForm.querySelector('input[name="fullname"]').closest("label"),
      phone: registerForm.querySelector('input[name="phone"]').closest("label"),
      password: registerForm.querySelector('input[name="password"]').closest("label"),
      confirm: registerForm.querySelector('input[name="confirm"]').closest("label"),
    };
    Object.values(fields).forEach(clearError);

    var ok = true;
    if (registerForm.fullname.value.trim().length < 2) {
      setError(fields.fullname, "សូមបញ្ចូលឈ្មោះពេញ");
      ok = false;
    }
    if (!/^0\d{7,9}$/.test(registerForm.phone.value.replace(/\s/g, ""))) {
      setError(fields.phone, "សូមបញ្ចូលលេខទូរស័ព្ទឱ្យត្រឹមត្រូវ");
      ok = false;
    }
    if (registerForm.password.value.length < 8) {
      setError(fields.password, "ពាក្យសម្ងាត់ត្រូវការយ៉ាងតិច ៨ តួអក្សរ");
      ok = false;
    }
    if (registerForm.confirm.value !== registerForm.password.value) {
      setError(fields.confirm, "ពាក្យសម្ងាត់មិនដូចគ្នា");
      ok = false;
    }
    if (!registerForm.terms.checked) {
      ok = false;
    }
    if (ok) {
      var rbtn = registerForm.querySelector('button[type="submit"]');
      var rlabel = rbtn.textContent;
      rbtn.disabled = true;
      rbtn.textContent = "...";
      Auth.register(
        registerForm.fullname.value.trim(),
        registerForm.phone.value.replace(/\s/g, ""),
        registerForm.password.value
      )
        .then(function () { Auth.goHome(); })
        .catch(function () {
          setError(fields.phone, "មិនអាចបង្កើតគណនីបានទេ សូមព្យាយាមម្តងទៀត");
          rbtn.disabled = false;
          rbtn.textContent = rlabel;
        });
    }
  });

  document.getElementById("btnTelegramLogin").addEventListener("click", function () {
    if (tg) {
      tg.HapticFeedback && tg.HapticFeedback.impactOccurred("light");
      console.log("Telegram auth requested", tg.initDataUnsafe && tg.initDataUnsafe.user);
    } else {
      console.log("Open inside Telegram to use Telegram login");
    }
  });
})();
