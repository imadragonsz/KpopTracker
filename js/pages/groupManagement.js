// groupManagement.js
// Use fetchGroups to load only the user's groups and log for debugging

import { fetchGroups } from "../api/groupApi.js";
import { getCurrentUser } from "../auth.js";

import { removeUserFromGroup } from "../api/groupApi.js";

function renderGroups(groups) {
  const groupList = document.getElementById("groupList");
  groupList.innerHTML = "";
  if (!groups.length) {
    groupList.innerHTML =
      '<li class="list-group-item text-center text-secondary">No groups found.</li>';
    document.getElementById(
      "groupCount"
    ).innerHTML = `<i class='bi bi-people-fill me-1'></i>0 Groups`;
    return;
  }
  document.getElementById(
    "groupCount"
  ).innerHTML = `<i class='bi bi-people-fill me-1'></i>${groups.length} Group${
    groups.length > 1 ? "s" : ""
  }`;
  groups.forEach((group) => {
    console.log(
      "[groupManagement] Rendering group:",
      group.name,
      "user_id:",
      group.user_id
    );
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex align-items-center justify-content-between";
    li.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <img src="${group.image || "/assets/images/default-group.png"}" alt="${
      group.name
    }" class="rounded-circle border" width="40" height="40">
        <span class="fw-bold">${group.name}</span>
      </div>
      <button class="btn btn-sm btn-outline-danger remove-group-btn" data-group-id="${
        group.id
      }"><i class="bi bi-x-lg"></i></button>
    `;
    groupList.appendChild(li);
  });
  // Attach remove handlers
  groupList.querySelectorAll(".remove-group-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const groupId = btn.getAttribute("data-group-id");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      await removeUserFromGroup(groupId);
      await loadUserGroupsForManagement();
    });
  });
}

async function loadUserGroupsForManagement() {
  const user = await getCurrentUser();
  if (user) {
    console.log("[groupManagement] Logged in user_id:", user.id);
  } else {
    console.log("[groupManagement] No user logged in");
  }
  const groups = await fetchGroups();
  console.log("[groupManagement] User groups:", groups);
  renderGroups(groups);
}

// Initial load
loadUserGroupsForManagement();

// Still listen for album-removed if needed
import { loadAndRenderAlbums } from "../modules/albumLoader.js";
document.addEventListener("album-removed", () => {
  loadAndRenderAlbums();
});
