// The admin page. Plain HTML + one script (served from /admin/app.js so the page needs no inline script).
// All text from the server is put in with textContent, never as HTML.

export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mini Shop admin</title>
<style>
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,sans-serif;background:#f4f2ff;color:#14141f}
main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:20px;margin:8px 0 14px}
.card{background:#fff;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 1px 6px #0001}
.row{display:flex;gap:10px;align-items:center}.grow{flex:1;min-width:0}.gap{display:flex;gap:8px;flex-wrap:wrap}
button{font:inherit;font-weight:600;border:0;border-radius:12px;padding:10px 14px;background:#14141f;color:#fff;cursor:pointer}
button.ghost{background:#eee;color:#14141f}button.danger{background:#fee2e2;color:#b91c1c}button:disabled{opacity:.5}
input,textarea,select{font:inherit;width:100%;padding:10px;border:1px solid #d6d3e8;border-radius:10px;background:#fff}
textarea{min-height:90px}label{display:block;font-size:13px;font-weight:600;margin:10px 0 4px}
.thumb{width:56px;height:56px;border-radius:10px;object-fit:contain;background:#fff;border:1px solid #eee}
.title{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.muted{color:#6b7280;font-size:13px}
.imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:6px}
.img{border:1px solid #e5e7eb;border-radius:12px;padding:6px;text-align:center;background:#fafafa}
.img img{width:100%;height:90px;object-fit:contain}.img .gap{justify-content:center;margin-top:4px}.img button{padding:4px 9px}
.badge{display:inline-block;background:#14141f;color:#fff;border-radius:99px;font-size:11px;padding:1px 8px;margin-bottom:2px}
#msg{position:sticky;top:0;z-index:5;margin-bottom:8px;padding:10px 12px;border-radius:12px;display:none}
#msg.ok{display:block;background:#dcfce7;color:#166534}#msg.err{display:block;background:#fee2e2;color:#991b1b}
</style></head><body><main>
<h1>Mini Shop admin</h1><div id="msg" role="status"></div><div id="app"></div>
</main><script src="/admin/app.js"></script></body></html>`;

export const ADMIN_JS = String.raw`
(function () {
  var app = document.getElementById("app");
  var msgEl = document.getElementById("msg");
  var password = sessionStorage.getItem("ms_admin") || "";
  var products = [];

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function say(text, ok) {
    msgEl.textContent = text;
    msgEl.className = ok ? "ok" : "err";
    if (ok) setTimeout(function () { if (msgEl.textContent === text) msgEl.className = ""; }, 2500);
  }
  function api(method, path, body, type) {
    var headers = { authorization: "Bearer " + password };
    var init = { method: method, headers: headers };
    if (body !== undefined) {
      if (type) { headers["content-type"] = type; init.body = body; }
      else { headers["content-type"] = "application/json"; init.body = JSON.stringify(body); }
    }
    return fetch("/admin/api" + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var e = new Error(data.error || "error"); e.status = r.status; throw e; }
        return data;
      });
    });
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function money(n) { return "$" + Number(n).toFixed(2); }

  // ---------- login ----------
  function showLogin(note) {
    clear();
    var input = el("input", { type: "password", placeholder: "Admin password", autocomplete: "current-password" });
    function go() {
      password = input.value;
      api("GET", "/products").then(function (list) {
        sessionStorage.setItem("ms_admin", password);
        products = list; showList();
      }).catch(function (e) { password = ""; say(e.status === 401 ? "Wrong password" : "Could not sign in (" + e.message + ")"); });
    }
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    app.appendChild(el("div", { class: "card" }, [
      el("label", { text: "Password" }), input,
      el("div", { class: "gap", style: "margin-top:12px" }, [el("button", { text: "Sign in", onclick: go })]),
    ]));
    if (note) say(note);
  }

  // ---------- list ----------
  function showList() {
    clear();
    var bar = el("div", { class: "gap", style: "margin-bottom:12px" }, [
      el("button", { text: "+ Add product", onclick: function () { showEditor(null); } }),
      el("button", { class: "ghost", text: "Import sample products", onclick: importSamples }),
      el("button", { class: "ghost", text: "Sign out", onclick: function () { sessionStorage.removeItem("ms_admin"); password = ""; showLogin(); } }),
    ]);
    app.appendChild(bar);
    if (products.length === 0) app.appendChild(el("div", { class: "card muted", text: "No products yet. Add one, or import the sample products to start." }));
    products.forEach(function (p) {
      var thumb = p.images && p.images[0] ? el("img", { class: "thumb", src: p.images[0], alt: "" }) : el("div", { class: "thumb" });
      app.appendChild(el("div", { class: "card row" }, [
        thumb,
        el("div", { class: "grow" }, [
          el("div", { class: "title", text: p.title }),
          el("div", { class: "muted", text: money(p.price) + " · " + p.category + " · " + (p.images ? p.images.length : 0) + " picture(s)" }),
        ]),
        el("button", { class: "ghost", text: "Edit", onclick: function () { showEditor(p); } }),
      ]));
    });
  }

  function importSamples() {
    if (!confirm("Add the sample products from fakestoreapi.com to your shop?")) return;
    say("Importing...", true);
    fetch("https://fakestoreapi.com/products").then(function (r) { return r.json(); }).then(function (list) {
      var chain = Promise.resolve();
      list.forEach(function (s) {
        chain = chain.then(function () {
          return api("POST", "/products", { title: s.title, price: s.price, category: s.category, description: s.description, images: [s.image], rating: { rate: s.rating && s.rating.rate, count: s.rating && s.rating.count } });
        });
      });
      return chain;
    }).then(function () { return api("GET", "/products"); }).then(function (list) { products = list; showList(); say("Imported " + list.length + " products", true); })
      .catch(function (e) { say("Import failed: " + e.message); });
  }

  // ---------- editor ----------
  function showEditor(p) {
    clear();
    var images = p && p.images ? p.images.slice() : [];
    var f = {
      title: el("input", { maxlength: "200" }), price: el("input", { type: "number", step: "0.01", min: "0" }),
      category: el("input", { list: "cats", maxlength: "60" }), description: el("textarea", { maxlength: "5000" }),
    };
    f.title.value = p ? p.title : ""; f.price.value = p ? p.price : ""; f.category.value = p ? p.category : ""; f.description.value = p ? p.description : "";
    var cats = el("datalist", { id: "cats" });
    Array.from(new Set(products.map(function (x) { return x.category; }))).forEach(function (c) { cats.appendChild(el("option", { value: c })); });
    var grid = el("div", { class: "imgs" });
    var file = el("input", { type: "file", accept: "image/*", multiple: "multiple" });

    function drawImages() {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      images.forEach(function (u, i) {
        function move(d) { var j = i + d; if (j < 0 || j >= images.length) return; var t = images[i]; images[i] = images[j]; images[j] = t; drawImages(); }
        grid.appendChild(el("div", { class: "img" }, [
          i === 0 ? el("span", { class: "badge", text: "Main" }) : null,
          el("img", { src: u, alt: "" }),
          el("div", { class: "gap" }, [
            el("button", { class: "ghost", text: "<", onclick: function () { move(-1); } }),
            el("button", { class: "ghost", text: ">", onclick: function () { move(1); } }),
            el("button", { class: "danger", text: "x", onclick: function () { images.splice(i, 1); drawImages(); } }),
          ]),
        ]));
      });
      if (images.length === 0) grid.appendChild(el("div", { class: "muted", text: "No pictures yet." }));
    }
    drawImages();

    // shrink big photos in the browser so uploads stay small and the shop loads fast
    function shrink(fileObj) {
      return createImageBitmap(fileObj).then(function (bmp) {
        var max = 1200, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        var c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
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

    var saveBtn = el("button", { text: "Save", onclick: function () {
      var body = { title: f.title.value, price: f.price.value, category: f.category.value, description: f.description.value, images: images, rating: p ? p.rating : undefined };
      saveBtn.disabled = true;
      (p ? api("PUT", "/products/" + p.id, body) : api("POST", "/products", body)).then(function () { return api("GET", "/products"); })
        .then(function (list) { products = list; showList(); say("Saved", true); })
        .catch(function (e) { saveBtn.disabled = false; say("Could not save: " + e.message); });
    } });

    var buttons = [saveBtn, el("button", { class: "ghost", text: "Cancel", onclick: showList })];
    if (p) buttons.push(el("button", { class: "danger", text: "Delete", onclick: function () {
      if (!confirm("Delete this product and its pictures?")) return;
      api("DELETE", "/products/" + p.id).then(function () { return api("GET", "/products"); }).then(function (list) { products = list; showList(); say("Deleted", true); })
        .catch(function (e) { say("Could not delete: " + e.message); });
    } }));

    app.appendChild(el("div", { class: "card" }, [
      el("label", { text: "Name" }), f.title,
      el("label", { text: "Price (USD)" }), f.price,
      el("label", { text: "Category" }), f.category, cats,
      el("label", { text: "Description" }), f.description,
      el("label", { text: "Pictures (the first one is the main picture; add 3, 4, 5 or more)" }), grid,
      el("div", { style: "margin-top:8px" }, [file]),
      el("div", { class: "gap", style: "margin-top:14px" }, buttons),
    ]));
  }

  if (password) {
    api("GET", "/products").then(function (list) { products = list; showList(); }).catch(function () { password = ""; sessionStorage.removeItem("ms_admin"); showLogin(); });
  } else showLogin();
})();
`;
