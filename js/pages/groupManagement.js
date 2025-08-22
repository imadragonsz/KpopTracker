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

// --- Modal Utility Functions ---
function showModalById(id) {
  const modalEl = document.getElementById(id);
  if (modalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
    return modal;
  }
}
function hideModalById(id) {
  const modalEl = document.getElementById(id);
  if (modalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
    return modal;
  }
}

// --- Imports & Globals ---
import { fetchGroups, updateGroup } from "../api/groupApi.js";
import { getCurrentUser } from "../auth.js";
import { removeUserFromGroup } from "../api/groupApi.js";
import { showGroupInfoModal } from "../components/groupModals.js";
import { fetchAlbums } from "../api/albumApi.js";
import { fetchMembersByGroup } from "../api/memberApi.js";
import { showMemberInfoModal } from "../components/memberModals.js";
import { updateMember } from "../api/memberApi.js";
window.updateGroup = updateGroup;

// --- Pagination and Sorting ---
let currentGroupPage = 1;
const GROUPS_PER_PAGE = 10;

// --- Render Groups ---
function renderGroups(groups) {
  const groupList = document.getElementById("groupList");
  groupList.innerHTML = "";
  // Sorting
  const groupSortSelect = document.getElementById("groupSortSelect");
  if (groupSortSelect) {
    const sortValue = groupSortSelect.value;
    groups = groups.slice();
    if (sortValue === "az") groups.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === "za")
      groups.sort((a, b) => b.name.localeCompare(a.name));
  }
  // Update group count
  const groupCountElem = document.getElementById("groupCount");
  if (groupCountElem) {
    groupCountElem.innerHTML = `<i class="bi bi-people-fill me-1"></i> ${groups.length}`;
  }
  // Pagination
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  if (currentGroupPage > totalPages) currentGroupPage = totalPages || 1;
  const startIdx = (currentGroupPage - 1) * GROUPS_PER_PAGE;
  const endIdx = startIdx + GROUPS_PER_PAGE;
  const pageGroups = groups.slice(startIdx, endIdx);

  pageGroups.forEach((group) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center py-3";
    li.style.cursor = "pointer";
    let imageHtml = group.image
      ? `<img src="${group.image}" alt="Group Image" class="img-thumbnail me-3" style="max-width:90px;max-height:90px;">`
      : `<img src="/assets/images/default-group.png" alt="Group Image" class="img-thumbnail me-3" style="max-width:90px;max-height:90px;">`;
    li.innerHTML = `${imageHtml}<span class="flex-grow-1 fs-5">${group.name}</span>
      <button class="btn btn-sm btn-warning ms-auto edit-group-btn" data-id="${group.id}">Edit</button>
      <button class="btn btn-sm btn-danger ms-2 remove-group-btn" data-id="${group.id}">Remove</button>`;
    li.setAttribute("data-id", group.id);

    // Card click event to open group info modal
    li.addEventListener("click", async function (e) {
      if (
        e.target.classList.contains("edit-group-btn") ||
        e.target.classList.contains("remove-group-btn")
      )
        return;
      const [members, albums] = await Promise.all([
        fetchMembersByGroup(group.id),
        fetchAlbums(),
      ]);
      const groupAlbums = albums.filter((a) => a.group === group.name);
      showGroupInfoModal(group, members, groupAlbums, {
        onShow: () => showModalById("groupInfoModal"),
        onManageMembers: () => {
          hideModalById("groupInfoModal");
          setTimeout(() => {
            window.currentGroupId = group.id;
            if (typeof window.showMembersList === "function")
              window.showMembersList();
            showModalById("manageMembersModal");
          }, 300);
        },
        onManageMembers: () => {
          hideModalById("groupInfoModal");
          setTimeout(() => {
            if (typeof window.showMemberManagementModal === "function") {
              window.showMemberManagementModal(
                members,
                async (updatedMember) => {
                  const memberToEdit = members.find(
                    (m) => m.name === updatedMember.name
                  );
                  if (memberToEdit) {
                    await updateMember(
                      memberToEdit.id,
                      updatedMember.name,
                      updatedMember.info,
                      updatedMember.image,
                      updatedMember.birthday,
                      updatedMember.height
                    );
                    const refreshedMembers = await fetchMembersByGroup(
                      group.id
                    );
                    members.length = 0;
                    members.push(...refreshedMembers);
                  }
                }
              );
            }
          }, 300);
        },
        onAlbumClick: (albumId) => {
          const album = albums.find((a) => a.id == albumId);
          if (album) {
            groupInfoModal.hide();
            setTimeout(() => {
              showAlbumInfoModal(album);
              albumInfoModal.show();
              // Focus album info modal after hiding group info
              setTimeout(() => {
                albumInfoBody && albumInfoBody.focus && albumInfoBody.focus();
              }, 350);
            }, 300);
          }
        },
        onMemberClick: (memberId) => {
          const member = members.find(
            (m) => m.id == memberId || m.id == +memberId
          );
          if (member) showMemberInfoModal(member);
          else
            console.warn("[onMemberClick] Member not found for id:", memberId);
        },
      });
    });

    // Edit button event
    li.querySelector(".edit-group-btn").addEventListener(
      "click",
      async function (e) {
        e.stopPropagation();
        // Ensure the edit group modal is present
        if (
          typeof import("../components/editGroupModal.js").then === "function"
        ) {
          const { ensureEditGroupModal } = await import(
            "../components/editGroupModal.js"
          );
          ensureEditGroupModal();
        }
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
            showModalById("editGroupModal");
            setTimeout(() => editGroupName.focus(), 300);
          }
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

  // Pagination controls
  const paginationDiv =
    document.getElementById("groupPagination") || document.createElement("div");
  paginationDiv.id = "groupPagination";
  paginationDiv.className =
    "d-flex justify-content-center align-items-center mt-3";
  paginationDiv.innerHTML = "";
  if (totalPages > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-secondary me-2";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = currentGroupPage === 1;
    prevBtn.onclick = () => {
      currentGroupPage--;
      loadUserGroupsForManagement();
    };
    paginationDiv.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${currentGroupPage} of ${totalPages}`;
    pageInfo.className = "mx-2";
    paginationDiv.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-secondary ms-2";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentGroupPage === totalPages;
    nextBtn.onclick = () => {
      currentGroupPage++;
      loadUserGroupsForManagement();
    };
    paginationDiv.appendChild(nextBtn);
  }
  if (!document.getElementById("groupPagination")) {
    groupList.parentNode.appendChild(paginationDiv);
  }
}

// --- Load Groups ---
async function loadUserGroupsForManagement() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      renderGroups([]);
      return;
    }
    let groups = getCachedData("groups");
    if (!Array.isArray(groups)) {
      try {
        groups = await fetchGroups();
      } catch {
        groups = [];
      }
      if (!Array.isArray(groups)) groups = [];
      setCachedData("groups", groups);
    } else {
      fetchGroups().then((fresh) => {
        if (isDataDifferent(fresh, groups)) setCachedData("groups", fresh);
      });
    }
    renderGroups(groups);
  } catch {
    renderGroups([]);
  }
}

// --- Edit Group Modal Submit Handler ---
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
      hideModalById("editGroupModal");
      await loadUserGroupsForManagement();
    });
  }
});

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  // Add group form submit handler using event delegation for robustness
  document.body.addEventListener("submit", async function (e) {
    const form = e.target;
    if (form && form.id === "addGroupForm") {
      e.preventDefault();
      // debugger; // Removed for production
      const name = document.getElementById("groupName").value.trim();
      const image = document.getElementById("groupImage").value.trim();
      const notes = document.getElementById("groupNotes").value.trim();
      // Persist debug info to localStorage for post-reload inspection
      const debugLog = { name, image, notes, ts: new Date().toISOString() };
      try {
        localStorage.setItem("addGroupDebug", JSON.stringify(debugLog));
      } catch {}
      console.log("[AddGroup] Form submit (delegated):", debugLog);
      if (!name) {
        console.warn("[AddGroup] No group name provided, aborting.");
        return;
      }
      // Dynamically import addGroup if not already available
      let addGroupFn = null;
      try {
        const mod = await import("../api/groupApi.js");
        addGroupFn = mod.addGroup;
        console.log("[AddGroup] addGroup function loaded:", typeof addGroupFn);
      } catch (err) {
        console.error("[AddGroup] Failed to import addGroup:", err);
        return;
      }
      try {
        const result = await addGroupFn(name, image, notes);
        console.log("[AddGroup] addGroup result:", result);
        if (result && !result.error) {
          // Clear form
          form.reset();
          document.getElementById("groupImage").value = "";
          document.getElementById("groupImageUploadStatus").textContent = "";
          // Invalidate cache and reload
          if (window.localStorage) localStorage.removeItem("groups");
          await fetchAndRenderGroups();
        } else {
          alert("Failed to add group. Please try again.");
        }
      } catch (err) {
        console.error("[AddGroup] Error calling addGroup:", err);
        alert("Failed to add group. See console for details.");
      }
    }
  });
  const groupSortSelect = document.getElementById("groupSortSelect");
  if (groupSortSelect) {
    groupSortSelect.addEventListener("change", loadUserGroupsForManagement);
  }

  // Add event listener for group image picker button
  const showGroupImageModalBtn = document.getElementById("showGroupImageModal");
  if (showGroupImageModalBtn) {
    showGroupImageModalBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      const groupNameInput = document.getElementById("groupName");
      const groupName = groupNameInput ? groupNameInput.value.trim() : "";
      if (!groupName) {
        const status = document.getElementById("groupImageUploadStatus");
        if (status) status.textContent = "Please enter a group name first.";
        groupNameInput && groupNameInput.focus();
        return;
      }
      // Dynamically import and show the gallery modal, always passing the current group name
      const { showGalleryModal } = await import(
        "../components/galleryModal.js"
      );
      showGalleryModal({
        title: "Select or Upload Group Image",
        groupName,
        onSelect: (imgUrl) => {
          // Set the selected image URL in the hidden input
          const input = document.getElementById("groupImage");
          if (input) input.value = imgUrl;
          // Show status/preview
          const status = document.getElementById("groupImageUploadStatus");
          if (status) {
            status.innerHTML = `<span class='text-success'>Image selected!</span><br><img src='${imgUrl}' alt='Group Image' style='max-width:80px;max-height:80px;margin-top:4px;'>`;
          }
        },
      });
    });
  }

  // Add search functionality
  const searchInput = document.getElementById("searchGroupInput");
  let allGroups = [];
  async function fetchAndRenderGroups() {
    const user = await getCurrentUser();
    if (!user) {
      renderGroups([]);
      return;
    }
    let groups = getCachedData("groups");
    if (!Array.isArray(groups)) {
      try {
        groups = await fetchGroups();
      } catch {
        groups = [];
      }
      if (!Array.isArray(groups)) groups = [];
      setCachedData("groups", groups);
    } else {
      fetchGroups().then((fresh) => {
        if (isDataDifferent(fresh, groups)) setCachedData("groups", fresh);
      });
    }
    allGroups = groups;
    renderGroups(groups);
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const value = searchInput.value.trim().toLowerCase();
      const filtered = allGroups.filter((g) =>
        g.name.toLowerCase().includes(value)
      );
      renderGroups(filtered);
    });
  }

  // Initial load
  fetchAndRenderGroups();
});

// --- Album Removed Event (if needed) ---
import { loadAndRenderAlbums } from "../modules/albumLoader.js";
document.addEventListener("album-removed", () => {
  loadAndRenderAlbums();
});
