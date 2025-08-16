import { setupExportImport } from "../exportImport.js";
// Change Password Logic (require old password)
const changePasswordForm = document.getElementById("changePasswordForm");
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
      // Get user email
      const { data: userData } = await supabase.auth.getUser();
      const user = userData && userData.user ? userData.user : null;
      if (!user || !user.email) {
        feedback.textContent = "Could not verify user email.";
        return;
      }
      // Re-authenticate with old password
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
// --- Caching Utilities ---
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function isDataDifferent(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
// profilePage.js - Handles loading and displaying user profile info
import { supabase } from "../api/supabaseClient.js";
import { fetchAlbums } from "../api/albumApi.js";
import { fetchGroups } from "../api/groupApi.js";

async function loadProfile() {
  // Always fetch fresh albums and groups for stats
  let albums = [];
  let groups = [];
  try {
    albums = await fetchAlbums();
  } catch (e) {
    // Failed to fetch albums from DB
  }
  try {
    groups = await fetchGroups();
  } catch (e) {
    // Failed to fetch groups from DB
  }

  // Recently Updated Albums (show 5 most recent by updated_at desc, fallback to created_at)
  const recentUpdatedList = document.getElementById("profile-recent-updated");
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

  // --- Most Collected Group ---
  // Count versions per group
  const groupVersionCounts = {};
  for (const album of albums) {
    const groupName =
      album.group || album.group_name || album.groupName || "Unknown Group";
    // Parse versions if needed
    let versions = album.versions;
    if (typeof versions === "string") {
      try {
        versions = JSON.parse(versions);
      } catch {
        versions = [];
      }
    }
    if (!Array.isArray(versions)) versions = [];
    // Count versions (or 1 if no versions)
    const count = versions.length > 0 ? versions.length : 1;
    groupVersionCounts[groupName] =
      (groupVersionCounts[groupName] || 0) + count;
  }
  // Find the group with the max count
  let mostCollectedGroup = "-";
  let mostCollectedCount = 0;
  for (const [group, count] of Object.entries(groupVersionCounts)) {
    if (count > mostCollectedCount) {
      mostCollectedGroup = group;
      mostCollectedCount = count;
    }
  }
  const mostCollectedDiv = document.getElementById("user-most-collected-group");
  if (mostCollectedDiv) {
    mostCollectedDiv.textContent =
      mostCollectedGroup !== "-"
        ? `${mostCollectedGroup} (${mostCollectedCount})`
        : "-";
  }
  // Fetch albums
  const albumList = document.getElementById("profile-album-list");
  if (albumList) {
    // Show cached albums immediately
    if (albums.length > 0) {
      albumList.innerHTML = albums
        .map((a) => {
          const albumName = a.name || a.album || a.title || "(Untitled Album)";
          const groupName =
            a.group || a.group_name || a.groupName || "Unknown Group";
          return `<li class="list-group-item bg-dark text-light border-info">${albumName} <span class="text-info small">(${groupName})</span></li>`;
        })
        .join("");
    } else {
      albumList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">Loading albums...</li>';
    }
    // Always fetch fresh in background
    try {
      const freshAlbums = await fetchAlbums();
      if (Array.isArray(freshAlbums) && isDataDifferent(freshAlbums, albums)) {
        albums = freshAlbums;
        setCachedData("albums", freshAlbums);
        albumList.innerHTML = albums
          .map((a) => {
            const albumName =
              a.name || a.album || a.title || "(Untitled Album)";
            const groupName =
              a.group || a.group_name || a.groupName || "Unknown Group";
            return `<li class="list-group-item bg-dark text-light border-info">${albumName} <span class="text-info small">(${groupName})</span></li>`;
          })
          .join("");
      }
    } catch {
      albumList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">Could not load albums.</li>';
    }
  }

  // Recently Added Albums (show 5 most recent by created_at desc)
  const recentAlbumsList = document.getElementById("profile-recent-albums");
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
  // Fetch groups
  const groupList = document.getElementById("profile-group-list");
  if (groupList) {
    // Show cached groups immediately
    if (groups.length > 0) {
      groupList.innerHTML = groups
        .map(
          (g) =>
            `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
        )
        .join("");
    } else {
      groupList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">Loading groups...</li>';
    }
    // Always fetch fresh in background
    try {
      const freshGroups = await fetchGroups();
      if (Array.isArray(freshGroups) && isDataDifferent(freshGroups, groups)) {
        groups = freshGroups;
        setCachedData("groups", freshGroups);
        groupList.innerHTML = groups
          .map(
            (g) =>
              `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
          )
          .join("");
      }
    } catch {
      groupList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">Could not load groups.</li>';
    }
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    document.getElementById(
      "profile-info"
    ).innerHTML = `<div class='alert alert-warning text-center'>You must be logged in to view your profile.</div>`;
    document.getElementById("logoutBtnProfile").style.display = "none";
    return;
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData && userData.user ? userData.user : null;
  if (!user) {
    document.getElementById(
      "profile-info"
    ).innerHTML = `<div class='alert alert-warning text-center'>Could not load user info.</div>`;
    document.getElementById("logoutBtnProfile").style.display = "none";
    return;
  }
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("user-joined").textContent = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "-";
  // Display Name logic
  const displayNameInput = document.getElementById("user-display-name-input");
  const displayNameStatus = document.getElementById("user-display-name-status");
  if (displayNameInput) {
    displayNameInput.value =
      user.user_metadata && user.user_metadata.displayname
        ? user.user_metadata.displayname
        : "";
    displayNameInput.disabled = false;
    displayNameStatus.textContent = "";
  }
  const saveDisplayNameBtn = document.getElementById("save-display-name-btn");
  if (saveDisplayNameBtn) {
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
        const { error } = await supabase.auth.updateUser({
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

  // Fetch album and group counts (if available via API)
  // Set album and group counts from fetched arrays
  // Count each album version as one; if no versions, count as 1
  let albumCount = 0;
  let versionCount = 0;
  let onTheWayCount = 0;
  if (Array.isArray(albums)) {
    for (const album of albums) {
      // Parse versions if it's a string
      let versions = album.versions;
      if (typeof versions === "string") {
        try {
          versions = JSON.parse(versions);
        } catch {
          versions = [];
        }
      }
      if (!Array.isArray(versions)) versions = [];
      albumCount++;
      versionCount += versions.length > 0 ? versions.length : 1;
      if (versions.length > 0) {
        const filtered = versions.filter((v) => {
          // Skipping non-object version entry
          return v.onTheWay === true || v.onTheWay === "true";
        });
        onTheWayCount += filtered.length;
        // fallback for legacy/no versions
        onTheWayCount++;
      }
    }
  }
  const groupCount = Array.isArray(groups) ? groups.length : 0;
  document.getElementById("user-album-count").textContent = albumCount;
  document.getElementById("user-version-count").textContent = versionCount;
  document.getElementById("user-group-count").textContent = groupCount;
  document.getElementById("user-ontheway-count").textContent = onTheWayCount;
}
// Export for use in authUI.js
export { loadProfile };
window.loadProfile = loadProfile;

// Logout button
const logoutBtn = document.getElementById("logoutBtnProfile");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
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
