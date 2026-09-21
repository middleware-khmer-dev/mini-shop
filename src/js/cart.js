(function () {
  "use strict";

  var SHIPPING = 1.5;
  var cart = window.MiniShop.cart.map(function (line) {
    return { productId: line.productId, qty: line.qty, variant: line.variant };
  });

  var cartList = document.getElementById("cartList");
  var cartContent = document.getElementById("cartContent");
  var emptyCart = document.getElementById("emptyCart");
  var checkoutBar = document.getElementById("checkoutBar");

  function itemHtml(line, product) {
    return (
      '<article class="cart-item" data-line="' + line.productId + '">' +
        '<div class="cart-item__media product__media--' + product.media + '"></div>' +
        '<div class="cart-item__body">' +
          '<div class="cart-item__top">' +
            '<p class="cart-item__name">' + product.name + "</p>" +
            '<button type="button" class="cart-item__remove" data-remove aria-label="លុប">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
            "</button>" +
          "</div>" +
          '<span class="cart-item__variant">' + (line.variant || "") + "</span>" +
          '<div class="cart-item__bottom">' +
            '<span class="cart-item__price">$' + (product.price * line.qty).toFixed(2) + "</span>" +
            '<div class="stepper stepper--sm">' +
              '<button type="button" data-qty-down aria-label="ដក">&minus;</button>' +
              '<input type="text" value="' + line.qty + '" readonly />' +
              '<button type="button" data-qty-up aria-label="បូក">+</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function render() {
    if (cart.length === 0) {
      cartContent.hidden = true;
      checkoutBar.hidden = true;
      emptyCart.hidden = false;
      document.getElementById("itemCount").textContent = "0";
      return;
    }

    cartContent.hidden = false;
    checkoutBar.hidden = false;
    emptyCart.hidden = true;

    var rows = "";
    var subtotal = 0;
    var saved = 0;
    var count = 0;

    cart.forEach(function (line) {
      var product = window.MiniShop.findProduct(line.productId);
      if (!product) return;
      rows += itemHtml(line, product);
      subtotal += product.price * line.qty;
      if (product.oldPrice) saved += (product.oldPrice - product.price) * line.qty;
      count += line.qty;
    });

    cartList.innerHTML = rows;
    document.getElementById("itemCount").textContent = String(count);

    var total = subtotal + SHIPPING;
    document.getElementById("sumSubtotal").textContent = "$" + subtotal.toFixed(2);
    document.getElementById("sumSaved").textContent = "-$" + saved.toFixed(2);
    document.getElementById("sumShipping").textContent = "$" + SHIPPING.toFixed(2);
    document.getElementById("sumTotal").textContent = "$" + total.toFixed(2);
    document.getElementById("barTotal").textContent = "$" + total.toFixed(2);
  }

  cartList.addEventListener("click", function (e) {
    var itemEl = e.target.closest(".cart-item");
    if (!itemEl) return;
    var id = Number(itemEl.getAttribute("data-line"));
    var line = cart.filter(function (l) { return l.productId === id; })[0];

    if (e.target.closest("[data-remove]")) {
      cart = cart.filter(function (l) { return l.productId !== id; });
      render();
      return;
    }
    if (e.target.closest("[data-qty-up]")) {
      line.qty = Math.min(99, line.qty + 1);
      render();
      return;
    }
    if (e.target.closest("[data-qty-down]")) {
      if (line.qty <= 1) {
        cart = cart.filter(function (l) { return l.productId !== id; });
      } else {
        line.qty -= 1;
      }
      render();
    }
  });

  document.getElementById("btnClearCart").addEventListener("click", function () {
    cart = [];
    render();
  });

  document.getElementById("btnApplyPromo").addEventListener("click", function () {
    var input = document.getElementById("promoInput");
    if (!input.value.trim()) return;
    input.value = "";
    input.placeholder = "បានប្រើកូដរួចហើយ ✓";
  });

  document.getElementById("btnCheckout").addEventListener("click", function () {
    location.href = "checkout.html";
  });

  render();
})();
