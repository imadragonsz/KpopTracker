window.__groupManagementLoaded = true;
console.log("[GroupMgmt] groupManagement.js loaded");
// Attach submit handler for edit group modal form
// Attach submit handler for edit group modal form
document.addEventListener("DOMContentLoaded", function () {
  const editGroupForm = document.getElementById("editGroupForm");
  if (editGroupForm) {
    editGroupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("editGroupName").value.trim();
      const image = document.getElementById("editGroupImage").value.trim();
      const notes = document.getElementById("editGroupNotes").value.trim();
      const groupId = window.editingGroupId;
      if (!groupId || !name) return;
      await window.updateGroup(groupId, name, image, notes);
      // Hide modal after save
      const modalEl = document.getElementById("editGroupModal");
      if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        const editGroupModal =
          window.bootstrap.Modal.getOrCreateInstance(modalEl);
        editGroupModal.hide();
      }
      // Refresh group list
      await loadUserGroupsForManagement();
    });
  }
});
// groupManagement.js
// Use fetchGroups to load only the user's groups and log for debugging

import { fetchGroups, updateGroup } from "../api/groupApi.js";
import { getCurrentUser } from "../auth.js";

import { removeUserFromGroup } from "../api/groupApi.js";

// Expose updateGroup globally for modal/gallery integration
window.updateGroup = updateGroup;

function renderGroups(groups) {
  const groupList = document.getElementById("groupList");
  groupList.innerHTML = "";
  groups.forEach((group) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center py-3";
    li.style.cursor = "pointer";
    let imageHtml = "";
    if (group.image) {
      imageHtml = `<img src="${group.image}" alt="Group Image" class="img-thumbnail me-3" style="max-width:120px;max-height:120px;">`;
    } else {
      imageHtml = `<img src="/assets/images/default-group.png" alt="Group Image" class="img-thumbnail me-3" style="max-width:120px;max-height:120px;">`;
    }
    li.innerHTML = `${imageHtml}<span class="flex-grow-1 fs-5">${group.name}</span>
      <button class="btn btn-sm btn-warning ms-auto edit-group-btn" data-id="${group.id}">Edit</button>
      <button class="btn btn-sm btn-danger ms-2 remove-group-btn" data-id="${group.id}">Remove</button>`;
    li.setAttribute("data-id", group.id);
    // Edit button event
    li.querySelector(".edit-group-btn").addEventListener(
      "click",
      async function (e) {
        console.log("[Edit Modal] Edit button clicked for group:", group.id);
        e.stopPropagation();
        const groups = await fetchGroups();
        const g = groups.find((gr) => gr.id == group.id);
        if (g) {
          const editGroupName = document.getElementById("editGroupName");
          const editGroupImage = document.getElementById("editGroupImage");
          const editGroupNotes = document.getElementById("editGroupNotes");
          if (editGroupName && editGroupImage && editGroupNotes) {
            editGroupName.value = g.name;
            editGroupImage.value = g.image || "";
            editGroupNotes.value = g.notes || "";
            window.editingGroupId = g.id;
            const modalEl = document.getElementById("editGroupModal");
            console.log(
              "[Edit Modal] modalEl:",
              modalEl,
              "Bootstrap:",
              window.bootstrap
            );
            if (modalEl && window.bootstrap && window.bootstrap.Modal) {
              const editGroupModal =
                window.bootstrap.Modal.getOrCreateInstance(modalEl);
              editGroupModal.show();
              setTimeout(() => {
                editGroupName.focus();
              }, 300);
              console.log("[Edit Modal] Modal should now be shown.");
            } else {
              console.warn(
                "[Edit Modal] Modal element or Bootstrap not found."
              );
            }
          } else {
            console.warn("[Edit Modal] One or more form fields missing.");
          }
        } else {
          console.warn("[Edit Modal] Group not found for id:", group.id);
        }
      }
    );
    // Remove button event
    li.querySelector(".remove-group-btn").addEventListener(
      "click",
      async function (e) {
        e.stopPropagation();
        if (
          confirm(
            "Are you sure you want to remove this group from your collection?"
          )
        ) {
          try {
            await removeUserFromGroup(group.id);
            await loadUserGroupsForManagement();
          } catch (err) {
            alert("Failed to remove group. See console for details.");
          }
        }
      }
    );
    groupList.appendChild(li);
  });
}

async function loadUserGroupsForManagement() {
  try {
    const user = await getCurrentUser();
    console.debug("[GroupMgmt] Current user:", user);
    if (!user) {
      console.warn("[GroupMgmt] No user found, not loading groups.");
      renderGroups([]);
      return;
    }
    const groups = await fetchGroups();
    console.debug("[GroupMgmt] Groups fetched:", groups);
    renderGroups(groups);
  } catch (err) {
    console.error("[GroupMgmt] Error loading groups:", err);
    renderGroups([]);
  }
}

// Initial load
loadUserGroupsForManagement();

// Still listen for album-removed if needed
import { loadAndRenderAlbums } from "../modules/albumLoader.js";
document.addEventListener("album-removed", () => {
  loadAndRenderAlbums();
});
