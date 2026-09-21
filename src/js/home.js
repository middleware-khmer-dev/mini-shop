(function () {
  "use strict";

  var ICONS = {
    shirt: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-4 2-4-2-4 3 2 3v10h12V10l2-3-4-3Z"/></svg>',
    bolt: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-8 11h6l-1 9 8-11h-6l1-9Z"/></svg>',
    sparkle: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>',
    basket: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16l-1.5 9.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 10Z"/><path d="M8 10 10 4M16 10 14 4M9 14v3M15 14v3"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
    gift: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/><path d="M12 8C9 8 8 5.5 9.5 4S12 5 12 8Zm0 0c3 0 4-2.5 2.5-4S12 5 12 8Z"/></svg>',
  };

  var catList = document.getElementById("catList");
  catList.innerHTML = window.MiniShop.categories
    .map(function (c) {
      return (
        '<div class="cat-item" data-cat="' + c.id + '">' +
          '<div class="cat-item__icon">' + ICONS[c.icon] + "</div>" +
          '<span class="cat-item__label">' + c.label + "</span>" +
        "</div>"
      );
    })
    .join("");

  catList.addEventListener("click", function (e) {
    var item = e.target.closest("[data-cat]");
    if (item) location.href = "catalog.html?cat=" + item.getAttribute("data-cat");
  });

  var products = window.MiniShop.products;
  document.getElementById("popularGrid").innerHTML = products
    .slice(0, 4)
    .map(window.renderProductCard)
    .join("");
  document.getElementById("newGrid").innerHTML = products
    .slice(4, 8)
    .map(window.renderProductCard)
    .join("");
})();
