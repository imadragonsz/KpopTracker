import { setupExportImport } from "../exportImport.js";
import { showLoading, hideLoading } from "../components/loading.js";
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

// profilePage.js - Handles loading and displaying user profile info
import { supabasePromise } from "../api/supabaseClient.js";
import { fetchAlbums } from "../api/albumApi.js";
import { fetchGroups } from "../api/groupApi.js";
import { fetchUserAlbumVersions } from "../api/userAlbumVersionsApi.js";

async function loadProfile() {
  showLoading();
  const supabase = await supabasePromise;
  const debugStart = performance.now();
  // DOM lookups
  const userEmailDiv = document.getElementById("user-email");
  const userJoinedDiv = document.getElementById("user-joined");
  const displayNameInput = document.getElementById("user-display-name-input");
  const displayNameStatus = document.getElementById("user-display-name-status");
  const saveDisplayNameBtn = document.getElementById("save-display-name-btn");
  const profileInfoContainer = document.getElementById("profile-info");
  const albumList = document.getElementById("profile-album-list");
  const groupList = document.getElementById("profile-group-list");
  const recentUpdatedList = document.getElementById("profile-recent-updated");
  const recentAlbumsList = document.getElementById("profile-recent-albums");
  const mostCollectedDiv = document.getElementById("user-most-collected-group");

  // 1. Show cached user info instantly
  const cachedUser = getCachedDataWithTimestamp("user-info");
  if (cachedUser && cachedUser.data) {
    if (userEmailDiv) userEmailDiv.textContent = cachedUser.data.email || "-";
    if (userJoinedDiv)
      userJoinedDiv.textContent = cachedUser.data.created_at
        ? new Date(cachedUser.data.created_at).toLocaleDateString()
        : "-";
    if (displayNameInput)
      displayNameInput.value = cachedUser.data.displayname || "";
  }

  // 2. Show cached albums/groups instantly
  const cachedAlbums = getCachedDataWithTimestamp("albums");
  const cachedGroups = getCachedDataWithTimestamp("groups");
  let albums = (cachedAlbums && cachedAlbums.data) || [];
  let groups = (cachedGroups && cachedGroups.data) || [];
  if (albumList && albums.length > 0) {
    albumList.innerHTML = albums
      .map((a) => {
        const albumName = a.name || a.album || a.title || "(Untitled Album)";
        const groupName =
          a.group || a.group_name || a.groupName || "Unknown Group";
        return `<li class="list-group-item bg-dark text-light border-info">${albumName} <span class="text-info small">(${groupName})</span></li>`;
      })
      .join("");
    console.log(
      `[Profile Debug] albums (cached) populated after ${performance
        .now()
        .toFixed(1)} ms`
    );
  }
  if (groupList && groups.length > 0) {
    groupList.innerHTML = groups
      .map(
        (g) =>
          `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
      )
      .join("");
    console.log(
      `[Profile Debug] groups (cached) populated after ${performance
        .now()
        .toFixed(1)} ms`
    );
  }

  // 3. Fetch fresh data in parallel if cache is stale or missing
  const [freshUser, freshAlbums, freshGroups] = await Promise.all([
    (async () => {
      let user = null;
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData || !sessionData.session) return null;
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
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

  // 4. Update and cache fresh user info
  if (freshUser) {
    setCachedDataWithTimestamp("user-info", freshUser);
    if (userEmailDiv) userEmailDiv.textContent = freshUser.email || "-";
    if (userJoinedDiv)
      userJoinedDiv.textContent = freshUser.created_at
        ? new Date(freshUser.created_at).toLocaleDateString()
        : "-";
    if (displayNameInput) displayNameInput.value = freshUser.displayname || "";
  }

  // 5. Update and cache fresh albums/groups
  if (Array.isArray(freshAlbums)) {
    albums = freshAlbums;
    setCachedDataWithTimestamp("albums", albums);
    if (albumList) {
      albumList.innerHTML = albums
        .map((a) => {
          const albumName = a.name || a.album || a.title || "(Untitled Album)";
          const groupName =
            a.group || a.group_name || a.groupName || "Unknown Group";
          return `<li class="list-group-item bg-dark text-light border-info">${albumName} <span class="text-info small">(${groupName})</span></li>`;
        })
        .join("");
    }
  }
  if (Array.isArray(freshGroups)) {
    groups = freshGroups;
    setCachedDataWithTimestamp("groups", groups);
    if (groupList) {
      groupList.innerHTML = groups
        .map(
          (g) =>
            `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
        )
        .join("");
    }
  }

  // Recently Updated Albums (show 5 most recent by updated_at desc, fallback to created_at)
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

  // --- Most Collected Group (per-user versions) ---
  const groupVersionCounts = {};
  for (const album of albums) {
    const groupName =
      album.group || album.group_name || album.groupName || "Unknown Group";
    // Fetch per-user versions for this album
    // eslint-disable-next-line no-await-in-loop
    let versions = await fetchUserAlbumVersions(album.id);
    if (!Array.isArray(versions)) versions = [];
    const count = versions.length > 0 ? versions.length : 1;
    groupVersionCounts[groupName] =
      (groupVersionCounts[groupName] || 0) + count;
  }
  let mostCollectedGroup = "-";
  let mostCollectedCount = 0;
  for (const [group, count] of Object.entries(groupVersionCounts)) {
    if (count > mostCollectedCount) {
      mostCollectedGroup = group;
      mostCollectedCount = count;
    }
  }
  if (mostCollectedDiv) {
    mostCollectedDiv.textContent =
      mostCollectedGroup !== "-"
        ? `${mostCollectedGroup} (${mostCollectedCount})`
        : "-";
  }
  // Recently Added Albums (show 5 most recent by created_at desc)
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
  // const groupList = document.getElementById("profile-group-list");
  // if (groupList) {
  //   // Show cached groups immediately
  //   if (groups.length > 0) {
  //     groupList.innerHTML = groups
  //       .map(
  //         (g) =>
  //           `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
  //       )
  //       .join("");
  //   } else {
  //     groupList.innerHTML =
  //       '<li class="list-group-item bg-dark text-secondary border-0">Loading groups...</li>';
  //   }
  //   // Always fetch fresh in background
  //   try {
  //     const freshGroups = await fetchGroups();
  //     if (Array.isArray(freshGroups) && isDataDifferent(freshGroups, groups)) {
  //       groups = freshGroups;
  //       setCachedData("groups", freshGroups);
  //       groupList.innerHTML = groups
  //         .map(
  //           (g) =>
  //             `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
  //         )
  //         .join("");
  //     }
  //   } catch {
  //     groupList.innerHTML =
  //       '<li class="list-group-item bg-dark text-secondary border-0">Could not load groups.</li>';
  //   }
  // }
  // Clear previous errors
  if (profileInfoContainer) profileInfoContainer.innerHTML = "";
  if (userEmailDiv) userEmailDiv.textContent = "-";
  if (userJoinedDiv) userJoinedDiv.textContent = "-";
  if (displayNameInput) displayNameInput.value = "";
  if (displayNameStatus) displayNameStatus.textContent = "";
  if (saveDisplayNameBtn) saveDisplayNameBtn.disabled = true;

  let user = null;
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData || !sessionData.session) {
      if (profileInfoContainer) {
        profileInfoContainer.innerHTML = `<div class='alert alert-warning text-center'>You must be logged in to view your profile.</div>`;
      }
      const logoutBtn = document.getElementById("logoutBtnProfile");
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    user = userData && userData.user ? userData.user : null;
    if (userError || !user) {
      if (profileInfoContainer) {
        profileInfoContainer.innerHTML = `<div class='alert alert-warning text-center'>Could not load user info.</div>`;
      }
      const logoutBtn = document.getElementById("logoutBtnProfile");
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    }
  } catch (err) {
    if (profileInfoContainer) {
      profileInfoContainer.innerHTML = `<div class='alert alert-danger text-center'>Error loading user info: ${
        err.message || err
      }</div>`;
    }
    const logoutBtn = document.getElementById("logoutBtnProfile");
    if (logoutBtn) logoutBtn.style.display = "none";
    return;
  }
  // Populate user info with fallback and error feedback
  // Show cached user email immediately if available
  const cachedUserEmail = localStorage.getItem("user-email");
  if (userEmailDiv && cachedUserEmail) {
    userEmailDiv.textContent = cachedUserEmail;
  }
  if (userJoinedDiv)
    userJoinedDiv.textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString()
      : "-";
  if (displayNameInput) {
    displayNameInput.value =
      user.user_metadata && user.user_metadata.displayname
        ? user.user_metadata.displayname
        : "";
  }
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
  // After fetching user from Supabase
  if (userEmailDiv) {
    userEmailDiv.textContent = user.email || "-";
    localStorage.setItem("user-email", user.email || "-");
  }

  // Fetch album and group counts (per-user versions)
  let albumCount = 0;
  let versionCount = 0;
  let onTheWayCount = 0;
  let groupCount = 0;
  try {
    if (Array.isArray(albums)) {
      for (const album of albums) {
        // Fetch per-user versions for this album
        // eslint-disable-next-line no-await-in-loop
        let versions = await fetchUserAlbumVersions(album.id);
        if (!Array.isArray(versions)) versions = [];
        albumCount++;
        versionCount += versions.length > 0 ? versions.length : 1;
        if (versions.length > 0) {
          const filtered = versions.filter((v) => {
            return v.onTheWay === true || v.onTheWay === "true";
          });
          onTheWayCount += filtered.length;
          // fallback for legacy/no versions
          onTheWayCount++;
        }
      }
    }
    groupCount = Array.isArray(groups) ? groups.length : 0;
    document.getElementById("user-album-count").textContent = albumCount;
    document.getElementById("user-version-count").textContent = versionCount;
    document.getElementById("user-group-count").textContent = groupCount;
    document.getElementById("user-ontheway-count").textContent = onTheWayCount;
  } catch (err) {
    document.getElementById("user-album-count").textContent = "-";
    document.getElementById("user-version-count").textContent = "-";
    document.getElementById("user-group-count").textContent = "-";
    document.getElementById("user-ontheway-count").textContent = "-";
    if (profileInfoContainer) {
      profileInfoContainer.innerHTML += `<div class='alert alert-danger text-center mt-2'>Error loading collection stats: ${
        err.message || err
      }</div>`;
    }
  }
  const debugEnd = performance.now();
  hideLoading();
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
