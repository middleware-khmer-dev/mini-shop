(function () {
  "use strict";

  var SHIPPING_COST = { standard: 1.5, express: 4.0 };
  var shippingMethod = "standard";

  function selectOption(group, value) {
    document.querySelectorAll('#' + group + ' .option-card').forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-option") === value);
    });
  }

  document.getElementById("shippingOptions").addEventListener("click", function (e) {
    var card = e.target.closest(".option-card");
    if (!card) return;
    shippingMethod = card.getAttribute("data-option");
    selectOption("shippingOptions", shippingMethod);
    renderSummary();
  });

  document.getElementById("paymentOptions").addEventListener("click", function (e) {
    var card = e.target.closest(".option-card");
    if (!card) return;
    selectOption("paymentOptions", card.getAttribute("data-option"));
  });

  // ---- Order items pulled from the same demo cart used on cart.html ----
  var cart = window.MiniShop.cart;
  var miniItems = document.getElementById("miniItems");
  miniItems.innerHTML = cart
    .map(function (line) {
      var product = window.MiniShop.findProduct(line.productId);
      if (!product) return "";
      return (
        '<div class="mini-item">' +
          '<div class="mini-item__media product__media--' + product.media + '"></div>' +
          '<span class="mini-item__name">' + product.name + "</span>" +
          '<span class="mini-item__qty">x' + line.qty + "</span>" +
          '<span class="mini-item__price">$' + (product.price * line.qty).toFixed(2) + "</span>" +
        "</div>"
      );
    })
    .join("");

  function renderSummary() {
    var subtotal = cart.reduce(function (sum, line) {
      var product = window.MiniShop.findProduct(line.productId);
      return product ? sum + product.price * line.qty : sum;
    }, 0);
    var shipping = SHIPPING_COST[shippingMethod];
    var total = subtotal + shipping;

    document.getElementById("sumSubtotal").textContent = "$" + subtotal.toFixed(2);
    document.getElementById("sumShipping").textContent = "$" + shipping.toFixed(2);
    document.getElementById("sumTotal").textContent = "$" + total.toFixed(2);
    document.getElementById("barTotal").textContent = "$" + total.toFixed(2);
  }

  renderSummary();

  document.getElementById("btnPlaceOrder").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = "កំពុងបញ្ជូន...";
    setTimeout(function () {
      location.href = "order-success.html";
    }, 700);
  });
})();
