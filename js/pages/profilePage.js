// --- Album Versions On The Way Section Logic ---
import { fetchUserAlbumVersionsBatch } from "../api/userAlbumVersionsApi.js";
import { showAlbumVersionModal } from "../components/albumVersionModal.js";

function renderOnTheWaySection() {
  // Find the placeholder or fallback to profile-content-wrapper
  const placeholder = document.getElementById("onTheWaySectionPlaceholder");
  if (!placeholder) return;

  // Create the section container
  const section = document.createElement("div");
  section.className = "row g-3 mb-4";
  section.innerHTML = `
    <div class="col-12 mb-2">
      <h4 class="fw-bold text-info mb-3">
        <i class="bi bi-truck me-2"></i>Album Versions On The Way
      </h4>
    </div>
    <div class="col-12">
      <div id="onTheWayAlbumVersions"></div>
      <nav>
        <ul id="onTheWayPagination" class="pagination justify-content-center"></ul>
      </nav>
    </div>
  `;
  placeholder.replaceWith(section);

  // Logic for fetching and rendering
  let onTheWayList = [];
  let currentPage = 1;
  const PAGE_SIZE = 5;

  async function getAllUserAlbumIds() {
    if (window.fetchUserAlbumIds) {
      return await window.fetchUserAlbumIds();
    }
    // Fallback: try to get from Supabase directly
    const supabase = await window.supabasePromise;
    const user =
      (await window.getCurrentUser?.()) ||
      (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    const { data, error } = await supabase
      .from("user_album_versions")
      .select("album_id")
      .eq("user_id", user.id);
    if (error || !data) return [];
    return data.map((row) => row.album_id);
  }

  async function loadOnTheWayVersions() {
    const albumIds = await getAllUserAlbumIds();
    if (!albumIds.length) {
      document.getElementById("onTheWayAlbumVersions").innerHTML =
        '<div class="text-muted">No albums found.</div>';
      document.getElementById("onTheWayPagination").innerHTML = "";
      return;
    }
    // Fetch all albums and build a map of albumId -> albumName and albumImage
    let albums = [];
    try {
      albums = await import("../api/albumApi.js").then((m) => m.fetchAlbums());
    } catch {}
    const albumInfoMap = {};
    if (Array.isArray(albums)) {
      for (const a of albums) {
        const id = a.id || a.album_id;
        const name = a.name || a.album || a.title || "(Untitled Album)";
        // Try to get image, fallback to default
        let image = a.image || a.cover || a.img || a.thumbnail || null;
        if (!image) {
          image = "../assets/images/default_album.png";
        }
        if (id) albumInfoMap[id] = { name, image };
      }
    }
    const allVersions = await fetchUserAlbumVersionsBatch(albumIds);
    // Flatten and filter for onTheWay, include album name
    onTheWayList = [];
    for (const [albumId, versions] of Object.entries(allVersions)) {
      if (Array.isArray(versions)) {
        for (const v of versions) {
          if (v.onTheWay) {
            const albumInfo = albumInfoMap[albumId] || {
              name: "(Unknown Album)",
              image: "../assets/images/default_album.png",
            };
            onTheWayList.push({
              ...v,
              albumId,
              albumName: albumInfo.name,
              albumImage: albumInfo.image,
            });
          }
        }
      }
    }
    renderOnTheWayPage();
  }

  function renderOnTheWayPage() {
    // Update the on the way count in the stats card
    const onTheWayCountDiv = document.getElementById("user-ontheway-count");
    if (onTheWayCountDiv) {
      onTheWayCountDiv.textContent = onTheWayList.length;
    }
    const container = document.getElementById("onTheWayAlbumVersions");
    const pagination = document.getElementById("onTheWayPagination");
    if (!onTheWayList.length) {
      container.innerHTML =
        '<div class="text-muted">No album versions on the way.</div>';
      pagination.innerHTML = "";
      return;
    }
    const totalPages = Math.ceil(onTheWayList.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = onTheWayList.slice(startIdx, startIdx + PAGE_SIZE);
    container.innerHTML = `
      <ul class="list-group mb-3">
        ${pageItems
          .map(
            (
              v,
              idx
            ) => `<li class="list-group-item bg-dark text-light border-info d-flex justify-content-between align-items-center ontheway-version-item" data-idx="${
              startIdx + idx
            }" style="cursor:pointer;">
          <span class="d-flex align-items-center">
            <img src="${
              v.albumImage || "../assets/images/default_album.png"
            }" alt="Album Cover" class="ontheway-album-image" data-album-id="${
              v.albumId
            }" style="width:32px;height:32px;object-fit:cover;border-radius:4px;margin-right:10px;cursor:pointer;">
            <strong>${v.albumName || "(Unknown Album)"}</strong> - <span>${
              v.name
            }</span>${
              v.notes ? ` <span class='text-muted'>(${v.notes})</span>` : ""
            }
          </span>
          ${
            v.trackingCode
              ? `<span class='badge bg-info text-dark ms-2'>Tracking: ${v.trackingCode}</span>`
              : ""
          }
        </li>`
          )
          .join("")}
      </ul>
    `;
    // Add click handlers: image opens album info modal, rest opens version modal
    container.querySelectorAll(".ontheway-version-item").forEach((li) => {
      const idx = parseInt(li.getAttribute("data-idx"));
      const version = onTheWayList[idx];
      // Album image click: open album info modal
      const img = li.querySelector(".ontheway-album-image");
      if (img) {
        img.addEventListener("click", async (e) => {
          e.stopPropagation();
          // Dynamically import showAlbumInfoModal
          const { showAlbumInfoModal } = await import(
            "../components/albumModals.js"
          );
          // Find album info from albums list (by id)
          let albumObj = null;
          if (window.fetchAlbums) {
            const allAlbums = await window.fetchAlbums();
            albumObj = allAlbums.find(
              (a) => (a.id || a.album_id) == version.albumId
            );
          }
          // Fallback: use what we have
          if (!albumObj) {
            albumObj = {
              id: version.albumId,
              album: version.albumName,
              image: version.albumImage,
            };
          }
          showAlbumInfoModal(albumObj);
        });
      }
      // Rest of the item: open album version modal
      li.addEventListener("click", (e) => {
        // Prevent if image was clicked
        if (e.target.classList.contains("ontheway-album-image")) return;
        if (version) {
          showAlbumVersionModal({
            name: version.name,
            trackingCode: version.trackingCode,
            onTheWay: version.onTheWay,
            notes: version.notes || "",
          });
        }
      });
    });
    // Pagination controls
    if (totalPages > 1) {
      let html = "";
      for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item${
          i === currentPage ? " active" : ""
        }"><button class="page-link" data-page="${i}">${i}</button></li>`;
      }
      pagination.innerHTML = html;
      pagination.querySelectorAll("button.page-link").forEach((btn) => {
        btn.onclick = () => {
          currentPage = parseInt(btn.dataset.page);
          renderOnTheWayPage();
        };
      });
    } else {
      pagination.innerHTML = "";
    }
  }

  // Initial load
  loadOnTheWayVersions();
}

