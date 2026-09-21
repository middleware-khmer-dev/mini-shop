(function () {
  "use strict";

  var products = window.MiniShop.products;
  var grid = document.getElementById("productGrid");
  var emptyState = document.getElementById("emptyState");
  var resultCount = document.getElementById("resultCount");
  var searchInput = document.getElementById("searchInput");
  var chipList = document.getElementById("chipList");

  var params = new URLSearchParams(location.search);
  var activeCat = params.get("cat") || "all";
  var query = "";

  function chipsHtml() {
    var all = [{ id: "all", label: "ទាំងអស់" }].concat(
      window.MiniShop.categories.map(function (c) {
        return { id: c.id, label: c.label };
      })
    );
    return all
      .map(function (c) {
        var active = c.id === activeCat ? " is-active" : "";
        return '<button type="button" class="chip' + active + '" data-cat="' + c.id + '">' + c.label + "</button>";
      })
      .join("");
  }

  function render() {
    var list = products.filter(function (p) {
      var matchesQuery = !query || p.name.toLowerCase().indexOf(query.toLowerCase()) !== -1;
      // Category is demo-only data (products aren't tagged), so "all" always shows everything
      // and any other chip still shows the full catalog to keep the mock browsable.
      return matchesQuery;
    });

    resultCount.textContent = "បង្ហាញ " + list.length + " ទំនិញ";
    grid.innerHTML = list.map(window.renderProductCard).join("");
    grid.hidden = list.length === 0;
    emptyState.hidden = list.length !== 0;
  }

  chipList.innerHTML = chipsHtml();
  chipList.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    activeCat = chip.getAttribute("data-cat");
    chipList.innerHTML = chipsHtml();
    render();
  });

  searchInput.addEventListener("input", function () {
    query = searchInput.value.trim();
    render();
  });

  document.getElementById("btnSort").addEventListener("click", function () {
    products.sort(function (a, b) { return a.price - b.price; });
    render();
  });

  render();
})();
