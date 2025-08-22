// navbar.js - Handles navbar logic for all pages

// ...removed debug log...

// Highlight active nav link
const navLinks = document.querySelectorAll(".nav-link[data-page]");
navLinks.forEach((link) => {
  if (window.location.pathname.endsWith(link.getAttribute("data-page"))) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  } else {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
  }
});

// User menu modal logic
function renderUserMenuModal(isLoggedIn, email) {
  const body = document.getElementById("userMenuModalBody");
  if (!body) return;
  if (isLoggedIn) {
    body.innerHTML = `
      <div class="mb-3 text-center">
        <i class="bi bi-person-circle" style="font-size:2.5em;"></i>
        <div class="fw-bold mt-2">${email}</div>
      </div>
      <div class="d-grid gap-2">
        <a href="/pages/profile.html" class="btn btn-info">My Profile</a>
        <button id="logoutBtnModal" class="btn btn-outline-secondary">Logout</button>
      </div>
    `;
    const logoutBtn = document.getElementById("logoutBtnModal");
    if (logoutBtn) {
      logoutBtn.onclick = async function () {
        try {
          if (window.signOut) {
            await window.signOut();
            const modalElem = document.getElementById("userMenuModal");
            if (modalElem && window.bootstrap) {
              const modalInstance =
                window.bootstrap.Modal.getOrCreateInstance(modalElem);
              modalInstance.hide();
            }
            document
              .querySelectorAll(".modal-backdrop")
              .forEach((el) => el.remove());
            document.body.classList.remove("modal-open");
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
            window.location.reload();
          }
        } catch (err) {
          alert("Logout failed. Please try again.");
        }
      };
    }
  } else {
    body.innerHTML = `
      <div class="mb-3 text-center">
        <i class="bi bi-person-circle" style="font-size:2.5em;"></i>
      </div>
      <div class="d-grid gap-2">
        <button id="loginBtnModal" class="btn btn-info">Login</button>
      </div>
    `;
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
  }
}
window.renderUserMenuModal = renderUserMenuModal;

// Set user email in navbar if available
(function setNavbarUserEmail() {
  const userEmailSpan = document.getElementById("userEmail");
  if (!userEmailSpan) return;
  let email = localStorage.getItem("user-email");
  function setOrHide(emailVal) {
    if (emailVal && emailVal !== "-") {
      userEmailSpan.textContent = emailVal;
      userEmailSpan.style.display = "";
    } else {
      userEmailSpan.textContent = "";
      userEmailSpan.style.display = "none";
    }
  }
  if (
    (!email || email === "-") &&
    window.supabase &&
    window.supabase.auth &&
    typeof window.supabase.auth.getUser === "function"
  ) {
    window.supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data && data.user && data.user.email) {
          setOrHide(data.user.email);
        } else {
          setOrHide("");
        }
      })
      .catch(() => setOrHide(""));
  } else {
    setOrHide(email);
  }
})();

// Bind user menu button
function setupUserMenuBtnListener() {
  var btn = document.getElementById("userMenuBtn");
  if (!btn) return;
  btn.addEventListener("click", async function () {
    if (typeof window.updateAuthUI === "function") {
      await window.updateAuthUI();
    }
    var ModalClass =
      window.bootstrap && window.bootstrap.Modal
        ? window.bootstrap.Modal
        : window.Modal || null;
    if (!ModalClass) {
      console.warn("Bootstrap Modal not found.");
      return;
    }
    var modalElem = document.getElementById("userMenuModal");
    if (!modalElem) {
      console.warn("userMenuModal element not found.");
      return;
    }
    var modal = new ModalClass(modalElem);
    modal.show();
  });
}
setTimeout(setupUserMenuBtnListener, 0);