// Wait for DOMContentLoaded and profile-content-wrapper to exist
document.addEventListener("DOMContentLoaded", () => {
  // Wait for wrapper to be created by loadProfile
  function tryRenderOnTheWaySection(retries = 20) {
    const wrapper = document.getElementById("profile-content-wrapper");
    const placeholder = document.getElementById("onTheWaySectionPlaceholder");
    if (wrapper && placeholder) {
      renderOnTheWaySection();
    } else if (retries > 0) {
      setTimeout(() => tryRenderOnTheWaySection(retries - 1), 100);
    }
  }
  tryRenderOnTheWaySection();
});
import { setupExportImport } from "../exportImport.js";
import { showLoading, hideLoading } from "../components/loading.js";
import { supabasePromise } from "../api/supabaseClient.js";
import { fetchAlbums } from "../api/albumApi.js";
import { fetchGroups } from "../api/groupApi.js";

const changePasswordForm = document.getElementById("changePasswordForm");

function getCachedDataWithTimestamp(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedDataWithTimestamp(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function isDataStale(ts, maxAgeMs = 5 * 60 * 1000) {
  // Default: 5 minutes
  return !ts || Date.now() - ts > maxAgeMs;
}

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const feedback = document.getElementById("changePasswordFeedback");
    feedback.textContent = "";
    if (newPassword.length < 6) {
      feedback.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (newPassword !== confirmPassword) {
      feedback.textContent = "Passwords do not match.";
      return;
    }
    feedback.textContent = "Verifying current password...";
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData && userData.user ? userData.user : null;
      if (!user || !user.email) {
        feedback.textContent = "Could not verify user email.";
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        feedback.textContent = "Current password is incorrect.";
        return;
      }
      feedback.textContent = "Updating password...";
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        feedback.textContent = error.message || "Failed to update password.";
      } else {
        feedback.textContent = "Password updated successfully!";
        setTimeout(() => {
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("changePasswordModal")
          );
          if (modal) modal.hide();
          feedback.textContent = "";
          changePasswordForm.reset();
        }, 1200);
      }
    } catch (err) {
      feedback.textContent = err.message || "Failed to update password.";
    }
  });
}

