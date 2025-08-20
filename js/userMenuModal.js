// Debug: Log all click events to see what is being clicked
document.addEventListener("click", function (e) {
  console.log(
    "[Modal Debug] Click event:",
    e.target,
    "Classes:",
    e.target.className
  );
});
// Last-resort: Remove modal-backdrop on any .btn-close click inside a modal
// Attach .btn-close click handler directly to document (not inside DOMContentLoaded)
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-close")) {
    console.log("[Modal Debug] btn-close click handler triggered");
    // Immediate check
    const allBackdropsNow = document.querySelectorAll(".modal-backdrop");
    console.log(
      "[Modal Debug] (Immediate) All .modal-backdrop elements:",
      allBackdropsNow
    );
    const backdropNow = document.querySelector(
      "body > div.modal-backdrop.fade.show"
    );
    console.log(
      "[Modal Debug] (Immediate) Query for body > div.modal-backdrop.fade.show:",
      backdropNow
    );
    if (backdropNow) {
      console.log(
        "[Modal Debug] (Immediate) Removing backdrop via btn-close click"
      );
      backdropNow.remove();
    } else {
      console.log(
        "[Modal Debug] (Immediate) No backdrop found via btn-close click"
      );
    }
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    // Delayed fallback
    setTimeout(function () {
      const allBackdrops = document.querySelectorAll(".modal-backdrop");
      console.log(
        "[Modal Debug] (Delayed) All .modal-backdrop elements:",
        allBackdrops
      );
      const backdrop = document.querySelector(
        "body > div.modal-backdrop.fade.show"
      );
      console.log(
        "[Modal Debug] (Delayed) Query for body > div.modal-backdrop.fade.show:",
        backdrop
      );
      if (backdrop) {
        console.log(
          "[Modal Debug] (Delayed) Removing backdrop via btn-close click"
        );
        backdrop.remove();
      } else {
        console.log(
          "[Modal Debug] (Delayed) No backdrop found via btn-close click"
        );
      }
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }, 500);
  }
});
// MutationObserver to remove lingering modal-backdrop elements
document.addEventListener("DOMContentLoaded", function () {
  const observer = new MutationObserver(() => {
    const backdrop = document.querySelector(
      "body > div.modal-backdrop.fade.show"
    );
    if (backdrop) {
      console.log("[Modal Debug] Removing backdrop via MutationObserver");
      backdrop.remove();
    } else {
      console.log("[Modal Debug] No backdrop found via MutationObserver");
    }
    if (!document.body.classList.contains("modal-open")) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
// Ensure all modal-backdrop elements are removed after any modal is closed
document.addEventListener("DOMContentLoaded", function () {
  document.body.addEventListener("hidden.bs.modal", function () {
    setTimeout(function () {
      const backdrop = document.querySelector(
        "body > div.modal-backdrop.fade.show"
      );
      if (backdrop) {
        console.log("[Modal Debug] Removing backdrop via hidden.bs.modal");
        backdrop.remove();
      } else {
        console.log("[Modal Debug] No backdrop found via hidden.bs.modal");
      }
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }, 10);
  });
});
// js/userMenuModal.js
// Handles user menu modal logic using the correct Supabase client instance

function setupUserMenuBtnListener() {
  const btn = document.getElementById("userMenuBtn");
  if (!btn) return;
  btn.addEventListener("click", async function () {
    console.log("userMenuBtn pressed");
    const ModalClass =
      window.bootstrap && window.bootstrap.Modal
        ? window.bootstrap.Modal
        : window.Modal || null;
    if (!ModalClass) {
      console.warn("Bootstrap Modal not found.");
      return;
    }
    const modalElem = document.getElementById("userMenuModal");
    if (!modalElem) {
      console.warn("userMenuModal element not found.");
      return;
    }
    const body = document.getElementById("userMenuModalBody");
    if (body) {
      body.innerHTML =
        '<div class="text-center py-4"><div class="spinner-border text-info" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    const modal = new ModalClass(modalElem);
    modal.show();

    let supabaseClient = null;
    if (window.supabasePromise) {
      console.log("[userMenuModal] window.supabasePromise exists, awaiting...");
      try {
        supabaseClient = await window.supabasePromise;
        console.log("[userMenuModal] supabaseClient resolved:", supabaseClient);
      } catch (e) {
        console.warn("Could not get supabase client from supabasePromise", e);
      }
    } else {
      console.warn("[userMenuModal] window.supabasePromise is not defined!");
    }

    if (supabaseClient && supabaseClient.auth && supabaseClient.auth.getUser) {
      console.log("[userMenuModal] Calling supabaseClient.auth.getUser()...");
      supabaseClient.auth
        .getUser()
        .then(function (resp) {
          const user = resp && resp.data && resp.data.user;
          console.log(
            "[userMenuModal] Supabase user check:",
            user ? user.id : null,
            user,
            "Full response:",
            resp
          );
          if (body) {
            if (user && user.email) {
              body.innerHTML = `
              <div class="mb-3 text-center">
                <i class="bi bi-person-circle" style="font-size:2.5em;"></i>
                <div class="fw-bold mt-2">${user.email}</div>
              </div>
              <div class="d-grid gap-2">
                <a href="/pages/profile.html" class="btn btn-info">My Profile</a>
                <button id="logoutBtnModal" class="btn btn-outline-secondary">Logout</button>
              </div>
            `;
              setTimeout(function () {
                const logoutBtn = document.getElementById("logoutBtnModal");
                if (logoutBtn) {
                  // Remove any previous event listeners
                  logoutBtn.replaceWith(logoutBtn.cloneNode(true));
                  const newLogoutBtn =
                    document.getElementById("logoutBtnModal");
                  newLogoutBtn.onclick = async function () {
                    console.log("[userMenuModal] Logout button clicked");
                    if (window.signOut) {
                      await window.signOut();
                    } else if (supabaseClient) {
                      await supabaseClient.auth.signOut();
                    }
                    // Update UI without full reload
                    if (typeof window.updateAuthUI === "function") {
                      window.updateAuthUI();
                    }
                    // Hide or clear main content containers for instant effect
                    // Album list (albumCollection.html)
                    var albumList = document.getElementById("album-list");
                    if (albumList) albumList.innerHTML = "";
                    // Main container (albumCollection, profile, etc.)
                    var mainContainer =
                      document.querySelector(".main-container");
                    if (mainContainer) mainContainer.style.display = "none";
                    // Browse results (browse.html)
                    var browseResults =
                      document.getElementById("browseResults");
                    if (browseResults) browseResults.innerHTML = "";
                    // Group management table (groupManagement.html)
                    var groupTable = document.getElementById("groupTable");
                    if (groupTable) groupTable.innerHTML = "";
                    // Show not-logged-in message if present
                    var notLoggedInMsg =
                      document.getElementById("not-logged-in-msg");
                    if (notLoggedInMsg) notLoggedInMsg.style.display = "";
                    // Hide the modal after logout
                    if (
                      window.bootstrap &&
                      window.bootstrap.Modal.getInstance
                    ) {
                      const modalInstance =
                        window.bootstrap.Modal.getInstance(modalElem);
                      if (modalInstance) modalInstance.hide();
                      // Fallback: forcibly remove modal, fade, show classes after hide
                      setTimeout(() => {
                        modalElem.classList.remove("modal", "fade", "show");
                        modalElem.style.display = "none";
                        const backdrop = document.querySelector(
                          "body > div.modal-backdrop.fade.show"
                        );
                        if (backdrop) {
                          console.log(
                            "[Modal Debug] Removing backdrop via logout fallback"
                          );
                          backdrop.remove();
                        } else {
                          console.log(
                            "[Modal Debug] No backdrop found via logout fallback"
                          );
                        }
                        document.body.classList.remove("modal-open");
                        document.body.style.overflow = "";
                        document.body.style.paddingRight = "";
                      }, 300);
                    } else {
                      modalElem.classList.remove("modal", "fade", "show");
                      modalElem.style.display = "none";
                      const backdrop = document.querySelector(
                        "body > div.modal-backdrop.fade.show"
                      );
                      if (backdrop) {
                        console.log(
                          "[Modal Debug] Removing backdrop via logout fallback (no bootstrap)"
                        );
                        backdrop.remove();
                      } else {
                        console.log(
                          "[Modal Debug] No backdrop found via logout fallback (no bootstrap)"
                        );
                      }
                      document.body.classList.remove("modal-open");
                      document.body.style.overflow = "";
                      document.body.style.paddingRight = "";
                    }
                  };
                }
              }, 0);
            } else {
              body.innerHTML = `
              <div class="mb-3 text-center">
                <i class="bi bi-person-circle" style="font-size:2.5em;"></i>
              </div>
              <div class="d-grid gap-2">
                <button id="loginBtnModal" class="btn btn-info">Login</button>
              </div>
            `;
              setTimeout(function () {
                const loginBtn = document.getElementById("loginBtnModal");
                if (loginBtn) {
                  loginBtn.onclick = function () {
                    if (typeof showLoginModal === "function") {
                      showLoginModal();
                    } else {
                      const modal = document.getElementById("authModal");
                      if (modal && window.bootstrap) {
                        const modalInstance = new window.bootstrap.Modal(modal);
                        modalInstance.show();
                      }
                    }
                  };
                }
              }, 0);
            }
          }
        })
        .catch(function (err) {
          console.error("[userMenuModal] Error calling getUser:", err);
        });
    } else {
      console.warn(
        "[userMenuModal] supabaseClient or getUser not available:",
        supabaseClient
      );
      // Fallback: show login
      if (body) {
        body.innerHTML = `
          <div class="mb-3 text-center">
            <i class="bi bi-person-circle" style="font-size:2.5em;"></i>
          </div>
          <div class="d-grid gap-2">
            <button id="loginBtnModal" class="btn btn-info">Login</button>
          </div>
        `;
        setTimeout(function () {
          const loginBtn = document.getElementById("loginBtnModal");
          if (loginBtn) {
            loginBtn.onclick = function () {
              if (typeof showLoginModal === "function") {
                showLoginModal();
              } else {
                const modal = document.getElementById("authModal");
                if (modal && window.bootstrap) {
                  const modalInstance = new window.bootstrap.Modal(modal);
                  modalInstance.show();
                }
              }
            };
          }
        }, 0);
      }
      modal.show();
    }
  });
}

// Wait for navbar to be injected, then bind
window.tryBindUserMenuBtn = function (retries) {
  if (document.getElementById("userMenuBtn")) {
    setupUserMenuBtnListener();
  } else if (retries > 0) {
    setTimeout(function () {
      window.tryBindUserMenuBtn(retries - 1);
    }, 200);
  }
};
