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
      el("button", { class: "ghost", text: "Orders", onclick: function () { showOrders(""); } }),
      el("button", { class: "ghost", text: "Settings", onclick: showSettings }),
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

  // ---------- settings ----------
  function showSettings() {
    clear();
    api("GET", "/settings").then(function (st) {
      var lat = el("input", { type: "number", step: "any" }), lng = el("input", { type: "number", step: "any" }), km = el("input", { type: "number", step: "0.5", min: "0.5" });
      lat.value = st.shop.lat; lng.value = st.shop.lng; km.value = st.radiusKm;
      var tiers = (st.tiers || []).map(function (t) { return { upToKm: t.upToKm, fee: t.fee }; });
      var extra = el("input", { type: "number", step: "0.01", min: "0" });
      extra.value = st.expressExtra;
      var tierBox = el("div", {});
      function drawTiers() {
        while (tierBox.firstChild) tierBox.removeChild(tierBox.firstChild);
        tiers.forEach(function (t, i) {
          var last = i === tiers.length - 1;
          var up = el("input", { type: "number", step: "0.5", min: "0.5", style: "width:90px" });
          var fee = el("input", { type: "number", step: "0.01", min: "0", style: "width:90px" });
          if (!last) up.value = t.upToKm;
          fee.value = t.fee;
          up.addEventListener("input", function () { t.upToKm = up.value; });
          fee.addEventListener("input", function () { t.fee = fee.value; });
          tierBox.appendChild(el("div", { class: "row", style: "margin:6px 0" }, [
            last ? el("div", { style: "width:140px", text: "Farther than that" }) : el("div", { class: "row", style: "width:140px" }, [el("span", { text: "Up to" }), up, el("span", { text: "km" })]),
            el("span", { text: "$" }), fee,
            last || tiers.length < 2 ? null : el("button", { class: "danger", style: "padding:4px 9px", text: "x", onclick: function () { tiers.splice(i, 1); drawTiers(); } }),
          ]));
        });
      }
      drawTiers();
      var addTier = el("button", { class: "ghost", style: "margin-top:4px", text: "+ Add distance step", onclick: function () {
        if (tiers.length >= 10) return;
        var prevKm = tiers.length > 1 ? Number(tiers[tiers.length - 2].upToKm) || 0 : 0;
        tiers.splice(tiers.length - 1, 0, { upToKm: prevKm + 5, fee: tiers[tiers.length - 1].fee });
        drawTiers();
      } });
      var qr = st.qrImage || "";
      var preview = el("div", { style: "margin-top:6px" });
      function drawQr() {
        while (preview.firstChild) preview.removeChild(preview.firstChild);
        if (qr) {
          preview.appendChild(el("img", { src: qr, alt: "", style: "max-width:220px;max-height:220px;border:1px solid #eee;border-radius:12px;background:#fff" }));
          preview.appendChild(el("div", {}, [el("button", { class: "danger", style: "margin-top:6px", text: "Remove picture", onclick: function () { qr = ""; drawQr(); } })]));
        } else preview.appendChild(el("div", { class: "muted", text: "No QR picture yet." }));
      }
      drawQr();
      var file = el("input", { type: "file", accept: "image/*" });
      file.addEventListener("change", function () {
        var one = file.files[0]; file.value = "";
        if (!one) return;
        say("Uploading...", true);
        createImageBitmap(one).then(function (bmp) {
          var s = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
          var c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
          var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
          return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("image")); }, "image/png"); });
        }).then(function (blob) { return api("POST", "/images", blob, "image/png"); }).then(function (r) { qr = r.url; drawQr(); say("Uploaded - press Save", true); })
          .catch(function (e) { say("Upload failed: " + e.message); });
      });
      var save = el("button", { text: "Save", onclick: function () {
        save.disabled = true;
        api("PUT", "/settings", { shop: { lat: lat.value, lng: lng.value }, radiusKm: km.value, qrImage: qr, tiers: tiers, expressExtra: extra.value }).then(function () { say("Saved", true); showList(); })
          .catch(function (e) { save.disabled = false; say("Could not save: " + (e.message === "bad_location" ? "latitude/longitude not valid" : e.message === "bad_radius" ? "radius must be 0.5 to 1000 km" : e.message === "bad_tiers" ? "delivery fees: the km steps must grow (3, 5, 10 ...) and every fee must be a number" : e.message === "bad_express" ? "express extra must be a number" : e.message)); });
      } });
      app.appendChild(el("div", { class: "card" }, [
        el("div", { class: "title", text: "Delivery and payment" }),
        el("div", { class: "muted", text: "Customers within the radius around the shop may pay cash on delivery. Farther away, or without a pin on the map, they must pay by QR." }),
        el("label", { text: "Shop latitude" }), lat,
        el("label", { text: "Shop longitude" }), lng,
        el("div", { class: "muted", style: "margin-top:4px", text: "Tip: in Google Maps or openstreetmap.org, right-click your shop and copy the two numbers." }),
        el("label", { text: "Cash radius (km)" }), km,
        el("label", { text: "Delivery fee by distance from the shop" }),
        el("div", { class: "muted", text: "Standard delivery costs the fee of the first row the distance fits in. A customer without a map pin pays the last row, so they are encouraged to pick their location." }),
        tierBox, addTier,
        el("label", { text: "Express delivery costs this much extra ($)" }), extra,
        el("label", { text: "QR picture customers pay to (your bank's KHQR)" }), preview, el("div", { style: "margin-top:8px" }, [file]),
        el("div", { class: "gap", style: "margin-top:14px" }, [save, el("button", { class: "ghost", text: "Cancel", onclick: showList })]),
      ]));
    }).catch(function (e) { say("Could not load settings: " + e.message); showList(); });
  }

  // ---------- orders ----------
  var STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  function when(iso) { var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(); }

  function showOrders(filter) {
    clear();
    var bar = el("div", { class: "gap", style: "margin-bottom:12px" }, [el("button", { class: "ghost", text: "< Products", onclick: showList })]);
    var sel = el("select", { style: "width:auto" }, [el("option", { value: "", text: "All orders" })].concat(STATUSES.map(function (s) { return el("option", { value: s, text: s }); })));
    sel.value = filter;
    sel.addEventListener("change", function () { showOrders(sel.value); });
    bar.appendChild(sel);
    bar.appendChild(el("button", { class: "ghost", text: "Refresh", onclick: function () { showOrders(sel.value); } }));
    app.appendChild(bar);
    api("GET", "/orders" + (filter ? "?status=" + encodeURIComponent(filter) : "")).then(function (orders) {
      if (orders.length === 0) app.appendChild(el("div", { class: "card muted", text: "No orders yet." }));
      orders.forEach(function (o) {
        app.appendChild(el("div", { class: "card row", style: "cursor:pointer", onclick: function () { showOrder(o, filter); } }, [
          el("div", { class: "grow" }, [
            el("div", { class: "title", text: o.id + " · " + o.customer.name }),
            el("div", { class: "muted", text: when(o.createdAt) + " · " + money(o.total) }),
          ]),
          el("span", { class: "chip " + o.status, text: o.status }),
        ]));
      });
    }).catch(function (e) { say("Could not load orders: " + e.message); });
  }

  function showOrder(o, filter) {
    clear();
    var sel = el("select", {}, STATUSES.map(function (s) { return el("option", { value: s, text: s }); }));
    sel.value = o.status;
    var save = el("button", { text: "Save status", onclick: function () {
      save.disabled = true;
      api("PATCH", "/orders/" + o.id, { status: sel.value }).then(function (u) { say("Status: " + u.status, true); showOrder(u, filter); })
        .catch(function (e) { save.disabled = false; say("Could not save: " + e.message); });
    } });
    function setPaid(amount) {
      api("PATCH", "/orders/" + o.id, { paid: amount }).then(function (u) { say("Payment updated", true); showOrder(u, filter); })
        .catch(function (e) { say("Could not save: " + e.message); });
    }
    var due = Math.max(0, o.total - o.paid);
    var payKids = [
      el("div", { class: "title", style: "margin-top:4px", text: "Total " + money(o.total) + " · pay: " + (o.payMethod === "deposit" ? "50% deposit by QR + rest in cash on delivery" : o.payMethod) }),
      el("div", { text: "Received so far " + money(o.paid) + " · still due " + money(due) + (o.payMethod === "deposit" && o.paid < o.deposit ? " (deposit " + money(o.deposit) + " not received yet)" : "") }),
      el("div", { class: "gap", style: "margin-top:8px" }, [
        o.payMethod === "deposit" ? el("button", { class: "ghost", text: "Mark deposit received (" + money(o.deposit) + ")", onclick: function () { setPaid(o.deposit); } }) : null,
        el("button", { class: "ghost", text: "Mark fully paid (" + money(o.total) + ")", onclick: function () { setPaid(o.total); } }),
        o.paid > 0 ? el("button", { class: "danger", text: "Reset to $0", onclick: function () { setPaid(0); } }) : null,
      ]),
    ];
    var lines = o.items.map(function (i) {
      return el("div", { class: "row", style: "justify-content:space-between;margin:4px 0" }, [
        el("div", { class: "grow", text: i.name + (i.variant ? " (" + i.variant + ")" : "") + "  x" + i.qty }),
        el("div", { text: money(i.price * i.qty) }),
      ]);
    });
    var kids = [
      el("div", { class: "row" }, [el("div", { class: "title grow", text: o.id }), el("span", { class: "chip " + o.status, text: o.status })]),
      el("div", { class: "muted", text: when(o.createdAt) }),
      el("label", { text: "Customer" }), el("div", { text: o.customer.name + " · " + o.customer.phone }),
      el("label", { text: "Delivery address" }), el("div", { text: o.address }),
    ];
    if (o.location && isFinite(o.location.lat) && isFinite(o.location.lng)) {
      var a = el("a", { target: "_blank", rel: "noopener noreferrer", text: "Open the pin on the map" });
      a.href = "https://www.openstreetmap.org/?mlat=" + Number(o.location.lat) + "&mlon=" + Number(o.location.lng) + "#map=17/" + Number(o.location.lat) + "/" + Number(o.location.lng);
      kids.push(el("div", { style: "margin-top:4px" }, [a]));
    }
    if (o.note) kids.push(el("label", { text: "Note from the customer" }), el("div", { text: o.note }));
    kids.push(el("label", { text: "Items" }));
    kids = kids.concat(lines);
    kids.push(
      el("div", { class: "muted", text: "Subtotal " + money(o.subtotal) + " · Shipping (" + o.shippingId + ") " + money(o.shipping) }),
    );
    kids = kids.concat(payKids);
    kids.push(
      el("label", { text: "Status" }), sel,
      el("div", { class: "gap", style: "margin-top:14px" }, [save, el("button", { class: "ghost", text: "Back", onclick: function () { showOrders(filter); } })]),
    );
    app.appendChild(el("div", { class: "card" }, kids));
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
