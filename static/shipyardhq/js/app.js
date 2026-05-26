(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function bindClickableRows() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var row = target.closest("tr[data-href]");
      if (!row || target.closest("a, button, input, select, textarea")) {
        return;
      }
      window.location.assign(row.dataset.href);
    });
  }

  ready(function () {
    bindClickableRows();
  });
})();