async function loadProfile() {
  // Always use the resolved supabase client
  const supabaseClient = await supabasePromise;
  // check user login status (no debug log)
  await supabaseClient.auth.getUser();
  showLoading();

  // Add a wrapper for all profile content if not present
  let profileContent = document.getElementById("profile-content-wrapper");
  if (!profileContent) {
    profileContent = document.createElement("div");
    profileContent.id = "profile-content-wrapper";
    // Move all children of .container (main profile container) into this wrapper
    const mainContainer = document.querySelector(
      ".container.p-4.rounded.shadow-lg"
    );
    if (mainContainer) {
      while (mainContainer.firstChild) {
        profileContent.appendChild(mainContainer.firstChild);
      }
      mainContainer.appendChild(profileContent);
    }
  }

  const userEmailDiv = document.getElementById("user-email");
  const userJoinedDiv = document.getElementById("user-joined");
  const displayNameInput = document.getElementById("user-display-name-input");
  const displayNameStatus = document.getElementById("user-display-name-status");
  const saveDisplayNameBtn = document.getElementById("save-display-name-btn");
  const albumList = document.getElementById("profile-album-list");
  const groupList = document.getElementById("profile-group-list");
  const recentUpdatedList = document.getElementById("profile-recent-updated");
  const recentAlbumsList = document.getElementById("profile-recent-albums");
  const mostCollectedDiv = document.getElementById("user-most-collected-group");

  // Add login prompt if not logged in
  let loginPrompt = document.getElementById("profile-login-prompt");
  if (!loginPrompt) {
    loginPrompt = document.createElement("div");
    loginPrompt.id = "profile-login-prompt";
    loginPrompt.style.display = "none";
    loginPrompt.innerHTML = `<div class="text-center p-5"><h2 class="text-info mb-3"><i class="bi bi-person-lock"></i> Please log in to view your profile.</h2><button id="profile-login-btn" class="btn btn-info">Log In</button></div>`;
    const mainContainer = document.querySelector(
      ".container.p-4.rounded.shadow-lg"
    );
    if (mainContainer) mainContainer.insertBefore(loginPrompt, profileContent);
  }

  const cachedUser = getCachedDataWithTimestamp("user-info");
  const cachedAlbums = getCachedDataWithTimestamp("albums");
  const cachedGroups = getCachedDataWithTimestamp("groups");
  let albums = (cachedAlbums && cachedAlbums.data) || [];
  let groups = (cachedGroups && cachedGroups.data) || [];

  // Hide all profile content by default until login is checked
  if (profileContent) profileContent.style.display = "none";
  if (loginPrompt) loginPrompt.style.display = "none";

  // ...
  const [freshUser, freshAlbums, freshGroups] = await Promise.all([
    (async () => {
      let user = null;
      try {
        const { data: sessionData, error: sessionError } =
          await supabaseClient.auth.getSession();
        if (sessionError || !sessionData || !sessionData.session) return null;
        const { data: userData, error: userError } =
          await supabaseClient.auth.getUser();
        user = userData && userData.user ? userData.user : null;
        if (userError || !user) return null;
        return {
          email: user.email || "-",
          created_at: user.created_at || null,
          displayname:
            (user.user_metadata && user.user_metadata.displayname) || "",
        };
      } catch {
        return null;
      }
    })(),
    !cachedAlbums || isDataStale(cachedAlbums.ts)
      ? fetchAlbums()
      : Promise.resolve(albums),
    !cachedGroups || isDataStale(cachedGroups.ts)
      ? fetchGroups()
      : Promise.resolve(groups),
  ]);

  if (!freshUser) {
    // Not logged in: hide profile, show login prompt
    if (profileContent) profileContent.style.display = "none";
    if (loginPrompt) loginPrompt.style.display = "block";
    // Add click handler to login button
    const loginBtn = document.getElementById("profile-login-btn");
    if (loginBtn) {
      loginBtn.onclick = () => {
        // Prefer direct modal if available
        if (typeof window.showLoginModal === "function") {
          window.showLoginModal();
        } else {
          const navLoginBtn = document.getElementById("loginBtn");
          if (navLoginBtn) navLoginBtn.click();
        }
      };
    }
    hideLoading();
    return;
  } else {
    // Logged in: show profile, hide login prompt
    if (profileContent) profileContent.style.display = "block";
    if (loginPrompt) loginPrompt.style.display = "none";
  }

  setCachedDataWithTimestamp("user-info", freshUser);
  if (userEmailDiv) userEmailDiv.textContent = freshUser.email || "-";
  if (userJoinedDiv)
    userJoinedDiv.textContent = freshUser.created_at
      ? new Date(freshUser.created_at).toLocaleDateString()
      : "-";
  if (displayNameInput) displayNameInput.value = freshUser.displayname || "";

  if (Array.isArray(freshAlbums)) {
    albums = freshAlbums;
    setCachedDataWithTimestamp("albums", albums);
    if (albumList) {
      if (albums.length > 0) {
        albumList.innerHTML = albums
          .map((a) => {
            const albumName =
              a.name || a.album || a.title || "(Untitled Album)";
            const groupName =
              a.group || a.group_name || a.groupName || "Unknown Group";
            return `<li class=\"list-group-item bg-dark text-light border-info\">${albumName} <span class=\"text-info small\">(${groupName})</span></li>`;
          })
          .join("");
      } else {
        albumList.innerHTML =
          '<li class="list-group-item bg-dark text-secondary border-0">No albums found.</li>';
      }
    }
  }

  if (Array.isArray(freshGroups)) {
    groups = freshGroups;
    setCachedDataWithTimestamp("groups", groups);
    if (groupList) {
      if (groups.length > 0) {
        groupList.innerHTML = groups
          .map(
            (g) =>
              `<li class=\"list-group-item bg-dark text-light border-info\">${g.name}</li>`
          )
          .join("");
      } else {
        groupList.innerHTML =
          '<li class="list-group-item bg-dark text-secondary border-0">No groups found.</li>';
      }
    }
  }

  // Stats
  {
    const albumCount = Array.isArray(albums) ? albums.length : 0;
    const versionCount = albumCount;
    const groupCount = Array.isArray(groups) ? groups.length : 0;
    const onTheWayCount = 0;
    const albumCountDiv = document.getElementById("user-album-count");
    const versionCountDiv = document.getElementById("user-version-count");
    const groupCountDiv = document.getElementById("user-group-count");
    const onTheWayCountDiv = document.getElementById("user-ontheway-count");
    if (albumCountDiv) albumCountDiv.textContent = albumCount;
    if (versionCountDiv) versionCountDiv.textContent = versionCount;
    if (groupCountDiv) groupCountDiv.textContent = groupCount;
    if (onTheWayCountDiv) onTheWayCountDiv.textContent = onTheWayCount;
  }

  // Recently updated albums
  if (recentUpdatedList) {
    let sorted = Array.isArray(albums)
      ? [...albums]
          .filter((a) => a.updated_at || a.created_at)
          .sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at);
            const dateB = new Date(b.updated_at || b.created_at);
            return dateB - dateA;
          })
      : [];
    sorted = sorted.slice(0, 5);
    if (sorted.length > 0) {
      recentUpdatedList.innerHTML = sorted
        .map((a) => {
          const albumName = a.name || a.album || a.title || "(Untitled Album)";
          const groupName =
            a.group || a.group_name || a.groupName || "Unknown Group";
          const dt = a.updated_at || a.created_at;
          let dateTime = "-";
          if (dt) {
            const d = new Date(dt);
            dateTime = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`;
          }
          return `<li class="list-group-item bg-dark text-light border-info d-flex justify-content-between align-items-center">
            <span>${albumName} <span class="text-info small">(${groupName})</span></span>
            <span class="text-secondary small">${dateTime}</span>
          </li>`;
        })
        .join("");
    } else {
      recentUpdatedList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">No recently updated albums.</li>';
    }
  }

  // Most collected group
  if (mostCollectedDiv) {
    const groupCounts = {};
    for (const album of albums) {
      const groupName =
        album.group || album.group_name || album.groupName || "Unknown Group";
      groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;
    }
    let mostCollectedGroup = "-";
    let mostCollectedCount = 0;
    for (const [group, count] of Object.entries(groupCounts)) {
      if (count > mostCollectedCount) {
        mostCollectedGroup = group;
        mostCollectedCount = count;
      }
    }
    mostCollectedDiv.textContent =
      mostCollectedGroup !== "-"
        ? `${mostCollectedGroup} (${mostCollectedCount})`
        : "-";
  }

  // Recently added albums
  if (recentAlbumsList) {
    let sorted = Array.isArray(albums)
      ? [...albums]
          .filter((a) => a.created_at)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : [];
    sorted = sorted.slice(0, 5);
    if (sorted.length > 0) {
      recentAlbumsList.innerHTML = sorted
        .map((a) => {
          const albumName = a.name || a.album || a.title || "(Untitled Album)";
          const groupName =
            a.group || a.group_name || a.groupName || "Unknown Group";
          let dateTime = "-";
          if (a.created_at) {
            const d = new Date(a.created_at);
            dateTime = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`;
          }
          return `<li class="list-group-item bg-dark text-light border-info d-flex justify-content-between align-items-center">
            <span>${albumName} <span class="text-info small">(${groupName})</span></span>
            <span class="text-secondary small">${dateTime}</span>
          </li>`;
        })
        .join("");
    } else {
      recentAlbumsList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">No recent albums.</li>';
    }
  }

  // Display name save
  if (saveDisplayNameBtn && displayNameInput && displayNameStatus) {
    saveDisplayNameBtn.disabled = false;
    saveDisplayNameBtn.onclick = async () => {
      const newName = displayNameInput.value.trim();
      if (newName.length < 2) {
        displayNameStatus.textContent =
          "Display name must be at least 2 characters.";
        displayNameStatus.classList.remove("text-success");
        displayNameStatus.classList.add("text-danger");
        return;
      }
      saveDisplayNameBtn.disabled = true;
      displayNameInput.disabled = true;
      displayNameStatus.textContent = "Saving...";
      displayNameStatus.classList.remove("text-danger");
      displayNameStatus.classList.remove("text-success");
      try {
        const supabaseClient = await supabasePromise;
        const { error } = await supabaseClient.auth.updateUser({
          data: { displayname: newName },
        });
        if (error) {
          displayNameStatus.textContent =
            error.message || "Failed to update display name.";
          displayNameStatus.classList.add("text-danger");
        } else {
          displayNameStatus.textContent = "Display name updated!";
          displayNameStatus.classList.add("text-success");
        }
      } catch (err) {
        displayNameStatus.textContent =
          err.message || "Failed to update display name.";
        displayNameStatus.classList.add("text-danger");
      } finally {
        saveDisplayNameBtn.disabled = false;
        displayNameInput.disabled = false;
      }
    };
  }

  // Save user email to localStorage
  if (userEmailDiv && freshUser) {
    userEmailDiv.textContent = freshUser.email || "-";
    localStorage.setItem("user-email", freshUser.email || "-");
  }

  hideLoading();
}

// Export for use in authUI.js
export { loadProfile };
window.loadProfile = loadProfile;

// Logout button
const logoutBtn = document.getElementById("logoutBtnProfile");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    // Gather data that would be shown in the profile section
    const userInfo = (() => {
      try {
        const cached = localStorage.getItem("user-info");
        return cached ? JSON.parse(cached).data : null;
      } catch {
        return null;
      }
    })();
    const albums = (() => {
      try {
        const cached = localStorage.getItem("albums");
        return cached ? JSON.parse(cached).data : [];
      } catch {
        return [];
      }
    })();
    const groups = (() => {
      try {
        const cached = localStorage.getItem("groups");
        return cached ? JSON.parse(cached).data : [];
      } catch {
        return [];
      }
    })();
    // Clear all local and session storage (browser cache)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    await supabase.auth.signOut();
    window.location.reload();
  });
}

// On load
loadProfile();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupExportImport);
} else {
  setupExportImport();
}
