(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function clerkLoadOptions() {
    if (window.__internal_ClerkUICtor) {
      return { ui: { ClerkUI: window.__internal_ClerkUICtor } };
    }
    return {};
  }

  function mountAuthSlot() {
    var slots = document.querySelectorAll("[data-clerk-auth]");
    if (!slots.length) {
      return;
    }

    slots.forEach(function (slot) {
      mountAuthControl(slot);
    });
  }

  function mountAuthControl(slot) {
    slot.replaceChildren();
    if (window.Clerk.isSignedIn) {
      slot.appendChild(createUserMenu());
      return;
    }

    var button = document.createElement("button");
    button.className = "ui-button ui-button-inverse ui-button-md nav-auth-button";
    button.type = "button";
    button.textContent = "Sign in";
    button.addEventListener("click", function (event) {
      event.preventDefault();
      openSignInModal(currentRedirectUrl());
    });
    slot.appendChild(button);
  }

  function createUserMenu() {
    var wrapper = document.createElement("div");
    var trigger = document.createElement("button");
    var menu = document.createElement("div");
    var user = window.Clerk.user || {};
    var name = user.firstName || user.fullName || "Account";
    var avatarUrl = user.imageUrl || "";

    wrapper.className = "user-menu";
    trigger.className = "user-menu-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = avatarMarkup(avatarUrl, name) + '<span class="user-menu-name">' + escapeHtml(name) + '</span>' + icon("chevron-down");

    menu.className = "user-menu-content";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.appendChild(menuLink("Dashboard", "/member/overview/", "dashboard"));
    menu.appendChild(menuLink("Launch", "/member/launch/", "rocket"));
    menu.appendChild(menuLink("Profile", "/member/profile/", "user"));
    menu.appendChild(menuButton("Sign Out", "log-out", function () {
      closeUserMenu(trigger, menu);
      window.Clerk.signOut({ redirectUrl: "/" });
    }));

    trigger.addEventListener("click", function () {
      if (menu.hidden) {
        openUserMenu(trigger, menu);
      } else {
        closeUserMenu(trigger, menu);
      }
    });

    menu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeUserMenu(trigger, menu);
        trigger.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (!wrapper.contains(event.target)) {
        closeUserMenu(trigger, menu);
      }
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    return wrapper;
  }

  function openUserMenu(trigger, menu) {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeUserMenu(trigger, menu) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function menuLink(label, href, iconName) {
    var link = document.createElement("a");
    link.className = "user-menu-item";
    link.href = href;
    link.setAttribute("role", "menuitem");
    link.innerHTML = icon(iconName) + "<span>" + escapeHtml(label) + "</span>";
    return link;
  }

  function menuButton(label, iconName, onClick) {
    var button = document.createElement("button");
    button.className = "user-menu-item";
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.innerHTML = icon(iconName) + "<span>" + escapeHtml(label) + "</span>";
    button.addEventListener("click", onClick);
    return button;
  }

  function avatarMarkup(avatarUrl, name) {
    if (avatarUrl) {
      return '<img class="user-menu-avatar" src="' + escapeAttribute(avatarUrl) + '" alt="">';
    }
    return '<span class="user-menu-avatar" aria-hidden="true">' + escapeHtml(name.slice(0, 1).toUpperCase()) + "</span>";
  }

  function icon(name) {
    var paths = {
      "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
      dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>',
      "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>',
      rocket: '<path d="M4.5 16.5c-1.5 1.2-2 3-2 5 2 0 3.8-.5 5-2"></path><path d="M9 15 4 10l6-6c4-4 9-2 10-1 1 1 3 6-1 10l-6 6-5-5"></path><path d="M14 7h.01"></path>',
      user: '<path d="M19 21a7 7 0 0 0-14 0"></path><circle cx="12" cy="7" r="4"></circle>',
    };
    return '<svg class="user-menu-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + "</svg>";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function bindLaunchButton() {
    var button = document.querySelector("[data-clerk-launch]");
    if (!button) {
      return;
    }

    button.addEventListener("click", function (event) {
      if (window.Clerk.isSignedIn) {
        window.location.assign("/member/launch/");
        return;
      }
      event.preventDefault();
      openSignInModal(currentRedirectUrl());
    });
  }

  function openSignInModal(redirectUrl) {
    window.Clerk.openSignIn({
      fallbackRedirectUrl: redirectUrl,
      signUpFallbackRedirectUrl: redirectUrl,
    });
  }

  function currentRedirectUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  ready(async function () {
    if (!window.Clerk) {
      return;
    }

    await window.Clerk.load(clerkLoadOptions());
    mountAuthSlot();
    bindLaunchButton();
  });
})();
