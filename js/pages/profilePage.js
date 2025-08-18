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

  const cachedAlbums = getCachedDataWithTimestamp("albums");
  const cachedGroups = getCachedDataWithTimestamp("groups");
  let albums = (cachedAlbums && cachedAlbums.data) || [];
  let groups = (cachedGroups && cachedGroups.data) || [];
  // ...
  if (albumList) {
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
  }
  if (groupList) {
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
  }

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

  if (freshUser) {
    setCachedDataWithTimestamp("user-info", freshUser);
    if (userEmailDiv) userEmailDiv.textContent = freshUser.email || "-";
    if (userJoinedDiv)
      userJoinedDiv.textContent = freshUser.created_at
        ? new Date(freshUser.created_at).toLocaleDateString()
        : "-";
    if (displayNameInput) displayNameInput.value = freshUser.displayname || "";
  }

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
