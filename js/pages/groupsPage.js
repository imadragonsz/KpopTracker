// --- Caching Utilities ---
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

function isDataDifferent(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
import { fetchGroups, addGroup, updateGroup } from "../api/groupApi.js";
import { fetchAlbums } from "../api/albumApi.js";
import {
  fetchMembersByGroup,
  addMember,
  deleteMember,
  updateMember,
} from "../api/memberApi.js";
import { showGroupInfoModal } from "../components/groupModals.js";
import { showMemberInfoModal } from "../components/memberModals.js";
import { showAlbumInfoModal } from "../components/albumModals.js";
const memberImage = document.getElementById("memberImage");
// Modal and DOM element references
const editGroupModal = new bootstrap.Modal(
  document.getElementById("editGroupModal")
);
const groupInfoModal = new bootstrap.Modal(
  document.getElementById("groupInfoModal")
);
const albumInfoModal = new bootstrap.Modal(
  document.getElementById("albumInfoModal")
);
const memberInfoModal = new bootstrap.Modal(
  document.getElementById("memberInfoModal")
);
const manageMembersModal = new bootstrap.Modal(
  document.getElementById("manageMembersModal")
);
const editGroupName = document.getElementById("editGroupName");
const editGroupImage = document.getElementById("editGroupImage");
const editGroupNotes = document.getElementById("editGroupNotes");
const groupInfoBody = document.getElementById("groupInfoBody");
const albumInfoBody = document.getElementById("albumInfoBody");
const memberInfoBody = document.getElementById("memberInfoBody");
let editingGroupId = null;
let currentGroupId = null;
const membersList = document.getElementById("membersList");

async function showMembersList() {
  if (!currentGroupId) return;
  const members = await fetchMembersByGroup(currentGroupId);
  membersList.innerHTML = "";
  if (members.length === 0) {
    membersList.innerHTML =
      '<li class="list-group-item">No members found.</li>';
    return;
  }
  members.forEach((member) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center";
    let imageHtml = "";
    if (member.image) {
      imageHtml = `<img src="${member.image}" alt="Member Image" class="img-thumbnail me-2" style="max-width:40px;max-height:40px;">`;
    }
    // Capitalize first letter of name for display
    const displayName = member.name
      ? member.name.charAt(0).toUpperCase() + member.name.slice(1)
      : member.name;
    li.innerHTML = `${imageHtml}<span class="flex-grow-1">${displayName}</span>`;
    // Add edit button
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm btn-warning ms-2";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
      memberName.value = member.name;
      memberInfo.value = member.info || "";
      memberImage.value = member.image || "";
      document.getElementById("memberBirthday").value = member.birthday || "";
      document.getElementById("memberHeight").value = member.height || "";
      addMemberForm.setAttribute("data-edit-id", member.id);
    };
    li.appendChild(editBtn);
    membersList.appendChild(li);
  });
}
const addGroupForm = document.getElementById("addGroupForm");
const newGroupName = document.getElementById("newGroupName");
const newGroupImage = document.getElementById("newGroupImage");
const groupNotes = document.getElementById("groupNotes");

if (addGroupForm) {
  addGroupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = newGroupName.value.trim();
    const image = newGroupImage.value.trim();
    const notes = groupNotes.value.trim();
    if (name) {
      await addGroup(name, image, notes);
      newGroupName.value = "";
      newGroupImage.value = "";
      groupNotes.value = "";
      loadAndRenderGroups();
    }
  });
}
const groupList = document.getElementById("groupList");
const groupSortSelect = document.getElementById("groupSortSelect");
let currentGroupPage = 1;
const GROUPS_PER_PAGE = 10;

// Guard to prevent excessive reloads
let isRenderingGroups = false;

