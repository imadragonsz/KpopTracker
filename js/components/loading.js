// Show/hide a global loading spinner overlay
export function showLoading() {
  let overlay = document.getElementById("global-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "global-loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = "flex";
}

export function hideLoading() {
  const overlay = document.getElementById("global-loading-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}
