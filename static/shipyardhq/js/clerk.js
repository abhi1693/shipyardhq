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
    var slot = document.querySelector("[data-clerk-auth]");
    if (!slot) {
      return;
    }

    slot.replaceChildren();
    if (window.Clerk.isSignedIn) {
      var userButton = document.createElement("span");
      slot.appendChild(userButton);
      window.Clerk.mountUserButton(userButton);
      return;
    }

    var button = document.createElement("button");
    button.className = "nav-auth-button";
    button.type = "button";
    button.textContent = "Sign in";
    button.addEventListener("click", function (event) {
      event.preventDefault();
      openSignInModal(currentRedirectUrl());
    });
    slot.appendChild(button);
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
  });
})();
