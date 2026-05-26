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
      var href = row.dataset.href || "";
      if (!href.startsWith("/")) {
        return;
      }
      window.location.assign(href);
    });
  }

  function bindSlugFields() {
    var sources = document.querySelectorAll("[data-slug-source]");
    sources.forEach(function (source) {
      var target = document.getElementById(source.dataset.slugSource);
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      var initialSourceSlug = slugify(source.value);
      var shouldSync = !target.value || target.value === initialSourceSlug;

      target.addEventListener("input", function () {
        shouldSync = !target.value || target.value === slugify(source.value);
      });

      source.addEventListener("input", function () {
        if (shouldSync) {
          target.value = slugify(source.value);
        }
      });
    });
  }

  function bindIconSelects() {
    var selects = document.querySelectorAll("[data-icon-select]");
    selects.forEach(function (select) {
      var trigger = select.querySelector("[data-icon-trigger]");
      var menu = select.querySelector("[data-icon-menu]");
      var valueInput = select.querySelector("[data-icon-value]");
      var options = select.querySelectorAll("[data-icon-option]");
      var currents = select.querySelectorAll("[data-icon-current]");

      if (!trigger || !menu || !valueInput) {
        return;
      }

      trigger.addEventListener("click", function () {
        if (menu.hidden) {
          openIconSelect(trigger, menu);
        } else {
          closeIconSelect(trigger, menu);
        }
      });

      options.forEach(function (option) {
        option.addEventListener("click", function () {
          setIconSelectValue(valueInput, options, currents, option.dataset.value || "");
          closeIconSelect(trigger, menu);
          trigger.focus();
        });
      });

      document.addEventListener("click", function (event) {
        if (!select.contains(event.target)) {
          closeIconSelect(trigger, menu);
        }
      });

      select.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeIconSelect(trigger, menu);
          trigger.focus();
        }
      });
    });
  }

  function openIconSelect(trigger, menu) {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeIconSelect(trigger, menu) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function setIconSelectValue(valueInput, options, currents, value) {
    valueInput.value = value;
    options.forEach(function (option) {
      option.setAttribute("aria-selected", String(option.dataset.value === value));
    });
    currents.forEach(function (current) {
      current.classList.toggle("is-hidden", current.dataset.iconCurrent !== value);
    });
  }

  function slugify(value) {
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  ready(function () {
    bindClickableRows();
    bindSlugFields();
    bindIconSelects();
  });
})();
