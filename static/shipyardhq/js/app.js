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

  function bindProductEditors() {
    var editors = document.querySelectorAll("[data-product-editor]");
    editors.forEach(function (editor) {
      bindProductAutofill(editor);
      bindProductPricing(editor);
      bindProductMedia(editor);
      bindProductPreview(editor);
      bindProductFlow(editor);
    });
  }

  function bindPlanForms() {
    var forms = document.querySelectorAll("[data-plan-form]");
    forms.forEach(function (form) {
      var typeField = form.querySelector("[data-plan-type]");
      var recurringSection = form.querySelector("[data-plan-recurring]");
      if (!(typeField instanceof HTMLSelectElement) || !recurringSection) {
        return;
      }

      function syncRecurringFields() {
        var isRecurring = typeField.value === "recurring_price";
        recurringSection.hidden = !isRecurring;
        recurringSection.querySelectorAll("[data-plan-recurring-field]").forEach(function (field) {
          field.disabled = !isRecurring;
        });
      }

      typeField.addEventListener("change", syncRecurringFields);
      syncRecurringFields();
    });
  }

  function bindCopyButtons() {
    var buttons = document.querySelectorAll("[data-copy-text]");
    buttons.forEach(function (button) {
      button.addEventListener("click", async function () {
        var status = findCopyStatus(button);
        try {
          await navigator.clipboard.writeText(button.dataset.copyText || "");
          setCopyStatus(status, button.dataset.copySuccess || "Copied.", false);
        } catch (_error) {
          setCopyStatus(status, "Copy failed.", true);
        }
      });
    });
  }

  function bindProductAutofill(editor) {
    var triggers = editor.querySelectorAll("[data-autofill-trigger]");
    var urlField = editor.querySelector("#id_website_url");
    var statuses = editor.querySelectorAll("[data-autofill-status]");
    var csrfField = editor.querySelector("input[name='csrfmiddlewaretoken']");
    var endpoint = editor.dataset.autofillUrl || "";

    if (!endpoint || !(urlField instanceof HTMLInputElement) || !csrfField) {
      return;
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", async function (event) {
        event.preventDefault();
        var url = urlField.value.trim();
        if (!url) {
          setAutofillStatus(statuses, "Enter a website first.", true);
          urlField.focus();
          return;
        }

        setAutofillStatus(statuses, "Reading website...", false);
        setButtonsDisabled(triggers, true);

        try {
          var headers = {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfField.value,
          };
          var token = await getClerkSessionToken();
          if (token) {
            headers.Authorization = "Bearer " + token;
          }

          var response = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: headers,
            body: JSON.stringify({ url: url }),
          });

          var payload = await readJsonResponse(response);
          if (!response.ok) {
            throw new Error(payload.error || "Autofill could not read this website.");
          }

          fillProductFields(editor, payload.suggestion || {});
          setAutofillStatus(statuses, "Autofill added what it could find.", false);
        } catch (error) {
          setAutofillStatus(statuses, error.message || "Autofill could not read this website.", true);
        } finally {
          setButtonsDisabled(triggers, false);
        }
      });
    });
  }

  async function getClerkSessionToken() {
    if (!window.Clerk || !window.Clerk.session || typeof window.Clerk.session.getToken !== "function") {
      return "";
    }

    try {
      return (await window.Clerk.session.getToken()) || "";
    } catch (_error) {
      return "";
    }
  }

  async function readJsonResponse(response) {
    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      return response.json();
    }
    if (response.status === 403) {
      throw new Error("Your session expired. Sign in and try again.");
    }
    throw new Error("Autofill could not read this website.");
  }

  function fillProductFields(editor, suggestion) {
    setFieldValue(editor, "id_name", suggestion.name);
    setFieldValue(editor, "id_tagline", suggestion.tagline);
    setFieldValue(editor, "id_summary", suggestion.summary);
    setFieldValue(editor, "id_description", suggestion.description);
    setFieldValue(editor, "id_product_type", suggestion.product_type_id);
    setFieldValue(editor, "id_pricing_model", suggestion.pricing_model_id);
    setFieldValue(editor, "id_starting_price", suggestion.starting_price);
    setFieldValue(editor, "id_currency_code", suggestion.currency_code);
    setMultiSelectValue(editor, "id_categories", suggestion.category_ids);
    setMultiSelectValue(editor, "id_platforms", suggestion.platform_ids);
  }

  function setFieldValue(root, id, value) {
    if (value === undefined || value === null || value === "") {
      return;
    }
    var field = root.querySelector("#" + id);
    if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLSelectElement)) {
      return;
    }
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setMultiSelectValue(root, id, values) {
    if (!Array.isArray(values) || !values.length) {
      return;
    }
    var field = root.querySelector("#" + id);
    if (!(field instanceof HTMLSelectElement)) {
      return;
    }
    var selectedValues = values.map(String);
    Array.prototype.forEach.call(field.options, function (option) {
      option.selected = selectedValues.indexOf(option.value) !== -1;
    });
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setAutofillStatus(statuses, message, isError) {
    if (!statuses || !statuses.length) {
      return;
    }
    statuses.forEach(function (status) {
      status.textContent = message;
      status.classList.toggle("is-error", Boolean(isError));
    });
  }

  function setButtonsDisabled(buttons, disabled) {
    buttons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function bindProductPricing(editor) {
    var pricingSelect = editor.querySelector("[data-pricing-model]");
    var priceField = editor.querySelector("[data-pricing-price]");
    var currencyField = editor.querySelector("[data-pricing-currency]");
    var pricingDetails = editor.querySelector("[data-pricing-details]");

    if (!(pricingSelect instanceof HTMLSelectElement) || !priceField || !currencyField) {
      return;
    }

    function syncPricingState() {
      var option = pricingSelect.options[pricingSelect.selectedIndex];
      var label = option ? option.textContent.toLowerCase().replace(/\s+/g, " ").trim() : "";
      var disabled = label === "free" || label === "custom" || label === "custom pricing";
      priceField.disabled = disabled;
      currencyField.disabled = disabled;
      if (pricingDetails) {
        pricingDetails.classList.toggle("is-disabled", disabled);
      }
    }

    pricingSelect.addEventListener("change", syncPricingState);
    syncPricingState();
  }

  function bindProductMedia(editor) {
    var fileInputs = editor.querySelectorAll("[data-file-input]");
    fileInputs.forEach(function (input) {
      var card = input.closest("[data-file-dropzone]");
      var preview = card ? card.querySelector("[data-file-preview]") : null;
      input.addEventListener("change", function () {
        renderSingleFilePreview(input, preview);
      });
      bindDropzone(card, input, function () {
        renderSingleFilePreview(input, preview);
      });
    });

    var galleryInput = editor.querySelector("[data-gallery-input]");
    var galleryDropzone = editor.querySelector("[data-gallery-dropzone]");
    var galleryPreview = editor.querySelector("[data-gallery-preview]");
    if (galleryInput) {
      galleryInput.addEventListener("change", function () {
        renderGalleryPreview(galleryInput, galleryPreview);
      });
      bindDropzone(galleryDropzone, galleryInput, function () {
        renderGalleryPreview(galleryInput, galleryPreview);
      });
    }
  }

  function bindDropzone(dropzone, input, callback) {
    if (!dropzone || !(input instanceof HTMLInputElement)) {
      return;
    }

    ["dragenter", "dragover"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });

    dropzone.addEventListener("drop", function (event) {
      if (!event.dataTransfer || !event.dataTransfer.files.length) {
        return;
      }
      input.files = event.dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (callback) {
        callback();
      }
    });
  }

  function renderSingleFilePreview(input, preview) {
    if (!preview) {
      return;
    }
    preview.replaceChildren();
    var file = input.files && input.files[0];
    if (!file) {
      return;
    }
    preview.appendChild(buildFilePreview(file, "member-selected-preview-item"));
  }

  function renderGalleryPreview(input, preview) {
    if (!preview) {
      return;
    }
    preview.replaceChildren();
    var files = Array.prototype.slice.call(input.files || []);
    files.forEach(function (file) {
      preview.appendChild(buildFilePreview(file, "member-gallery-selected-item"));
    });
  }

  function buildFilePreview(file, className) {
    var item = document.createElement("span");
    var label = document.createElement("small");
    item.className = className;
    label.textContent = file.name;

    if (file.type && file.type.indexOf("image/") === 0) {
      var image = document.createElement("img");
      var imageUrl = URL.createObjectURL(file);
      image.src = imageUrl;
      image.alt = "";
      image.addEventListener("load", function () {
        URL.revokeObjectURL(imageUrl);
      });
      item.appendChild(image);
    }

    item.appendChild(label);
    return item;
  }

  function bindProductPreview(editor) {
    var nameField = editor.querySelector("#id_name");
    var slugField = editor.querySelector("#id_slug");
    var previewName = editor.querySelector("[data-product-preview-name]");
    var previewMeta = editor.querySelector("[data-product-preview-meta]");

    if (nameField && previewName) {
      nameField.addEventListener("input", function () {
        previewName.textContent = nameField.value || "New product";
      });
    }

    if (slugField && previewMeta) {
      slugField.addEventListener("input", function () {
        previewMeta.textContent = slugField.value || "Draft listing";
      });
    }
  }

  function bindProductFlow(editor) {
    var panels = Array.prototype.slice.call(editor.querySelectorAll("[data-step-panel]"));
    var indicators = Array.prototype.slice.call(editor.querySelectorAll("[data-step-indicator]"));
    var backButton = editor.querySelector("[data-step-back]");
    var nextButton = editor.querySelector("[data-step-next]");
    var submitButton = editor.querySelector("[data-step-submit]");
    var errorIndex = firstPanelWithErrors(panels);
    var currentIndex = errorIndex === -1 ? panelIndexFromHash(panels) : errorIndex;

    if (!panels.length || !backButton || !nextButton || !submitButton) {
      return;
    }

    indicators.forEach(function (indicator, index) {
      indicator.setAttribute("role", "button");
      indicator.setAttribute("tabindex", "0");
      indicator.addEventListener("click", function () {
        showProductStep(index, false);
      });
      indicator.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showProductStep(index, false);
        }
      });
    });

    backButton.addEventListener("click", function () {
      showProductStep(currentIndex - 1, true);
    });

    nextButton.addEventListener("click", function () {
      if (validateStep(panels[currentIndex])) {
        showProductStep(currentIndex + 1, true);
      }
    });

    showProductStep(currentIndex, false);

    function showProductStep(index, shouldFocus) {
      if (index < 0 || index >= panels.length) {
        return;
      }

      currentIndex = index;
      panels.forEach(function (panel, panelIndex) {
        panel.hidden = panelIndex !== currentIndex;
      });
      indicators.forEach(function (indicator, indicatorIndex) {
        indicator.classList.toggle("is-active", indicatorIndex === currentIndex);
        indicator.classList.toggle("is-complete", indicatorIndex < currentIndex);
        indicator.setAttribute("aria-current", indicatorIndex === currentIndex ? "step" : "false");
      });

      backButton.hidden = currentIndex === 0;
      nextButton.hidden = currentIndex === panels.length - 1;
      submitButton.hidden = currentIndex !== panels.length - 1;
      editor.dataset.currentStep = String(currentIndex + 1);

      if (shouldFocus) {
        focusFirstField(panels[currentIndex]);
      }
    }
  }

  function firstPanelWithErrors(panels) {
    for (var index = 0; index < panels.length; index += 1) {
      if (panelHasErrors(panels[index])) {
        return index;
      }
    }
    return -1;
  }

  function panelIndexFromHash(panels) {
    var hash = window.location.hash || "";
    if (!hash) {
      return 0;
    }

    for (var index = 0; index < panels.length; index += 1) {
      if ("#" + panels[index].id === hash) {
        return index;
      }
    }
    return 0;
  }

  function panelHasErrors(panel) {
    var messages = panel.querySelectorAll(".member-form-row-control p, .member-product-url-focus p");
    return Array.prototype.some.call(messages, function (message) {
      return !message.hasAttribute("data-autofill-status") && message.textContent.trim().length > 0;
    });
  }

  function validateStep(panel) {
    var fields = Array.prototype.slice.call(panel.querySelectorAll("input, select, textarea"));
    for (var index = 0; index < fields.length; index += 1) {
      var field = fields[index];
      if (shouldSkipValidation(field)) {
        continue;
      }
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  function shouldSkipValidation(field) {
    return field.disabled || field.type === "hidden" || field.type === "file" || field.type === "checkbox";
  }

  function focusFirstField(panel) {
    var field = panel.querySelector("input:not([type='hidden']), select, textarea, button");
    if (field && typeof field.focus === "function") {
      field.focus();
    }
  }

  function findCopyStatus(button) {
    var container = button.closest(".member-placement-card") || document;
    return container.querySelector("[data-copy-status]");
  }

  function setCopyStatus(status, message, isError) {
    if (!status) {
      return;
    }
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
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
    bindProductEditors();
    bindPlanForms();
    bindCopyButtons();
  });
})();
