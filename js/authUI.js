// Expose showLoginModal globally so non-module scripts can trigger it
window.showLoginModal = showLoginModal;
// Handles login/logout UI and modal logic
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from "./auth.js";

const navbarRight = document.createElement("div");

function insertAuthButtons() {
  // Only attach event listeners to existing static buttons
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

// Retry injection if navbar not found at first
function ensureAuthButtonsInjected() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertAuthButtons);
  } else {
    insertAuthButtons();
  }
}

function showLoginModal() {
  try {
    const modal = document.getElementById("authModal");
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    } else {
      console.warn("authModal not found in DOM");
    }
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
}
// All login logic is handled inside the event handler below where email is defined.

import { supabase } from "./api/supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Hide My Profile button immediately on load
  const profileNavLink = document.getElementById("profileNavLink");
  if (profileNavLink) {
    profileNavLink.classList.add("d-none");
    profileNavLink.style.display = "none";
  }
  // Ensure auth buttons are injected before updating UI
  ensureAuthButtonsInjected();

  // Wait until buttons are present in DOM
  function waitForAuthButtons() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(() => {
        const loginBtn = document.getElementById("loginBtn");
        const logoutBtn = document.getElementById("logoutBtn");
        const userEmail = document.getElementById("userEmail");
        if (loginBtn && logoutBtn && userEmail) {
          clearInterval(interval);
          resolve();
        }
        attempts++;
        if (attempts >= maxAttempts) clearInterval(interval);
      }, 100);
    });
  }

  await waitForAuthButtons();

  // (Debug log removed)

  // Prevent duplicate modal insertion
  if (!document.getElementById("authModal")) {
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
              <form id="authForm">
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
  }

  let logoutBtn = document.getElementById("logoutBtn");
  const userEmail = document.getElementById("userEmail");
  const authForm = document.getElementById("authForm");
  const registerBtn = document.getElementById("registerBtn");

  // Helper to attach logout handler (in case button is replaced)
  function attachLogoutHandler() {
    logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      // Remove any previous handler
      logoutBtn.replaceWith(logoutBtn.cloneNode(true));
      logoutBtn = document.getElementById("logoutBtn");
      logoutBtn.addEventListener("click", async () => {
        await signOut();
        window.location.reload();
      });
    }
  }
  attachLogoutHandler();

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      if (!email || !password) {
        document.getElementById("authError").textContent =
          "Email and password are required.";
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
          console.error("signIn threw or timed out:", err);
          document.getElementById("authError").textContent =
            "Login failed. Please try again.";
          return;
        }
        const { data, error } = signInResult || {};
        if (timeout) {
          document.getElementById("authError").textContent =
            "Login request timed out. Check your network or Supabase setup.";
          console.warn("signIn timed out");
          return;
        }
        if (error) {
          document.getElementById("authError").textContent = error.message;
          console.error("Login error:", error.message);
        } else if (data && data.user && !data.user.confirmed_at) {
          document.getElementById("authError").textContent =
            "Please confirm your email before logging in.";
          console.warn("Login failed: email not confirmed");
        } else if (data && data.session) {
          document.getElementById("authError").textContent = "";
          hideLoginModal();
        } else {
          document.getElementById("authError").textContent =
            "Login failed. Please check your credentials or confirm your email.";
          console.warn("Login failed: unknown reason", { data, error });
        }
      } catch (err) {
        document.getElementById("authError").textContent =
          "Login failed. Please try again.";
        console.error("Login exception (outer catch):", err);
      }
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      console.log("Register attempt:", {
        email,
        passwordLength: password ? password.length : 0,
      });
      if (!email || !password) {
        document.getElementById("authError").textContent =
          "Email and password are required.";
        return;
      }
      if (password.length < 6) {
        document.getElementById("authError").textContent =
          "Password must be at least 6 characters.";
        return;
      }
      const { error } = await signUp(email, password);
      if (error) {
        document.getElementById("authError").textContent = error.message;
      } else {
        document.getElementById("authError").textContent =
          "Registration successful! Please check your email to confirm.";
      }
    });
  }

  async function updateAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const userEmail = document.getElementById("userEmail");
    const profileNavLink = document.getElementById("profileNavLink");
    // Only call supabase.auth.getUser if a session exists
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    let user = null;
    if (sessionData && sessionData.session) {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      user = userData && userData.user ? userData.user : null;
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
    // (Debug logs removed)
    const path = window.location.pathname;
    let container = null;
    if (path.includes("albumCollection")) {
      container = document.querySelector(".container");
    } else if (path.includes("groupManagement")) {
      container = document.querySelector(".container");
    }
    if (user) {
      if (loginBtn) loginBtn.classList.add("d-none");
      if (logoutBtn) logoutBtn.classList.remove("d-none");
      if (userEmail) {
        userEmail.classList.remove("d-none");
        userEmail.textContent = user.email;
      }
      // Remove not-logged-in message if present
      const msg = document.getElementById("not-logged-in-msg");
      if (msg) msg.remove();
      // Restore all main content if it was hidden
      if (container) {
        Array.from(container.children).forEach((child) => {
          if (child.id !== "not-logged-in-msg") {
            child.style.display = "";
          }
        });
      }
    } else {
      if (loginBtn) loginBtn.classList.remove("d-none");
      if (logoutBtn) logoutBtn.classList.add("d-none");
      if (userEmail) {
        userEmail.classList.add("d-none");
        userEmail.textContent = "";
      }
      // Show not-logged-in message and hide all other content
      if (container) {
        // Hide all children except the not-logged-in message
        Array.from(container.children).forEach((child) => {
          if (child.id !== "not-logged-in-msg") {
            child.style.display = "none";
          }
        });
        // Add the message if not present
        if (!document.getElementById("not-logged-in-msg")) {
          const msgDiv = document.createElement("div");
          msgDiv.id = "not-logged-in-msg";
          msgDiv.className = "alert alert-warning text-center mt-3";
          msgDiv.textContent =
            "You must be logged in to view or manage content on this page.";
          container.prepend(msgDiv);
        } else {
          // If present, make sure it's visible
          document.getElementById("not-logged-in-msg").style.display = "";
        }
      }
    }
  }

  // Call once on page load
  updateAuthUI();
  // And on every auth state change
  onAuthStateChange(() => {
    updateAuthUI();
    // If on the profile page, reload profile data after login/logout
    if (
      window.location.pathname.includes("profile.html") &&
      window.loadProfile
    ) {
      window.loadProfile();
    }
  });
});
