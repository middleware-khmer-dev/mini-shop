(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };
  var app = $("app"), side = $("side"), top = $("top"), tabs = $("tabs"), toastEl = $("toast"), modalEl = $("modal");
  var password = sessionStorage.getItem("ms_admin") || "";
  var products = [], orders = [], ordersLoaded = false, loginAttempt = false;
  var PER = 10;
  var S = { products: { q: "", cat: "", sort: "name", page: 1 }, orders: { q: "", status: "", sort: "new", page: 1 } };
  var STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  var FLOW = ["pending", "confirmed", "shipped", "delivered"];
  var METHODS = { cod: "Cash on delivery", khqr: "QR payment", deposit: "50% deposit" };
  var refreshFn = null;

  // ---------- small helpers ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  var ICONS = {
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    box: "M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
    bag: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
    sliders: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35",
    plus: "M12 5v14 M5 12h14",
    edit: "M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
    trash: "M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
    check: "M20 6L9 17l-5-5",
    truck: "M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
    x: "M18 6L6 18 M6 6l12 12",
    left: "M19 12H5 M12 19l-7-7 7-7",
    chl: "M15 18l-6-6 6-6",
    chr: "M9 18l6-6-6-6",
    pin: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M21 15l-5-5L5 21",
    dollar: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
  };
  function icon(name, size) {
    var s = document.createElementNS(NS, "svg");
    [["viewBox", "0 0 24 24"], ["width", size || 18], ["height", size || 18], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", 2], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"]].forEach(function (a) { s.setAttribute(a[0], a[1]); });
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", ICONS[name]);
    s.appendChild(p);
    return s;
  }
  function btn(label, cls, ic, onclick, title) {
    return el("button", { class: "btn " + (cls || ""), onclick: onclick, title: title, "aria-label": title || label }, [ic ? icon(ic, 16) : null, label ? el("span", { text: label }) : null]);
  }
  function money(n) { return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  function dayKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function wipe(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  var toastTimer;
  function say(text, ok) {
    toastEl.textContent = text;
    toastEl.className = ok ? "ok" : "err";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastEl.textContent === text) toastEl.className = ""; }, ok ? 2600 : 7000); // errors stay a little longer; a tap dismisses them
  }
  toastEl.addEventListener("click", function () { toastEl.className = ""; });
  function api(method, path, body, type) {
    var headers = { authorization: "Bearer " + password };
    var init = { method: method, headers: headers };
    if (body !== undefined) {
      if (type) { headers["content-type"] = type; init.body = body; }
      else { headers["content-type"] = "application/json"; init.body = JSON.stringify(body); }
    }
    return fetch("/admin/api" + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          var e = new Error(data.error || "error"); e.status = r.status;
          if (r.status === 401 && !loginAttempt) { signOut("Session expired, please sign in again"); }
          throw e;
        }
        return data;
      });
    });
  }
  function ask(o) {
    return new Promise(function (resolve) {
      function close(v) { modalEl.className = ""; wipe(modalEl); document.removeEventListener("keydown", onKey); resolve(v); }
      function onKey(e) { if (e.key === "Escape") close(false); }
      var ok = btn(o.ok || "OK", o.danger ? "danger" : "", null, function () { close(true); });
      wipe(modalEl);
      modalEl.appendChild(el("div", { class: "dlg" }, [el("h3", { text: o.title }), el("p", { text: o.text || "" }), el("div", { class: "row" }, [btn("Cancel", "ghost", null, function () { close(false); }), ok])]));
      modalEl.onclick = function (e) { if (e.target === modalEl) close(false); };
      modalEl.className = "open";
      document.addEventListener("keydown", onKey);
      ok.focus();
    });
  }

  // ---------- Telegram Mini App: open fullscreen, keep clear of Telegram's own buttons ----------
  var tgBack = null, tgBackFn = null;
  function setBack(fn) {
    tgBackFn = fn;
    if (!tgBack) return;
    if (fn) tgBack.show(); else tgBack.hide();
  }
  (function telegram() {
    var hash = location.hash || "";
    var fromTelegram = /tgWebApp(Data|Platform|Version)=/.test(hash) || !!sessionStorage.getItem("__telegram__initParams") || !!window.TelegramWebviewProxy;
    if (!fromTelegram) return;
    try {
      // the SDK reads its launch data from the URL hash; remember it in case the hash is dropped later
      var params = {};
      hash.replace(/^#/, "").split("&").forEach(function (part) {
        var i = part.indexOf("=");
        if (i > 0) params[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1));
      });
      if (Object.keys(params).length) sessionStorage.setItem("__telegram__initParams", JSON.stringify(params));
    } catch (e) { /* ignore */ }
    var s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.onload = function () {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (!tg) return;
      function ok(v) { try { return tg.isVersionAtLeast(v); } catch (e) { return false; } }
      function run(f) { try { f(); } catch (e) { /* not supported by this client */ } }
      function insets() {
        var sa = tg.safeAreaInset || {}, ca = tg.contentSafeAreaInset || {};
        var st = document.documentElement.style;
        st.setProperty("--top", ((sa.top || 0) + (ca.top || 0)) + "px");
        st.setProperty("--bot", ((sa.bottom || 0) + (ca.bottom || 0)) + "px");
      }
      tg.ready(); tg.expand();
      if (ok("6.9")) { run(function () { tg.setHeaderColor("#f6ecfb"); }); run(function () { tg.setBackgroundColor("#ece8ff"); }); }
      if (ok("7.10")) run(function () { tg.setBottomBarColor("#ffffff"); });
      if (ok("7.7")) run(function () { tg.disableVerticalSwipes(); }); // scrolling must not close the app
      if (ok("8.0") && !tg.isFullscreen) run(function () { tg.requestFullscreen(); }); // phone and desktop; the layout follows the window width
      insets();
      ["safeAreaChanged", "contentSafeAreaChanged", "viewportChanged", "fullscreenChanged"].forEach(function (e) { tg.onEvent(e, insets); });
      if (tg.BackButton) {
        tgBack = tg.BackButton;
        tgBack.onClick(function () { if (tgBackFn) tgBackFn(); });
        setBack(tgBackFn);
      }
    };
    document.head.appendChild(s);
  })();

  // ---------- data ----------
  function loadProducts() { return api("GET", "/products").then(function (l) { products = l; return l; }); }
  function loadOrders() { return api("GET", "/orders").then(function (l) { orders = l; ordersLoaded = true; badge(); return l; }); }
  // First load after sign-in: both requests must settle before the "session expired" handler is re-armed,
  // otherwise the second 401 of a wrong password would replace the "Wrong password" message.
  function bootLoad() {
    loginAttempt = true;
    function settle(p) { return p.then(function (v) { return { v: v }; }, function (e) { return { e: e }; }); }
    return Promise.all([settle(loadProducts()), settle(loadOrders())]).then(function (r) {
      loginAttempt = false;
      if (r[0].e) throw r[0].e; // products are required; orders may fail without blocking
    });
  }
  function pendingCount() { return orders.filter(function (o) { return o.status === "pending"; }).length; }
  function badge() {
    var n = pendingCount();
    Array.prototype.forEach.call(document.querySelectorAll(".nbadge"), function (b) { b.textContent = n; b.style.display = n ? "" : "none"; });
  }
  function replaceOrder(u) { orders = orders.map(function (o) { return o.id === u.id ? u : o; }); }

  // ---------- chrome: sidebar (desktop), top bar, bottom tabs (phone) ----------
  var NAV = [
    ["dashboard", "grid", "Dashboard", "Overview", function () { viewDashboard(); }],
    ["products", "box", "Products", "Catalog", function () { viewProducts(); }],
    ["orders", "bag", "Orders", "Sales", function () { viewOrders(); }],
    ["settings", "sliders", "Settings", "System", function () { viewSettings(); }]
  ];
  function chrome(active, crumbs, refresh) {
    document.body.className = "";
    if (toastEl.className === "err") toastEl.className = "";
    refreshFn = refresh || null;
    wipe(side); wipe(top); wipe(tabs);
    side.appendChild(el("div", { class: "sbrand" }, [el("div", { class: "logo", text: "🛍️" }), el("div", {}, [el("b", { text: "Mini Shop" }), el("small", { text: "Admin console" })])]));
    var group = "";
    NAV.forEach(function (n) {
      if (n[3] !== group) { group = n[3]; side.appendChild(el("div", { class: "sgroup", text: group })); }
      var on = n[0] === active ? " on" : "";
      var b = el("button", { class: "nav" + on, onclick: n[4] }, [icon(n[1], 18), el("span", { text: n[2] }), n[0] === "orders" ? el("span", { class: "nbadge", style: "display:none" }) : null]);
      side.appendChild(b);
      tabs.appendChild(el("button", { class: "tab" + on, onclick: n[4], "aria-label": n[2] }, [icon(n[1], 20), el("span", { text: n[2] }), n[0] === "orders" ? el("span", { class: "nbadge", style: "display:none" }) : null]));
    });
    side.appendChild(el("div", { class: "sp" }));
    side.appendChild(el("div", { class: "user" }, [el("div", { class: "avatar", text: "A" }), el("div", { class: "grow" }, [el("b", { text: "Administrator" }), el("small", { text: "Shop owner" })]), btn("", "ghost ic", "logout", function () { signOut(); }, "Sign out")]));
    top.appendChild(el("div", { class: "brandm" }, [el("div", { class: "logo", text: "🛍️" }), el("span", { text: "Mini Shop" })]));
    var cr = el("div", { class: "crumbs" });
    crumbs.forEach(function (c, i) {
      if (i) cr.appendChild(icon("chr", 14));
      cr.appendChild(c[1] ? el("a", { onclick: c[1], text: c[0] }) : el("b", { text: c[0] }));
    });
    top.appendChild(cr);
    top.appendChild(el("div", { class: "sp" }));
    if (refresh) top.appendChild(btn("Refresh", "ghost sm", "refresh", refresh));
    top.appendChild(btn("", "ghost ic sm mobonly", "logout", function () { signOut(); }, "Sign out"));
    badge();
    window.scrollTo(0, 0);
  }
  function header(title, sub, actions) {
    return el("div", { class: "ph" }, [el("div", { class: "t" }, [el("h1", { text: title }), sub ? el("p", { text: sub }) : null]), el("div", { class: "acts" }, actions || [])]);
  }
  function skeleton(n) {
    var c = el("div", { class: "card" });
    for (var i = 0; i < (n || 5); i++) c.appendChild(el("div", { class: "skel", style: "width:" + (60 + (i * 13) % 40) + "%" }));
    return c;
  }
  function empty(ic, title, text, action) {
    return el("div", { class: "empty" }, [el("div", { class: "bub v" }, [icon(ic, 24)]), el("div", { class: "strong", text: title }), el("div", { text: text || "" }), action ? el("div", { style: "margin-top:14px" }, [action]) : null]);
  }

  // ---------- reusable pieces ----------
  function chip(status, label) { return el("span", { class: "chip " + status, text: label || cap(status) }); }
  function payState(o) {
    if (o.status === "cancelled") return null;
    if (o.paid >= o.total && o.total > 0) return "paid";
    return o.paid > 0 ? "partial" : "unpaid";
  }
  function table(cols, rows, onRow) {
    var thead = el("thead", {}, [el("tr", {}, cols.map(function (c) { return el("th", { class: c.cls || "", text: c.label }); }))]);
    var tbody = el("tbody", {});
    rows.forEach(function (r) {
      var tr = el("tr", onRow ? { class: "click", tabindex: "0", onclick: function () { onRow(r); }, onkeydown: function (e) { if (e.key === "Enter") onRow(r); } } : {});
      cols.forEach(function (c) {
        var td = el("td", { class: c.cls || "", "data-label": c.label });
        var v = c.cell(r);
        if (v != null && v !== false) td.appendChild(typeof v === "string" || typeof v === "number" ? document.createTextNode(String(v)) : v);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    return el("div", { class: "tblwrap" }, [el("table", { class: "tbl" }, [thead, tbody])]);
  }
  function pager(total, page, go) {
    var pages = Math.max(1, Math.ceil(total / PER));
    var a = total ? (page - 1) * PER + 1 : 0, b = Math.min(total, page * PER);
    var box = el("div", { class: "pager" }, [el("span", { text: total ? "Showing " + a + "–" + b + " of " + total : "No results" }), el("div", { class: "sp" })]);
    if (pages > 1) {
      box.appendChild(el("button", { class: "pg", disabled: page <= 1, onclick: function () { go(page - 1); }, "aria-label": "Previous page" }, [icon("chl", 16)]));
      var last = 0;
      for (var i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
          if (last && i - last > 1) box.appendChild(el("span", { text: "…" }));
          box.appendChild(el("button", { class: "pg" + (i === page ? " on" : ""), text: String(i), onclick: (function (n) { return function () { go(n); }; })(i) }));
          last = i;
        }
      }
      box.appendChild(el("button", { class: "pg", disabled: page >= pages, onclick: function () { go(page + 1); }, "aria-label": "Next page" }, [icon("chr", 16)]));
    }
    return box;
  }
  function searchBox(value, placeholder, onInput) {
    var input = el("input", { type: "search", placeholder: placeholder, value: value, "aria-label": placeholder });
    input.value = value;
    input.addEventListener("input", function () { onInput(input.value); });
    return el("div", { class: "search" }, [icon("search", 16), input]);
  }
  function select(opts, value, onChange, label) {
    var s = el("select", { "aria-label": label }, opts.map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
    s.value = value;
    s.addEventListener("change", function () { onChange(s.value); });
    return s;
  }
  function field(label, input, hint) {
    return el("div", { class: "field" }, [el("label", { text: label }), input, hint ? el("div", { class: "hint", text: hint }) : null]);
  }
  function kv(k, v, cls) { return el("div", { class: "kv " + (cls || "") }, [el("span", { class: cls ? "" : "muted", text: k }), typeof v === "object" ? v : el("span", { class: "strong", text: v })]); }

  // ---------- login ----------
  function signOut(note) {
    sessionStorage.removeItem("ms_admin"); password = ""; orders = []; ordersLoaded = false;
    viewLogin(note);
  }
  function viewLogin(note) {
    clear(); setBack(null); refreshFn = null;
    document.body.className = "login";
    var input = el("input", { type: "password", placeholder: "Enter your password", autocomplete: "current-password", id: "pw" });
    var go = btn("Sign in", "", null, function () {
      password = input.value;
      go.disabled = true;
      bootLoad().then(function () {
        sessionStorage.setItem("ms_admin", password);
        viewDashboard();
      }).catch(function (e) { go.disabled = false; password = ""; say(e.status === 401 ? "Wrong password" : "Could not sign in (" + e.message + ")"); });
    });
    go.style.width = "100%"; go.style.minHeight = "44px";
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    app.appendChild(el("div", { class: "loginwrap" }, [el("div", { class: "card logincard" }, [
      el("div", { class: "logo", text: "🛍️" }), el("h1", { text: "Mini Shop" }), el("div", { class: "muted", text: "Admin console" }),
      field("Password", input), go
    ])]));
    if (note) say(note);
  }

  // ---------- dashboard ----------
  function viewDashboard() {
    chrome("dashboard", [["Dashboard"]], function () { viewDashboard(true); });
    setBack(null); clear();
    app.appendChild(header("Dashboard", "How your shop is doing"));
    var holder = el("div", {}, [skeleton(4)]);
    app.appendChild(holder);
    var arguments0 = arguments[0];
    (arguments0 === true || !ordersLoaded ? loadOrders() : Promise.resolve(orders)).then(function () { return arguments0 === true ? loadProducts() : products; }).then(function () {
      wipe(holder); holder.appendChild(dashboardBody());
    }).catch(function (e) { wipe(holder); holder.appendChild(el("div", { class: "card" }, [empty("alert", "Could not load data", e.message)])); });
  }
  function dashboardBody() {
    var live = orders.filter(function (o) { return o.status !== "cancelled"; });
    var revenue = live.reduce(function (s, o) { return s + o.total; }, 0);
    var collected = live.reduce(function (s, o) { return s + o.paid; }, 0);
    var todayKey = dayKey(new Date());
    var today = orders.filter(function (o) { return dayKey(new Date(o.createdAt)) === todayKey; }).length;
    var pending = pendingCount();
    var deposits = live.filter(function (o) { return o.payMethod === "deposit" && o.paid < o.deposit; });
    var noPic = products.filter(function (p) { return !p.images || !p.images.length; });
    var cats = {}; products.forEach(function (p) { cats[p.category] = 1; });
    var wrap = el("div", {});

    function kpi(cls, ic, label, value, sub) {
      return el("div", { class: "card kpi" }, [el("div", { class: "bub " + cls }, [icon(ic, 22)]), el("div", {}, [el("div", { class: "lb", text: label }), el("div", { class: "vl", text: value }), el("div", { class: "sb", text: sub })])]);
    }
    wrap.appendChild(el("div", { class: "kpis" }, [
      kpi("v", "dollar", "Revenue", money(revenue), "Collected " + money(collected)),
      kpi("b", "bag", "Orders", String(orders.length), today + " today"),
      kpi("a", "clock", "Needs action", String(pending), "pending confirmation"),
      kpi("g", "box", "Products", String(products.length), Object.keys(cats).length + " categories")
    ]));

    // last 7 days revenue chart
    var days = [];
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push({ d: d, key: dayKey(d), sum: 0, n: 0 }); }
    live.forEach(function (o) { var k = dayKey(new Date(o.createdAt)); days.forEach(function (x) { if (x.key === k) { x.sum += o.total; x.n++; } }); });
    var max = Math.max.apply(null, days.map(function (x) { return x.sum; }).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log(max) / Math.LN10)); max = Math.ceil(max / step) * step;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 640 250"); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Revenue for the last 7 days");
    function s(tag, attrs, text) { var n = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (text != null) n.textContent = text; return n; }
    var defs = s("defs", {}); var g = s("linearGradient", { id: "bg", x1: 0, y1: 0, x2: 0, y2: 1 });
    g.appendChild(s("stop", { offset: "0", "stop-color": "#a78bfa" })); g.appendChild(s("stop", { offset: "1", "stop-color": "#7c6cf0" })); defs.appendChild(g); svg.appendChild(defs);
    for (var t = 0; t <= 4; t++) {
      var y = 20 + (190 * t) / 4;
      svg.appendChild(s("line", { x1: 46, x2: 630, y1: y, y2: y, stroke: "#e5e7eb", "stroke-dasharray": t === 4 ? "" : "4 4" }));
      svg.appendChild(s("text", { x: 40, y: y + 4, "text-anchor": "end" }, "$" + Math.round(max * (1 - t / 4))));
    }
    days.forEach(function (x, idx) {
      var bw = 46, gap = (584 - 7 * bw) / 7, bx = 46 + gap / 2 + idx * (bw + gap), h = (x.sum / max) * 190;
      var bar = s("rect", { x: bx, y: 210 - h, width: bw, height: Math.max(h, x.sum ? 3 : 0), rx: 8, fill: "url(#bg)" });
      bar.appendChild(s("title", {}, x.d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) + ": " + money(x.sum) + " (" + x.n + " orders)"));
      svg.appendChild(bar);
      if (x.sum) svg.appendChild(s("text", { x: bx + bw / 2, y: 204 - h, "text-anchor": "middle", class: "val" }, "$" + Math.round(x.sum)));
      svg.appendChild(s("text", { x: bx + bw / 2, y: 232, "text-anchor": "middle" }, x.d.toLocaleDateString(undefined, { weekday: "short" })));
    });
    var chartCard = el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Revenue, last 7 days" }), el("span", { class: "sub", text: "cancelled orders excluded" })]), svg]);

    // status breakdown
    var colors = { pending: "#f59e0b", confirmed: "#3b82f6", shipped: "#8b5cf6", delivered: "#22c55e", cancelled: "#f43f5e" };
    var counts = {}; STATUSES.forEach(function (st) { counts[st] = orders.filter(function (o) { return o.status === st; }).length; });
    var stack = el("div", { class: "stack" }); var legend = el("div", { class: "legend" });
    STATUSES.forEach(function (st) {
      if (counts[st]) stack.appendChild(el("i", { style: "width:" + (counts[st] / orders.length) * 100 + "%;background:" + colors[st], title: cap(st) }));
      legend.appendChild(el("div", { class: "row" }, [el("span", {}, [el("span", { class: "dot", style: "background:" + colors[st] }), cap(st)]), el("b", { text: String(counts[st]) })]));
    });
    var statusCard = el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Orders by status" })]), orders.length ? stack : null, legend]);

    // needs attention
    function todo(cls, ic, text, label, fn) {
      return el("div", { class: "todo" }, [el("div", { class: "bub " + cls }, [icon(ic, 18)]), el("div", { class: "grow", text: text }), btn(label, "ghost sm", null, fn)]);
    }
    var items = [];
    if (pending) items.push(todo("a", "clock", pending + " order(s) waiting for confirmation", "Review", function () { S.orders.status = "pending"; S.orders.page = 1; viewOrders(); }));
    if (deposits.length) items.push(todo("r", "dollar", deposits.length + " deposit(s) not received yet", "Check", function () { S.orders.status = ""; S.orders.q = ""; viewOrders(); }));
    if (noPic.length) items.push(todo("b", "image", noPic.length + " product(s) without pictures", "Fix", function () { S.products.q = ""; S.products.cat = ""; viewProducts(); }));
    var todoCard = el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Needs attention" })])].concat(items.length ? items : [el("div", { class: "muted", text: "Nothing to do. You are all caught up ✨" })]));

    wrap.appendChild(el("div", { class: "dgrid" }, [chartCard, el("div", {}, [statusCard, todoCard])]));

    // recent orders
    var recent = el("div", { class: "card flush" }, [el("div", { class: "ch", style: "padding:16px 16px 0" }, [el("h2", { text: "Recent orders" }), el("div", { class: "sp" }), btn("View all", "ghost sm", null, function () { S.orders.status = ""; S.orders.q = ""; viewOrders(); })])]);
    recent.appendChild(orders.length ? orderTable(orders.slice(0, 5)) : empty("bag", "No orders yet", "New orders from the shop will show up here."));
    wrap.appendChild(recent);
    return wrap;
  }

  // ---------- orders ----------
  function orderTable(rows) {
    return table([
      { label: "Order", cls: "first", cell: function (o) { return el("div", {}, [el("div", { class: "strong", text: o.id }), el("div", { class: "muted small", text: when(o.createdAt) })]); } },
      { label: "Customer", cell: function (o) { return el("div", {}, [el("div", { class: "strong", text: o.customer.name }), el("div", { class: "muted small", text: o.customer.phone })]); } },
      { label: "Items", cell: function (o) { return String(o.items.reduce(function (s, i) { return s + i.qty; }, 0)); } },
      { label: "Payment", cell: function (o) { var ps = payState(o); return el("div", {}, [el("div", { class: "small muted", text: METHODS[o.payMethod] || o.payMethod }), ps ? chip(ps) : null]); } },
      { label: "Total", cls: "r", cell: function (o) { return el("span", { class: "strong", text: money(o.total) }); } },
      { label: "Status", cell: function (o) { return chip(o.status); } }
    ], rows, viewOrder);
  }
  function viewOrders() {
    chrome("orders", [["Orders"]], function () { loadOrders().then(function () { viewOrders(); }).catch(function (e) { say("Could not load orders: " + e.message); }); });
    setBack(null); clear();
    var st = S.orders;
    app.appendChild(header("Orders", "Track, confirm and ship customer orders"));
    var holder = el("div", {}, [skeleton(6)]);
    app.appendChild(holder);
    (ordersLoaded ? Promise.resolve(orders) : loadOrders()).then(function () { wipe(holder); build(); }).catch(function (e) { wipe(holder); holder.appendChild(el("div", { class: "card" }, [empty("alert", "Could not load orders", e.message)])); });
    function build() {
      var card = el("div", { class: "card flush" });
      var segBox = el("div", {}), listBox = el("div", {});
      function segs() {
        wipe(segBox);
        var s = el("div", { class: "seg" });
        [""].concat(STATUSES).forEach(function (k) {
          var n = k ? orders.filter(function (o) { return o.status === k; }).length : orders.length;
          s.appendChild(el("button", { class: k === st.status ? "on" : "", onclick: function () { st.status = k; st.page = 1; segs(); rows(); } }, [cap(k || "all"), el("i", { text: String(n) })]));
        });
        segBox.appendChild(s);
      }
      function rows() {
        wipe(listBox);
        var q = st.q.trim().toLowerCase();
        var list = orders.filter(function (o) {
          return (!st.status || o.status === st.status) && (!q || (o.id + " " + o.customer.name + " " + o.customer.phone).toLowerCase().indexOf(q) >= 0);
        });
        list.sort(function (a, b) {
          if (st.sort === "old") return a.createdAt < b.createdAt ? -1 : 1;
          if (st.sort === "high") return b.total - a.total;
          if (st.sort === "low") return a.total - b.total;
          return a.createdAt < b.createdAt ? 1 : -1;
        });
        var pages = Math.max(1, Math.ceil(list.length / PER)); if (st.page > pages) st.page = pages;
        if (!list.length) { listBox.appendChild(empty("bag", orders.length ? "No matching orders" : "No orders yet", orders.length ? "Try another search or status." : "New orders from the shop will show up here.")); return; }
        listBox.appendChild(orderTable(list.slice((st.page - 1) * PER, st.page * PER)));
        listBox.appendChild(pager(list.length, st.page, function (p) { st.page = p; rows(); }));
      }
      card.appendChild(el("div", { class: "toolbar" }, [
        searchBox(st.q, "Search order, name or phone", function (v) { st.q = v; st.page = 1; rows(); }),
        select([["new", "Newest first"], ["old", "Oldest first"], ["high", "Highest total"], ["low", "Lowest total"]], st.sort, function (v) { st.sort = v; rows(); }, "Sort")
      ]));
      card.appendChild(segBox); card.appendChild(listBox);
      segs(); rows();
      holder.appendChild(card);
    }
  }
  function viewOrder(o) {
    function back() { viewOrders(); }
    chrome("orders", [["Orders", back], [o.id]], function () { loadOrders().then(function () { var u = orders.filter(function (x) { return x.id === o.id; })[0]; if (u) viewOrder(u); }); });
    setBack(back); clear();
    function patch(body, msg) {
      return api("PATCH", "/orders/" + o.id, body).then(function (u) { replaceOrder(u); badge(); say(msg, true); viewOrder(u); }).catch(function (e) { say("Could not save: " + e.message); });
    }
    var idx = FLOW.indexOf(o.status), closed = o.status === "delivered" || o.status === "cancelled";
    var next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
    var nextIcon = { confirmed: "check", shipped: "truck", delivered: "check" };
    var acts = [btn("Back", "ghost", "left", back)];
    if (next) acts.push(btn("Mark as " + next, "", nextIcon[next], function () { patch({ status: next }, "Order " + next); }));
    app.appendChild(header("Order " + o.id, when(o.createdAt), acts));

    // left column: items + payment
    var itemsTable = table([
      { label: "Item", cls: "first", cell: function (i) { return el("div", {}, [el("div", { class: "strong", text: i.name }), i.variant ? el("div", { class: "muted small", text: "Option: " + i.variant }) : null]); } },
      { label: "Price", cls: "r", cell: function (i) { return money(i.price); } },
      { label: "Qty", cls: "r", cell: function (i) { return String(i.qty); } },
      { label: "Total", cls: "r", cell: function (i) { return el("span", { class: "strong", text: money(i.price * i.qty) }); } }
    ], o.items);
    var items = el("div", { class: "card flush" }, [el("div", { class: "ch", style: "padding:16px 16px 4px" }, [el("h2", { text: "Items" })]), itemsTable,
      el("div", { style: "padding:8px 16px 16px" }, [kv("Subtotal", money(o.subtotal)), kv("Shipping (" + o.shippingId + ")", money(o.shipping)), kv("Total", money(o.total), "total")])]);

    var due = Math.max(0, o.total - o.paid), pct = o.total ? Math.min(100, (o.paid / o.total) * 100) : 0, ps = payState(o);
    var payActs = [];
    if (o.payMethod === "deposit" && o.paid < o.deposit) payActs.push(btn("Deposit received (" + money(o.deposit) + ")", "ghost sm", "check", function () { patch({ paid: o.deposit }, "Deposit marked as received"); }));
    if (o.paid < o.total) payActs.push(btn("Mark fully paid", "good sm", "check", function () { patch({ paid: o.total }, "Marked as fully paid"); }));
    if (o.paid > 0) payActs.push(btn("Reset", "danger sm", null, function () { patch({ paid: 0 }, "Payment reset"); }));
    var pay = el("div", { class: "card" }, [
      el("div", { class: "ch" }, [el("h2", { text: "Payment" }), el("div", { class: "sp" }), ps ? chip(ps) : null]),
      kv("Method", METHODS[o.payMethod] || o.payMethod),
      o.payMethod === "deposit" ? kv("Deposit (50%)", money(o.deposit)) : null,
      kv("Received", money(o.paid)), kv("Still due", money(due)),
      el("div", { class: "bar" }, [el("i", { style: "width:" + pct + "%" })]),
      payActs.length ? el("div", { class: "row wrap", style: "margin-top:10px" }, payActs) : null
    ]);

    // right column: status, customer
    var steps = el("div", { class: "steps" });
    FLOW.forEach(function (k, i) {
      var cls = o.status === "cancelled" ? "" : i < idx ? "done" : i === idx ? "now" : "";
      steps.appendChild(el("div", { class: "step " + cls }, [el("div", { class: "c" }, [cls === "done" || (cls === "now" && k === "delivered") ? icon("check", 14) : null]), cap(k)]));
    });
    var statusSel = select(STATUSES.map(function (k) { return [k, cap(k)]; }), o.status, function (v) { if (v !== o.status) patch({ status: v }, "Status: " + v); }, "Change status");
    var status = el("div", { class: "card" }, [
      el("div", { class: "ch" }, [el("h2", { text: "Status" }), el("div", { class: "sp" }), chip(o.status)]),
      o.status === "cancelled" ? el("div", { class: "muted", style: "margin-bottom:12px", text: "This order was cancelled." }) : steps,
      field("Change status", statusSel),
      !closed ? btn("Cancel order", "danger sm", "x", function () { ask({ title: "Cancel order " + o.id + "?", text: "The customer will see the order as cancelled.", ok: "Cancel order", danger: true }).then(function (yes) { if (yes) patch({ status: "cancelled" }, "Order cancelled"); }); }) : null
    ]);
    var mapLink = null;
    if (o.location && isFinite(o.location.lat) && isFinite(o.location.lng)) {
      mapLink = el("a", { target: "_blank", rel: "noopener noreferrer", class: "row", style: "margin-top:8px;color:#4f46e5;font-weight:700;text-decoration:none", href: "https://www.openstreetmap.org/?mlat=" + Number(o.location.lat) + "&mlon=" + Number(o.location.lng) + "#map=17/" + Number(o.location.lat) + "/" + Number(o.location.lng) }, [icon("pin", 16), el("span", { text: "Open pin on the map" })]);
    }
    var tel = el("a", { class: "row", style: "color:inherit;text-decoration:none", href: "tel:" + String(o.customer.phone).replace(/[^0-9+]/g, "") }, [icon("phone", 15), el("span", { text: o.customer.phone })]);
    var cust = el("div", { class: "card" }, [
      el("div", { class: "ch" }, [el("h2", { text: "Customer" })]),
      el("div", { class: "strong", text: o.customer.name }), el("div", { style: "margin:4px 0 14px" }, [tel]),
      el("div", { class: "muted small strong", text: "DELIVERY ADDRESS" }), el("div", { text: o.address }), mapLink,
      o.note ? el("div", { style: "margin-top:14px" }, [el("div", { class: "muted small strong", text: "NOTE FROM CUSTOMER" }), el("div", { text: o.note })]) : null
    ]);
    app.appendChild(el("div", { class: "cols" }, [el("div", {}, [items, pay]), el("div", {}, [status, cust])]));
  }

  // ---------- products ----------
  function viewProducts() {
    chrome("products", [["Products"]], function () { loadProducts().then(function () { viewProducts(); }).catch(function (e) { say("Could not load products: " + e.message); }); });
    setBack(null); clear();
    var st = S.products;
    app.appendChild(header("Products", "Everything customers can buy", [btn("Import samples", "ghost", null, importSamples), btn("Add product", "", "plus", function () { viewEditor(null); })]));
    var card = el("div", { class: "card flush" }), listBox = el("div", {});
    var cats = Array.from(new Set(products.map(function (p) { return p.category; }))).sort();
    function rows() {
      wipe(listBox);
      var q = st.q.trim().toLowerCase();
      var list = products.filter(function (p) { return (!st.cat || p.category === st.cat) && (!q || (p.title + " " + p.category + " " + p.id).toLowerCase().indexOf(q) >= 0); });
      list.sort(function (a, b) {
        if (st.sort === "low") return a.price - b.price;
        if (st.sort === "high") return b.price - a.price;
        if (st.sort === "new") return b.id - a.id;
        return a.title.localeCompare(b.title);
      });
      var pages = Math.max(1, Math.ceil(list.length / PER)); if (st.page > pages) st.page = pages;
      if (!list.length) {
        listBox.appendChild(products.length ? empty("search", "No matching products", "Try another search or category.") : empty("box", "No products yet", "Add your first product, or import the sample products to start.", btn("Import sample products", "ghost", null, importSamples)));
        return;
      }
      listBox.appendChild(table([
        { label: "Product", cls: "first", cell: function (p) {
          var th = el("div", { class: "thumb" }, [p.images && p.images[0] ? el("img", { src: p.images[0], alt: "", loading: "lazy" }) : icon("image", 18)]);
          return el("div", { class: "cell" }, [th, el("div", { style: "min-width:0" }, [el("div", { class: "nm", text: p.title }), el("div", { class: "muted small", text: "ID " + p.id })])]);
        } },
        { label: "Category", cell: function (p) { return el("span", { class: "chip", text: p.category }); } },
        { label: "Price", cls: "r", cell: function (p) { return el("span", { class: "strong", text: money(p.price) }); } },
        { label: "Rating", cell: function (p) { return p.rating && p.rating.count ? el("span", { class: "row", style: "gap:4px;white-space:nowrap" }, [icon("star", 14), p.rating.rate + " (" + p.rating.count + ")"]) : el("span", { class: "muted", text: "—" }); } },
        { label: "Pictures", cell: function (p) { var n = p.images ? p.images.length : 0; return n ? String(n) : el("span", { class: "chip pending", text: "None" }); } },
        { cls: "act", label: "Actions", cell: function (p) {
          return el("div", { class: "row", style: "justify-content:flex-end;gap:6px" }, [
            btn("", "ghost ic", "edit", function (e) { e.stopPropagation(); viewEditor(p); }, "Edit"),
            btn("", "danger ic", "trash", function (e) { e.stopPropagation(); removeProduct(p); }, "Delete")
          ]);
        } }
      ], list.slice((st.page - 1) * PER, st.page * PER), viewEditor));
      listBox.appendChild(pager(list.length, st.page, function (p) { st.page = p; rows(); }));
    }
    card.appendChild(el("div", { class: "toolbar" }, [
      searchBox(st.q, "Search products", function (v) { st.q = v; st.page = 1; rows(); }),
      select([["", "All categories"]].concat(cats.map(function (c) { return [c, c]; })), st.cat, function (v) { st.cat = v; st.page = 1; rows(); }, "Category"),
      select([["name", "Name A–Z"], ["new", "Newest"], ["low", "Price: low to high"], ["high", "Price: high to low"]], st.sort, function (v) { st.sort = v; rows(); }, "Sort")
    ]));
    card.appendChild(listBox);
    rows();
    app.appendChild(card);
  }
  function removeProduct(p) {
    ask({ title: "Delete “" + p.title + "”?", text: "The product and its pictures will be removed from the shop.", ok: "Delete", danger: true }).then(function (yes) {
      if (!yes) return;
      api("DELETE", "/products/" + p.id).then(loadProducts).then(function () { say("Product deleted", true); viewProducts(); }).catch(function (e) { say("Could not delete: " + e.message); });
    });
  }
  function importSamples() {
    ask({ title: "Import sample products?", text: "Adds the 20 sample products from fakestoreapi.com to your shop.", ok: "Import" }).then(function (yes) {
      if (!yes) return;
      say("Importing...", true);
      fetch("https://fakestoreapi.com/products").then(function (r) { return r.json(); }).then(function (list) {
        var chain = Promise.resolve();
        list.forEach(function (s) {
          chain = chain.then(function () {
            return api("POST", "/products", { title: s.title, price: s.price, category: s.category, description: s.description, images: [s.image], rating: { rate: s.rating && s.rating.rate, count: s.rating && s.rating.count } });
          });
        });
        return chain;
      }).then(loadProducts).then(function (list) { say("Imported " + list.length + " products", true); viewProducts(); })
        .catch(function (e) { say("Import failed: " + e.message); });
    });
  }

  // ---------- product editor ----------
  function viewEditor(p) {
    function back() { viewProducts(); }
    chrome("products", [["Products", back], [p ? "Edit product" : "New product"]]);
    setBack(back); clear();
    var images = p && p.images ? p.images.slice() : [];
    var f = {
      title: el("input", { maxlength: "200", placeholder: "Product name" }), price: el("input", { type: "number", step: "0.01", min: "0", placeholder: "0.00", inputmode: "decimal" }),
      category: el("input", { list: "cats", maxlength: "60", placeholder: "e.g. clothing" }), description: el("textarea", { maxlength: "5000", placeholder: "Describe the product" })
    };
    f.title.value = p ? p.title : ""; f.price.value = p ? p.price : ""; f.category.value = p ? p.category : ""; f.description.value = p ? p.description : "";
    var cats = el("datalist", { id: "cats" });
    Array.from(new Set(products.map(function (x) { return x.category; }))).forEach(function (c) { cats.appendChild(el("option", { value: c })); });
    var grid = el("div", { class: "imgs" });
    var file = el("input", { type: "file", accept: "image/*", multiple: "multiple", style: "display:none" });
    function drawImages() {
      wipe(grid);
      images.forEach(function (u, i) {
        function move(d) { var j = i + d; if (j < 0 || j >= images.length) return; var t = images[i]; images[i] = images[j]; images[j] = t; drawImages(); }
        grid.appendChild(el("div", { class: "img" }, [
          i === 0 ? el("span", { class: "badge", text: "Main" }) : null, el("img", { src: u, alt: "" }),
          el("div", { class: "row" }, [btn("", "ghost ic sm", "chl", function () { move(-1); }, "Move left"), btn("", "ghost ic sm", "chr", function () { move(1); }, "Move right"), btn("", "danger ic sm", "x", function () { images.splice(i, 1); drawImages(); }, "Remove")])
        ]));
      });
      if (!images.length) grid.appendChild(el("div", { class: "muted", style: "grid-column:1/-1", text: "No pictures yet." }));
    }
    drawImages();
    // shrink big photos in the browser so uploads stay small and the shop loads fast
    function shrink(fileObj) {
      return createImageBitmap(fileObj).then(function (bmp) {
        var max = 1200, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
        var c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("image")); }, "image/jpeg", 0.85); });
      });
    }
    file.addEventListener("change", function () {
      var picked = Array.from(file.files);
      file.value = "";
      if (!picked.length) return;
      say("Uploading " + picked.length + " picture(s)...", true);
      var chain = Promise.resolve();
      picked.forEach(function (one) {
        chain = chain.then(function () { return shrink(one); }).then(function (blob) { return api("POST", "/images", blob, "image/jpeg"); })
          .then(function (r) { if (images.length < 12) images.push(r.url); drawImages(); });
      });
      chain.then(function () { say("Uploaded", true); }).catch(function (e) { say("Upload failed: " + e.message); });
    });
    var saveBtn = btn("Save product", "", "check", function () {
      var body = { title: f.title.value, price: f.price.value, category: f.category.value, description: f.description.value, images: images, rating: p ? p.rating : undefined };
      saveBtn.disabled = true;
      (p ? api("PUT", "/products/" + p.id, body) : api("POST", "/products", body)).then(loadProducts)
        .then(function () { say("Product saved", true); viewProducts(); })
        .catch(function (e) { saveBtn.disabled = false; say("Could not save: " + ({ title_required: "the name is required", bad_price: "the price is not valid", category_required: "the category is required" }[e.message] || e.message)); });
    });
    app.appendChild(header(p ? "Edit product" : "New product", p ? "ID " + p.id : "Add something new to your shop", [btn("Cancel", "ghost", null, back), saveBtn]));
    var main = el("div", { class: "card" }, [
      el("div", { class: "ch" }, [el("h2", { text: "Details" })]),
      field("Name", f.title),
      el("div", { class: "two" }, [field("Price (USD)", f.price), field("Category", f.category)]), cats,
      field("Description", f.description)
    ]);
    var pics = el("div", { class: "card" }, [
      el("div", { class: "ch" }, [el("h2", { text: "Pictures" }), el("span", { class: "sub", text: "the first one is the main picture" }), el("div", { class: "sp" }), btn("Add", "ghost sm", "plus", function () { file.click(); })]),
      grid, file
    ]);
    var side2 = [pics];
    if (p) side2.push(el("div", { class: "card danger-zone" }, [el("div", { class: "ch" }, [el("h2", { text: "Danger zone" })]), el("div", { class: "muted", style: "margin-bottom:12px", text: "Deleting removes the product and its pictures." }), btn("Delete product", "danger", "trash", function () { removeProduct(p); })]));
    app.appendChild(el("div", { class: "cols" }, [main, el("div", {}, side2)]));
  }

  // ---------- settings ----------
  function viewSettings() {
    chrome("settings", [["Settings"]]);
    setBack(null); clear();
    app.appendChild(header("Settings", "Delivery, cash payments and your payment QR"));
    var holder = el("div", {}, [skeleton(6)]);
    app.appendChild(holder);
    api("GET", "/settings").then(function (st) { wipe(holder); holder.appendChild(settingsForm(st)); })
      .catch(function (e) { wipe(holder); holder.appendChild(el("div", { class: "card" }, [empty("alert", "Could not load settings", e.message)])); });
  }
  function settingsForm(st) {
    var lat = el("input", { type: "number", step: "any" }), lng = el("input", { type: "number", step: "any" }), km = el("input", { type: "number", step: "0.5", min: "0.5" });
    lat.value = st.shop.lat; lng.value = st.shop.lng; km.value = st.radiusKm;
    var extra = el("input", { type: "number", step: "0.01", min: "0" }); extra.value = st.expressExtra;
    var tiers = (st.tiers || []).map(function (t) { return { upToKm: t.upToKm, fee: t.fee }; });
    var tierBox = el("div", {});
    function drawTiers() {
      wipe(tierBox);
      tiers.forEach(function (t, i) {
        var last = i === tiers.length - 1;
        var up = el("input", { type: "number", step: "0.5", min: "0.5", "aria-label": "Up to km" }), fee = el("input", { type: "number", step: "0.01", min: "0", "aria-label": "Fee" });
        if (!last) up.value = t.upToKm; fee.value = t.fee;
        up.addEventListener("input", function () { t.upToKm = up.value; }); fee.addEventListener("input", function () { t.fee = fee.value; });
        tierBox.appendChild(el("div", { class: "tier" }, [
          last ? el("span", { class: "lbl", text: "Farther than that" }) : el("span", { class: "row", style: "gap:6px" }, [el("span", { class: "lbl", style: "width:auto", text: "Up to" }), up, el("span", { class: "muted", text: "km" })]),
          el("span", { class: "muted", text: "$" }), fee,
          last || tiers.length < 2 ? null : btn("", "danger ic sm", "x", function () { tiers.splice(i, 1); drawTiers(); }, "Remove step")
        ]));
      });
    }
    drawTiers();
    var addTier = btn("Add distance step", "ghost sm", "plus", function () {
      if (tiers.length >= 10) return;
      var prevKm = tiers.length > 1 ? Number(tiers[tiers.length - 2].upToKm) || 0 : 0;
      tiers.splice(tiers.length - 1, 0, { upToKm: prevKm + 5, fee: tiers[tiers.length - 1].fee });
      drawTiers();
    });
    var qr = st.qrImage || "", preview = el("div", {});
    function drawQr() {
      wipe(preview);
      if (qr) {
        preview.appendChild(el("img", { src: qr, alt: "QR", style: "max-width:220px;max-height:220px;border:1px solid var(--line);border-radius:14px;background:#fff;display:block" }));
        preview.appendChild(btn("Remove picture", "danger sm", "trash", function () { qr = ""; drawQr(); }));
        preview.lastChild.style.marginTop = "10px";
      } else preview.appendChild(el("div", { class: "muted", text: "No QR picture yet." }));
    }
    drawQr();
    var file = el("input", { type: "file", accept: "image/*", style: "display:none" });
    file.addEventListener("change", function () {
      var one = file.files[0]; file.value = "";
      if (!one) return;
      say("Uploading...", true);
      createImageBitmap(one).then(function (bmp) {
        var sc = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
        var c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("image")); }, "image/png"); });
      }).then(function (blob) { return api("POST", "/images", blob, "image/png"); }).then(function (r) { qr = r.url; drawQr(); say("Uploaded, press Save to keep it", true); })
        .catch(function (e) { say("Upload failed: " + e.message); });
    });
    var save = btn("Save settings", "", "check", function () {
      save.disabled = true;
      api("PUT", "/settings", { shop: { lat: lat.value, lng: lng.value }, radiusKm: km.value, qrImage: qr, tiers: tiers, expressExtra: extra.value }).then(function () { say("Settings saved", true); save.disabled = false; })
        .catch(function (e) { save.disabled = false; say("Could not save: " + ({ bad_location: "latitude/longitude not valid", bad_radius: "radius must be 0.5 to 1000 km", bad_tiers: "delivery fees: the km steps must grow (3, 5, 10 ...) and every fee must be a number", bad_express: "express extra must be a number" }[e.message] || e.message)); });
    });
    var acts = document.querySelector(".ph .acts"); if (acts) acts.appendChild(save);
    return el("div", { class: "cols even" }, [
      el("div", {}, [
        el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Shop location" })]),
          el("div", { class: "two" }, [field("Latitude", lat), field("Longitude", lng)]),
          el("div", { class: "muted small", text: "Tip: in Google Maps or openstreetmap.org, right-click your shop and copy the two numbers." })]),
        el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Cash on delivery" })]),
          field("Cash radius (km)", km, "Customers within this distance of the shop may pay cash on delivery. Farther away, or without a map pin, they must pay by QR.")])
      ]),
      el("div", {}, [
        el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Delivery fee by distance" })]),
          el("div", { class: "muted small", style: "margin-bottom:12px", text: "Standard delivery costs the fee of the first row the distance fits in. A customer without a map pin pays the last row." }),
          tierBox, addTier, el("div", { style: "height:14px" }), field("Express delivery costs this much extra ($)", extra)]),
        el("div", { class: "card" }, [el("div", { class: "ch" }, [el("h2", { text: "Payment QR" }), el("div", { class: "sp" }), btn("Upload", "ghost sm", "plus", function () { file.click(); })]),
          el("div", { class: "muted small", style: "margin-bottom:12px", text: "The picture customers pay to (your bank's KHQR)." }), preview, file])
      ])
    ]);
  }

  // ---------- start ----------
  if (password) {
    bootLoad().then(function () { viewDashboard(); }).catch(function () { signOut(); });
  } else viewLogin();
})();
