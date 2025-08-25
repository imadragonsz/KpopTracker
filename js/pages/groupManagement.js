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
import {
  showMemberInfoModal,
  showMemberManagementModal,
} from "../components/memberModals.js";
window.showMemberManagementModal = showMemberManagementModal;
import { updateMember, addMember } from "../api/memberApi.js";
window.updateGroup = updateGroup;
import { loadAndRenderAlbums } from "../modules/albumLoader.js";

// --- Pagination and Sorting ---
let currentGroupPage = 1;
const GROUPS_PER_PAGE = 10;

// --- Load Groups for Management ---
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

// --- Render Groups ---
function renderGroups(groups) {
  (async () => {
    const { checkAdminStatus } = await import("../components/adminCheck.js");
    const isAdmin = await checkAdminStatus();
    const groupList = document.getElementById("groupList");
    // Remove old flex row if present
    const oldFlexRow = document.getElementById("groupCardsFlexRow");
    if (oldFlexRow) oldFlexRow.remove();

    // Pagination logic
    const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
    if (currentGroupPage > totalPages) currentGroupPage = totalPages || 1;
    const startIdx = (currentGroupPage - 1) * GROUPS_PER_PAGE;
    const endIdx = startIdx + GROUPS_PER_PAGE;
    const pageGroups = groups.slice(startIdx, endIdx);

    // Modern card layout (flex row)
    const flexRow = document.createElement("div");
    flexRow.className = "d-flex align-items-stretch flex-wrap gap-3 mb-3 justify-content-center";
    flexRow.id = "groupCardsFlexRow";
    pageGroups.forEach((group) => {
      const cardCol = document.createElement("div");
      cardCol.style.width = "220px";
      cardCol.style.flex = "0 0 220px";
      cardCol.style.display = "flex";
      cardCol.style.flexDirection = "column";
      cardCol.style.alignItems = "stretch";
      const cardHtml = `
        <div class="card h-100 shadow-sm" style="width: 220px; cursor:pointer; position:relative;">
          <img src="${group.image || "../assets/images/default_album.png"}" class="card-img-top browse-group-img" alt="${group.name}">
          <div class="card-body d-flex flex-column p-2">
            <h6 class="card-title mb-1">${group.name}</h6>
            <p class="card-text mb-1"><span class="fw-bold">Debut:</span> ${group.debutDate || group.debut_year || "—"}</p>
            <div class="d-flex gap-2 mt-2">
              ${isAdmin ? `<button class="btn btn-sm btn-warning edit-group-btn flex-fill" data-id="${group.id}"><i class="bi bi-pencil"></i></button>` : ""}
              <button class="btn btn-sm btn-danger remove-group-btn flex-fill" data-id="${group.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      `;
      cardCol.innerHTML = cardHtml;

      // Card click event to open group info modal
      cardCol.querySelector(".card").addEventListener("click", async function (e) {
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
              if (typeof window.showMemberManagementModal === "function") {
                async function handleMemberSave(updatedMember) {
                  let memberToEdit = members.find((m) => m.name === updatedMember.name);
                  if (memberToEdit) {
                    await updateMember(
                      memberToEdit.id,
                      updatedMember.name,
                      updatedMember.info,
                      updatedMember.image,
                      updatedMember.birthday,
                      updatedMember.height
                    );
                  } else {
                    if (typeof addMember === "function") {
                      await addMember(
                        group.id,
                        updatedMember.name,
                        updatedMember.info,
                        updatedMember.image,
                        updatedMember.birthday,
                        updatedMember.height
                      );
                    }
                  }
                  const refreshedMembers = await fetchMembersByGroup(group.id);
                  members.length = 0;
                  members.push(...refreshedMembers);
                  window.showMemberManagementModal(members, handleMemberSave);
                }
                window.showMemberManagementModal(members, handleMemberSave);
              }
            }, 300);
          },
          onAlbumClick: (albumId) => {},
          onMemberClick: (memberId) => {},
        });
      });

      // Edit button event (only if admin)
      if (isAdmin) {
        const editBtn = cardCol.querySelector(".edit-group-btn");
        if (editBtn) {
          editBtn.addEventListener(
            "click",
            async function (e) {
              e.stopPropagation();
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
        }
      }
      // Remove button event (delegated outside, but can be added here if needed)
      flexRow.appendChild(cardCol);
    });

    groupList.appendChild(flexRow);

    // Event delegation for remove-group-btn
    // Remove previous event listener if any
    if (groupList._removeGroupHandler) {
      groupList.removeEventListener("click", groupList._removeGroupHandler);
    }
    groupList._removeGroupHandler = async function (e) {
      const btn = e.target.closest(".remove-group-btn");
      if (btn) {
        e.stopPropagation();
        const groupId = btn.getAttribute("data-id");
        if (!groupId) return;
        if (!confirm("Are you sure you want to remove this group? This cannot be undone.")) return;
        try {
          await removeUserFromGroup(groupId);
          // Remove group from cache and refresh
          let groups = getCachedData("groups") || [];
          groups = groups.filter(g => g.id != groupId);
          setCachedData("groups", groups);
          await loadUserGroupsForManagement();
        } catch (err) {
          alert("Failed to remove group. See console for details.");
          console.error("[RemoveGroup] Error:", err);
        }
      }
    };
    groupList.addEventListener("click", groupList._removeGroupHandler);

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
  })();
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
      const name = document.getElementById("groupName").value.trim();
      const image = document.getElementById("groupImage").value.trim();
      const notes = document.getElementById("groupNotes").value.trim();
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
          form.reset();
          document.getElementById("groupImage").value = "";
          document.getElementById("groupImageUploadStatus").textContent = "";
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
      const { showGalleryModal } = await import(
        "../components/galleryModal.js"
      );
      showGalleryModal({
        title: "Select or Upload Group Image",
        groupName,
        onSelect: (imgUrl) => {
          const input = document.getElementById("groupImage");
          if (input) input.value = imgUrl;
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
document.addEventListener("album-removed", () => {
  loadAndRenderAlbums();
});