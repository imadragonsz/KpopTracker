// --- Session Cache Helper ---
function setCachedSession(data) {
  try {
    if (data) {
      localStorage.setItem("supabase.auth.session", JSON.stringify(data));
    } else {
      localStorage.removeItem("supabase.auth.session");
    }
  } catch (e) {
    // Ignore storage errors (e.g., private mode)
  }
}
// authUI.js - Refactored for clarity, modularity, and robust event-driven initialization

import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from "./auth.js";
import { supabasePromise } from "./api/supabaseClient.js";

window.signOut = signOut;

// Expose showLoginModal globally for non-module scripts
window.showLoginModal = showLoginModal;

// --- UI Helpers ---

function showLoginModal() {
  try {
    // Close all other open Bootstrap modals
    if (window.bootstrap && window.bootstrap.Modal) {
      document.querySelectorAll(".modal.show").forEach(function (openModal) {
        if (openModal.id !== "authModal") {
          const instance =
            window.bootstrap.Modal.getInstance(openModal) ||
            window.bootstrap.Modal.getOrCreateInstance(openModal);
          if (instance) instance.hide();
        }
      });
    }
    let modal = document.getElementById("authModal");
    // Remove any duplicate authForm before injecting
    const oldForms = document.querySelectorAll("#authForm");
    oldForms.forEach((f) => f.remove());
    if (!modal) {
      // Inject the modal if not present
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
            <div class="modal-dialog">
              <div class="modal-content bg-dark text-light">
                <div class="modal-header">
                  <h5 class="modal-title" id="authModalLabel">Login or Register</h5>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <form id="authForm" autocomplete="off">
                    <input type="email" class="form-control mb-2" id="authEmail" placeholder="Email" required />
                    <input type="password" class="form-control mb-2" id="authPassword" placeholder="Password" required />
                    <div class="d-grid gap-2">
                      <button type="submit" class="btn btn-info">Login</button>
                      <button type="button" id="registerBtn" class="btn btn-secondary">Register</button>
                    </div>
                    <div id="authError" class="text-danger mt-2 small"></div>
                  </form>
                </div>
              </div>
            </div>
          </div>`
      );
      modal = document.getElementById("authModal");
    }
    // Always (re)attach submit handler after modal injection or open
    const authForm = document.getElementById("authForm");
    if (authForm) {
      // Remove any previous handler to avoid duplicates
      authForm.onsubmit = null;
      authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        window._authFormSubmitHandler && window._authFormSubmitHandler(e);
      });
    }
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  } catch (err) {
    console.error("Error in showLoginModal:", err);
  }
}

function hideLoginModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    const modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) modalInstance.hide();
  }
  // Remove any lingering Bootstrap modal backdrops
  document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

// --- Auth Button Injection ---

function insertAuthButtons() {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn && !loginBtn.hasAttribute("data-listener")) {
    loginBtn.addEventListener("click", () => {
      try {
        showLoginModal();
      } catch (err) {
        console.error("Error on loginBtn click:", err);
      }
    });
    loginBtn.setAttribute("data-listener", "true");
  }
  // (Optional) Attach listeners for logout/profile if needed
}

function ensureAuthButtonsInjected() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertAuthButtons);
  } else {
    insertAuthButtons();
  }
}
// --- Auth Form Handler: always available ---
window._authFormSubmitHandler = async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  console.log("[LoginModal] Submit pressed", {
    email,
    passwordLength: password.length,
  });
  if (!email || !password) {
    document.getElementById("authError").textContent =
      "Email and password are required.";
    console.warn("[LoginModal] Missing email or password");
    return;
  }
  try {
    const signInPromise = signIn(email, password);
    let timeout = false;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        timeout = true;
        reject(new Error("signIn timed out after 5 seconds"));
      }, 5000)
    );
    let signInResult;
    try {
      signInResult = await Promise.race([signInPromise, timeoutPromise]);
    } catch (err) {
      console.error("[LoginModal] signIn threw or timed out:", err);
      document.getElementById("authError").textContent =
        "Login failed. Please try again.";
      return;
    }
    const { data, error } = signInResult || {};
    console.log("[LoginModal] signIn result", { data, error });
    if (timeout) {
      document.getElementById("authError").textContent =
        "Login request timed out. Check your network or Supabase setup.";
      console.warn("[LoginModal] signIn timed out");
      return;
    }
    if (error) {
      document.getElementById("authError").textContent = error.message;
      console.error("[LoginModal] Login error:", error.message);
    } else if (data && data.user && !data.user.confirmed_at) {
      document.getElementById("authError").textContent =
        "Please confirm your email before logging in.";
      console.warn("[LoginModal] Login failed: email not confirmed");
    } else if (data && data.session) {
      document.getElementById("authError").textContent = "";
      setCachedSession(data);
      hideLoginModal();
      // Always refresh the page after login to ensure all data is up to date
      window.location.reload();
    } else {
      document.getElementById("authError").textContent =
        "Login failed. Please check your credentials or confirm your email.";
      console.warn("[LoginModal] Login failed: unknown reason", {
        data,
        error,
      });
    }
  } catch (err) {
    document.getElementById("authError").textContent =
      "Login failed. Please try again.";
    console.error("[LoginModal] Login exception (outer catch):", err);
  }
};

// --- Main Auth UI Logic ---

// Fallback: global event listener for all #authForm submits
document.body.addEventListener(
  "submit",
  function (e) {
    if (e.target && e.target.id === "authForm") {
      e.preventDefault();
      window._authFormSubmitHandler && window._authFormSubmitHandler(e);
    }
  },
  true
);

// --- Main Auth UI State Handler ---

async function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userEmail = document.getElementById("userEmail");
  const profileNavLink = document.getElementById("profileNavLink");
  // Always fetch session from Supabase (source of truth)
  let user = null;
  try {
    const supabase = await supabasePromise;
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    // ...existing code...
    if (sessionData && sessionData.session && sessionData.session.user) {
      user = sessionData.session.user;
      setCachedSession(sessionData); // keep cache in sync for other uses
    }
  } catch (e) {
    console.error("[updateAuthUI] getSession threw:", e);
    user = null;
  }
  // Show/hide My Profile link based on login state
  if (profileNavLink) {
    if (user) {
      profileNavLink.classList.remove("d-none");
      profileNavLink.style.display = "";
    } else {
      profileNavLink.classList.add("d-none");
      profileNavLink.style.display = "none";
    }
  }
  const path = window.location.pathname;
  let container = null;
  if (path.includes("albumCollection") || path.includes("groupManagement")) {
    container = document.querySelector(".container");
  }
  const userMenuModal = document.getElementById("userMenuModal");
  if (user) {
    localStorage.setItem("user-email", user.email);
    if (loginBtn) {
      loginBtn.classList.add("d-none");
      loginBtn.style.display = "none";
    }
    if (logoutBtn) logoutBtn.classList.remove("d-none");
    if (logoutBtn) logoutBtn.style.display = "";
    if (userEmail) {
      userEmail.classList.remove("d-none");
      userEmail.textContent = user.email;
    }
    // Update modal content if function exists, else retry until available
    function tryRenderUserMenuModal(loggedIn, email, tries = 0) {
      if (typeof window.renderUserMenuModal === "function") {
        window.renderUserMenuModal(loggedIn, email);
        if (userMenuModal && userMenuModal.classList.contains("show")) {
          window.renderUserMenuModal(loggedIn, email);
        }
      } else if (tries < 10) {
        setTimeout(
          () => tryRenderUserMenuModal(loggedIn, email, tries + 1),
          100
        );
      } else {
        console.warn(
          "[updateAuthUI] renderUserMenuModal not available after retrying"
        );
      }
    }
    tryRenderUserMenuModal(true, user.email);
    // Remove not-logged-in message if present
    const msg = document.getElementById("not-logged-in-msg");
    if (msg) {
      msg.remove();
      // ...existing code...
    } else {
      // ...existing code...
    }
    // Restore all main content if it was hidden
    if (container) {
      // ...existing code...
      Array.from(container.children).forEach((child) => {
        if (child.id !== "not-logged-in-msg") {
          child.style.display = "";
        }
      });
    } else {
      // ...existing code...
    }
  } else {
    localStorage.setItem("user-email", "-");
    if (loginBtn) {
      loginBtn.classList.remove("d-none");
      loginBtn.style.display = "";
    }
    if (logoutBtn) {
      logoutBtn.classList.add("d-none");
      logoutBtn.style.display = "none";
    }
    if (userEmail) {
      userEmail.classList.add("d-none");
      userEmail.textContent = "";
    }
    // Update modal content if function exists, else retry until available
    function tryRenderUserMenuModalLoggedOut(tries = 0) {
      if (typeof window.renderUserMenuModal === "function") {
        window.renderUserMenuModal(false);
        if (userMenuModal && userMenuModal.classList.contains("show")) {
          window.renderUserMenuModal(false);
        }
      } else if (tries < 10) {
        setTimeout(() => tryRenderUserMenuModalLoggedOut(tries + 1), 100);
      } else {
        console.warn(
          "[updateAuthUI] renderUserMenuModal not available after retrying (logged out)"
        );
      }
    }
    tryRenderUserMenuModalLoggedOut();
    // Show not-logged-in message and hide all other content
    if (container) {
      Array.from(container.children).forEach((child) => {
        if (child.id !== "not-logged-in-msg") {
          child.style.display = "none";
        }
      });
      if (!document.getElementById("not-logged-in-msg")) {
        const msgDiv = document.createElement("div");
        msgDiv.id = "not-logged-in-msg";
        msgDiv.className = "alert alert-warning text-center mt-3";
        msgDiv.textContent =
          "You must be logged in to view or manage content on this page.";
        container.prepend(msgDiv);
      } else {
        document.getElementById("not-logged-in-msg").style.display = "";
      }
    }
  }
}

// Expose updateAuthUI globally and dispatch ready event
window.updateAuthUI = updateAuthUI;
window.dispatchEvent(new Event("updateAuthUIReady"));
