// profilePage.js - Handles loading and displaying user profile info
import { supabase } from "../api/supabaseClient.js";
import { fetchAlbums } from "../api/albumApi.js";
import { fetchGroups } from "../api/groupApi.js";

async function loadProfile() {
  // Fetch albums and groups first so they are available for both display and counts
  let albums = [];
  let groups = [];
  // Fetch albums
  const albumList = document.getElementById("profile-album-list");
  if (albumList) {
    albumList.innerHTML =
      '<li class="list-group-item bg-dark text-secondary border-0">Loading albums...</li>';
    try {
      albums = await fetchAlbums();
      if (Array.isArray(albums) && albums.length > 0) {
        albumList.innerHTML = albums
          .map((a) => {
            const albumName =
              a.name || a.album || a.title || "(Untitled Album)";
            const groupName =
              a.group || a.group_name || a.groupName || "Unknown Group";
            return `<li class="list-group-item bg-dark text-light border-info">${albumName} <span class="text-info small">(${groupName})</span></li>`;
          })
          .join("");
      } else {
        albumList.innerHTML = "";
      }
    } catch {
      albumList.innerHTML =
        '<li class="list-group-item bg-dark text-secondary border-0">Could not load albums.</li>';
    }
  }
  // Fetch groups
  const groupList = document.getElementById("profile-group-list");
  if (groupList) {
    groupList.innerHTML =
      '<li class="list-group-item bg-dark text-secondary border-0">Loading groups...</li>';
    try {
      groups = await fetchGroups();
      if (Array.isArray(groups) && groups.length > 0) {
        groupList.innerHTML = groups
          .map(
            (g) =>
              `<li class="list-group-item bg-dark text-light border-info">${g.name}</li>`
          )
          .join("");
      } else {
        groupList.innerHTML = "";
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

  // Fetch album and group counts (if available via API)
  // Set album and group counts from fetched arrays
  const albumCount = Array.isArray(albums) ? albums.length : 0;
  const groupCount = Array.isArray(groups) ? groups.length : 0;
  document.getElementById("user-album-count").textContent = albumCount;
  document.getElementById("user-group-count").textContent = groupCount;
}
// Export for use in authUI.js
export { loadProfile };
window.loadProfile = loadProfile;

// Logout button
const logoutBtn = document.getElementById("logoutBtnProfile");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../index.html";
  });
}

// On load
loadProfile();