async function loadAndRenderGroups() {
  if (isRenderingGroups) return;
  isRenderingGroups = true;
  // Try cache first
  let groups = getCachedData("groups");
  let fetchedGroups = null;
  if (!Array.isArray(groups)) {
    groups = await fetchGroups();
    if (!Array.isArray(groups)) groups = [];
    setCachedData("groups", groups);
    // groups is now up to date, continue to render below
  } else {
    // Fetch in background and update cache if changed
    fetchGroups().then((fresh) => {
      if (isDataDifferent(fresh, groups)) {
        setCachedData("groups", fresh);
        // Do not trigger another reload here to avoid infinite loop
      }
    });
  }
  // Sort groups based on dropdown
  if (groupSortSelect) {
    const sortValue = groupSortSelect.value;
    groups = groups.slice();
    if (sortValue === "az") {
      groups.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortValue === "za") {
      groups.sort((a, b) => b.name.localeCompare(a.name));
    }
  }
  // Update group count display and move it to the right of groupSortSelect
  const groupCountSpan = document.getElementById("groupCount");
  const groupSortSelectEl = document.getElementById("groupSortSelect");
  if (groupCountSpan && groupSortSelectEl && groupSortSelectEl.parentNode) {
    groupCountSpan.textContent =
      groups.length + (groups.length === 1 ? " group" : " groups");
    // Move the groupCount span to the right of the groupSortSelect
    groupSortSelectEl.parentNode.appendChild(groupCountSpan);
    groupCountSpan.style.marginLeft = "0.75rem";
    groupCountSpan.style.display = "inline-block";
    groupCountSpan.style.verticalAlign = "middle";
  }
  groupList.innerHTML = "";
  // Pagination logic
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  if (currentGroupPage > totalPages) currentGroupPage = totalPages || 1;
  const startIdx = (currentGroupPage - 1) * GROUPS_PER_PAGE;
  const endIdx = startIdx + GROUPS_PER_PAGE;
  const pageGroups = groups.slice(startIdx, endIdx);

  pageGroups.forEach((group) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center py-3";
    li.style.cursor = "pointer";
    let imageHtml = "";
    if (group.image) {
      imageHtml = `<img src="${group.image}" alt="Group Image" class="img-thumbnail me-3" style="max-width:120px;max-height:120px;">`;
    }
    li.innerHTML = `${imageHtml}<span class="flex-grow-1 fs-5">${group.name}</span>
      <button class="btn btn-sm btn-warning ms-auto edit-group-btn" data-id="${group.id}">Edit</button>`;
    li.setAttribute("data-id", group.id);
    // Edit button event
    li.querySelector(".edit-group-btn").addEventListener(
      "click",
      async function (e) {
        e.stopPropagation();
        const groups = await fetchGroups();
        const g = groups.find((gr) => gr.id == group.id);
        if (g) {
          editGroupName.value = g.name;
          editGroupImage.value = g.image || "";
          editGroupNotes.value = g.notes || "";
          editingGroupId = g.id;
          // Hide any open modals before showing
          if (editGroupModal._isShown) {
            editGroupModal.hide();
            // Focus main add group button after hiding
            setTimeout(() => {
              const addBtn = document.querySelector(
                'button[type="submit"].btn-info'
              );
              if (addBtn) addBtn.focus();
              else document.body.focus();
            }, 350);
          }
          editGroupModal.show();
          setTimeout(() => {
            editGroupName.focus();
          }, 300);
        }
      }
    );
    document.addEventListener("DOMContentLoaded", function () {
      const editGroupForm = document.getElementById("editGroupForm");
      if (editGroupForm) {
        editGroupForm.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!editingGroupId) return;
          const name = editGroupName.value.trim();
          const image = editGroupImage.value.trim();
          const notes = editGroupNotes.value.trim();
          updateGroup(editingGroupId, name, image, notes).then(() => {
            editGroupModal.hide();
            loadAndRenderGroups();
          });
        });
      }
    });
    // Group info event
    li.addEventListener("click", async function (e) {
      if (e.target.classList.contains("edit-group-btn")) return;
      const groups = getCachedData("groups") || (await fetchGroups());
      const g = groups.find((gr) => gr.id == group.id);
      if (g) {
        // Albums: cache
        let albums = getCachedData("albums");
        if (!albums) {
          albums = await fetchAlbums();
          setCachedData("albums", albums);
        } else {
          fetchAlbums().then((fresh) => {
            if (isDataDifferent(fresh, albums)) {
              setCachedData("albums", fresh);
            }
          });
        }
        Promise.all([
          fetchMembersByGroup(g.id),
          Promise.resolve(albums.filter((a) => a.group === g.name)),
        ]).then(([members, albums]) => {
          showGroupInfoModal(g, members, albums, {
            onShow: () => groupInfoModal.show(),
            onManageMembers: () => {
              groupInfoModal.hide();
              setTimeout(() => {
                currentGroupId = g.id;
                showMembersList();
                manageMembersModal.show();
                // Focus main container or body after hiding group info modal
                setTimeout(() => {
                  const mainContainer = document.querySelector(".container");
                  if (mainContainer) mainContainer.focus();
                  else document.body.focus();
                }, 350);
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
                    albumInfoBody &&
                      albumInfoBody.focus &&
                      albumInfoBody.focus();
                  }, 350);
                }, 300);
              }
            },
            onMemberClick: (memberId) => {
              const member = members.find((m) => m.id == memberId);
              if (member) {
                groupInfoModal.hide();
                setTimeout(() => {
                  showMemberInfoModal(member);
                  memberInfoModal.show();
                  // Focus member info modal after hiding group info
                  setTimeout(() => {
                    memberInfoBody &&
                      memberInfoBody.focus &&
                      memberInfoBody.focus();
                  }, 350);
                }, 300);
              }
            },
          });
        });
      }
    });
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
      loadAndRenderGroups();
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
      loadAndRenderGroups();
    };
    paginationDiv.appendChild(nextBtn);
  }
  if (!document.getElementById("groupPagination")) {
    groupList.parentNode.appendChild(paginationDiv);
  }
  isRenderingGroups = false;
}

addMemberForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!currentGroupId) return;
  const name = memberName.value.trim();
  const info = memberInfo.value.trim();
  const image = memberImage.value.trim();
  const birthday = document.getElementById("memberBirthday").value;
  const height = document.getElementById("memberHeight").value;
  const editId = addMemberForm.getAttribute("data-edit-id");
  if (name) {
    if (editId) {
      updateMember(editId, name, info, image, birthday, height).then(() => {
        memberName.value = "";
        memberInfo.value = "";
        memberImage.value = "";
        document.getElementById("memberBirthday").value = "";
        document.getElementById("memberHeight").value = "";
        addMemberForm.removeAttribute("data-edit-id");
        showMembersList();
      });
    } else {
      addMember(currentGroupId, name, info, image, birthday, height).then(
        () => {
          memberName.value = "";
          memberInfo.value = "";
          memberImage.value = "";
          document.getElementById("memberBirthday").value = "";
          document.getElementById("memberHeight").value = "";
          showMembersList();
        }
      );
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const editGroupForm = document.getElementById("editGroupForm");
  if (editGroupForm) {
    editGroupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!editingGroupId) return;
      const name = editGroupName.value.trim();
      const image = editGroupImage.value.trim();
      const notes = editGroupNotes.value.trim();
      updateGroup(editingGroupId, name, image, notes).then(() => {
        editGroupModal.hide();
        loadAndRenderGroups();
      });
    });
  }
});
if (groupSortSelect) {
  groupSortSelect.addEventListener("change", loadAndRenderGroups);
}
loadAndRenderGroups();
// Check for ?group= in URL and open group info modal if present
const params = new URLSearchParams(window.location.search);
const groupName = params.get("group");
if (groupName) {
  const groups = getCachedData("groups") || (await fetchGroups());
  const g = groups.find((gr) => gr.name === groupName);
  if (g) {
    // Albums: cache
    let albums = getCachedData("albums");
    if (!albums) {
      albums = await fetchAlbums();
      setCachedData("albums", albums);
    } else {
      fetchAlbums().then((fresh) => {
        if (isDataDifferent(fresh, albums)) {
          setCachedData("albums", fresh);
        }
      });
    }
    Promise.all([
      fetchMembersByGroup(g.id),
      Promise.resolve(albums.filter((a) => a.group === g.name)),
    ]).then(([members, albums]) => {
      showGroupInfoModal(g, members, albums, {
        onShow: () => groupInfoModal.show(),
        onManageMembers: () => {
          groupInfoModal.hide();
          setTimeout(() => {
            currentGroupId = g.id;
            showMembersList();
            manageMembersModal.show();
          }, 300);
        },
        onAlbumClick: (albumId) => {
          const album = albums.find((a) => a.id == albumId);
          if (album) {
            groupInfoModal.hide();
            setTimeout(() => {
              showAlbumInfoModal(album);
              albumInfoModal.show();
            }, 300);
          }
        },
        onMemberClick: (memberId) => {
          const member = members.find((m) => m.id == memberId);
          if (member) {
            groupInfoModal.hide();
            setTimeout(() => {
              showMemberInfoModal(member);
              memberInfoModal.show();
            }, 300);
          }
        },
      });
    });
  }
}
