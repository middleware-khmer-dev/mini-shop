(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var product = window.MiniShop.findProduct(params.get("id")) || window.MiniShop.products[0];

  document.getElementById("pdGallery").classList.add("product__media--" + product.media);
  document.getElementById("pdName").textContent = product.name;
  document.getElementById("pdRating").textContent = product.rating;
  document.getElementById("pdSold").textContent = "លក់ហើយ " + product.sold;
  document.getElementById("pdPrice").textContent = "$" + product.price.toFixed(2);

  if (product.oldPrice) {
    document.getElementById("pdOldPrice").textContent = "$" + product.oldPrice.toFixed(2);
    var off = Math.round((1 - product.price / product.oldPrice) * 100);
    var offEl = document.getElementById("pdOff");
    offEl.textContent = "-" + off + "%";
    offEl.style.display = "";
  }

  if (product.badge) {
    var badgeEl = document.getElementById("pdBadge");
    badgeEl.textContent = product.badge;
    badgeEl.style.display = "";
  }

  // ---- Swatches / size chips ----
  document.getElementById("swatchRow").addEventListener("click", function (e) {
    var s = e.target.closest(".swatch");
    if (!s) return;
    document.querySelectorAll("#swatchRow .swatch").forEach(function (el) { el.classList.remove("is-active"); });
    s.classList.add("is-active");
  });

  document.getElementById("optRow").addEventListener("click", function (e) {
    var o = e.target.closest(".opt-chip");
    if (!o) return;
    document.querySelectorAll("#optRow .opt-chip").forEach(function (el) { el.classList.remove("is-active"); });
    o.classList.add("is-active");
  });

  // ---- Quantity stepper ----
  var qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyStepper").addEventListener("click", function (e) {
    var qty = parseInt(qtyInput.value, 10) || 1;
    if (e.target.closest("[data-qty-up]")) qty = Math.min(99, qty + 1);
    if (e.target.closest("[data-qty-down]")) qty = Math.max(1, qty - 1);
    qtyInput.value = qty;
  });

  // ---- Description / reviews tabs ----
  var segTabs = document.getElementById("segTabs");
  var tabDesc = document.getElementById("tabDesc");
  var tabReviews = document.getElementById("tabReviews");
  segTabs.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    segTabs.querySelectorAll("button").forEach(function (b) { b.classList.remove("is-active"); });
    btn.classList.add("is-active");
    var showDesc = btn.getAttribute("data-tab") === "desc";
    tabDesc.style.display = showDesc ? "" : "none";
    tabReviews.style.display = showDesc ? "none" : "";
  });

  // ---- Wishlist toggle ----
  document.getElementById("btnPdWish").addEventListener("click", function () {
    this.classList.toggle("is-active");
  });

  // ---- Add to cart / buy now ----
  function bumpCartBadge() {
    var badge = document.getElementById("cartBadge");
    var qty = parseInt(qtyInput.value, 10) || 1;
    if (badge) badge.textContent = String((parseInt(badge.textContent, 10) || 0) + qty);
  }

  document.getElementById("btnAddCart").addEventListener("click", function () {
    bumpCartBadge();
    var btn = this;
    var original = btn.textContent;
    btn.textContent = "បានដាក់ក្នុងកន្ត្រក ✓";
    setTimeout(function () { btn.textContent = original; }, 1200);
  });

  document.getElementById("btnBuyNow").addEventListener("click", function () {
    bumpCartBadge();
    location.href = "cart.html";
  });
})();
