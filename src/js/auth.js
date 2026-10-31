(function () {
  "use strict";

  var KEY = "mini_shop_auth";
  var HOME = "home.html";
  var LOGIN = "index.html";
  var cfg = window.APP_CONFIG || {};

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "null");
    } catch (e) { return null; }
  }
  function save(session, remember) {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
  }

  function request(path, body) {
    return fetch(cfg.API_BASE.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || "request_failed");
        if (!data.token) throw new Error("invalid_response");
        return { token: data.token, user: data.user || { phone: body.phone, name: body.fullname || "" } };
      });
    });
  }

  // Demo backend used when API_BASE is empty
  function mock(body) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          token: "demo." + btoa(body.phone + ":" + Date.now()),
          user: { phone: body.phone, name: body.fullname || "សុវណ្ណារី" }
        });
      }, 400);
    });
  }

  function call(path, body) {
    return cfg.API_BASE ? request(path, body) : mock(body);
  }

  window.Auth = {
    session: read,
    isLoggedIn: function () { return !!(read() && read().token); },
    login: function (phone, password, remember) {
      return call("/auth/login", { phone: phone, password: password }).then(function (s) {
        save(s, remember);
        return s;
      });
    },
    register: function (fullname, phone, password) {
      return call("/auth/register", { fullname: fullname, phone: phone, password: password }).then(function (s) {
        save(s, true);
        return s;
      });
    },
    // Authorization header for later API calls
    headers: function () {
      var s = read();
      return s ? { Authorization: "Bearer " + s.token } : {};
    },
    logout: function () {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      location.replace(LOGIN);
    },
    goHome: function () { location.replace(HOME); }
  };

  // Page guard: <script src="auth.js" data-guard> on shop pages
  var self = document.currentScript;
  if (self && self.hasAttribute("data-guard")) {
    var inTelegram = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    if (!window.Auth.isLoggedIn() && !inTelegram) location.replace(LOGIN);
  }
})();
