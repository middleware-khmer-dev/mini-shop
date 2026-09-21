(function () {
  "use strict";

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    applyTelegramTheme();
    tg.onEvent("themeChanged", applyTelegramTheme);
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

  window.MiniShop = {
    categories: [
      { id: "fashion", label: "សម្លៀកបំពាក់", icon: "shirt" },
      { id: "electronics", label: "អេឡិចត្រូនិច", icon: "bolt" },
      { id: "beauty", label: "សម្ផស្ស", icon: "sparkle" },
      { id: "grocery", label: "គ្រឿងទេស", icon: "basket" },
      { id: "home", label: "គេហដ្ឋាន", icon: "home" },
      { id: "toys", label: "ក្មេងលេង", icon: "gift" },
    ],

    products: [
      { id: 1, name: "ស្រោមកាបូបស្បែកស្ត្រី ម៉ូតថ្មី", price: 18.5, oldPrice: 25, rating: 4.8, sold: "1.2k", media: 1, badge: "-26%" },
      { id: 2, name: "កាស Bluetooth ថាមពលបាទ ANC", price: 32, oldPrice: null, rating: 4.6, sold: "860", media: 2, badge: "ថ្មី" },
      { id: 3, name: "ក្រែមថែរក្សាស្បែកមុខ Vitamin C", price: 9.9, oldPrice: 13, rating: 4.7, sold: "2.3k", media: 3, badge: "-24%" },
      { id: 4, name: "កែវទឹកកាបូបធន់កំដៅ 600ml", price: 6.5, oldPrice: null, rating: 4.9, sold: "540", media: 4, badge: null },
      { id: 5, name: "អាវយឺតកប្បាសទន់ Unisex", price: 7.2, oldPrice: 10, rating: 4.5, sold: "980", media: 5, badge: "-28%" },
      { id: 6, name: "ឆ្កែក្មេងលេងកូនតុក្កតាទន់", price: 5.4, oldPrice: null, rating: 4.4, sold: "410", media: 6, badge: null },
      { id: 7, name: "នាឡិកាឆ្លាតវៃតាមដានសុខភាព", price: 45, oldPrice: 59, rating: 4.7, sold: "700", media: 2, badge: "-24%" },
      { id: 8, name: "កាបូបស្ពាយកម្សាន្តធំ", price: 21, oldPrice: null, rating: 4.6, sold: "330", media: 1, badge: null },
    ],
  };

  // ---- Bottom nav active state from data-page on <body> ----
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    document.querySelectorAll(".navlink").forEach(function (a) {
      if (a.getAttribute("data-nav") === page) a.classList.add("is-active");
      else a.classList.remove("is-active");
    });
  });

  // ---- Shared icon set (feather-style, currentColor) ----
  window.MiniShopIcons = {
    star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.6l-6.1 3.1 1.5-6.7-5.1-4.6 6.8-.7L12 2.5Z"/></svg>',
    heart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.7 4.6 13.4a5.4 5.4 0 0 1 7.6-7.7l-.2.2.2-.2a5.4 5.4 0 0 1 7.6 7.7L12 20.7Z"/></svg>',
    cart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6h13l-1.5 8.5a2 2 0 0 1-2 1.6H9.6a2 2 0 0 1-2-1.6L6 4H3V2h4l.6 2ZM9 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  // ---- Product card renderer (shared by Home & Catalog) ----
  window.renderProductCard = function (p) {
    var oldPriceHtml = p.oldPrice ? "<small>$" + p.oldPrice.toFixed(2) + "</small>" : "";
    var badgeHtml = p.badge ? '<span class="product__badge">' + p.badge + "</span>" : "";
    return (
      '<article class="product" data-id="' + p.id + '">' +
        '<div class="product__media product__media--' + p.media + '">' +
          badgeHtml +
          '<button type="button" class="product__wish" data-wish aria-label="ចូលចិត្ត">' + window.MiniShopIcons.heart + "</button>" +
        "</div>" +
        '<div class="product__body">' +
          '<p class="product__name">' + p.name + "</p>" +
          '<div class="product__rating">' + window.MiniShopIcons.star + "<span>" + p.rating + "</span><span>&middot; លក់ហើយ " + p.sold + "</span></div>" +
          '<div class="product__footer">' +
            '<span class="product__price">' + oldPriceHtml + "$" + p.price.toFixed(2) + "</span>" +
            '<button type="button" class="product__add" data-add aria-label="ដាក់ក្នុងកន្ត្រក">' + window.MiniShopIcons.plus + "</button>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  };

  document.addEventListener("click", function (e) {
    var wish = e.target.closest("[data-wish]");
    if (wish) {
      wish.classList.toggle("is-active");
      return;
    }
    var add = e.target.closest("[data-add]");
    if (add) {
      add.style.transform = "scale(0.85)";
      setTimeout(function () { add.style.transform = ""; }, 120);
      var badge = document.getElementById("cartBadge");
      if (badge) badge.textContent = String((parseInt(badge.textContent, 10) || 0) + 1);
    }
  });
})();
