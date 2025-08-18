// browsePage.js
// Browse all groups and albums, add to user's collection
import {
  fetchAllGroups,
  fetchAllAlbums,
  addAlbumToUser,
  addGroupToUser,
} from "../api/browseApi.js";
import { fetchAlbums } from "../api/albumApi.js";
import { showLoading, hideLoading } from "../components/loading.js";

const browseResults = document.getElementById("browseResults");
// Add a container for group cards row
let browseGroupCardsRow = document.getElementById("browseGroupCardsRow");
if (!browseGroupCardsRow) {
  browseGroupCardsRow = document.createElement("div");
  browseGroupCardsRow.id = "browseGroupCardsRow";
  browseResults.parentNode.insertBefore(browseGroupCardsRow, browseResults);
}
const browseSearchInput = document.getElementById("browseSearchInput");

let allGroups = [];
let allAlbums = [];

let filteredAlbums = [];
let userAlbums = [];
let userGroups = [];
let selectedGroup = null;
let currentPage = 1;
const pageSize = 5; // Number of albums per page
let groupPage = 1;
const groupPageSize = 4;

async function loadBrowseData() {
  showLoading();
  allGroups = await fetchAllGroups();
  allAlbums = await fetchAllAlbums();
  userAlbums = await fetchAlbums();
  // Try to get user's groups if available
  // Use fetchGroups from groupApi.js to get only the user's groups
  const { fetchGroups } = await import("../api/groupApi.js");
  userGroups = await fetchGroups();
  // renderGroupSelect(); // Removed, handled by group cards row
  renderGroupCardsRow();
  renderResults();
  hideLoading();
}

function renderGroupCardsRow() {
  // Pagination logic for groups
  const totalGroupPages = Math.max(
    1,
    Math.ceil(allGroups.length / groupPageSize)
  );
  if (groupPage > totalGroupPages) groupPage = totalGroupPages;
  const startIdx = (groupPage - 1) * groupPageSize;
  const endIdx = startIdx + groupPageSize;
  const pageGroups = allGroups.slice(startIdx, endIdx);

  browseGroupCardsRow.innerHTML = "";
  if (!allGroups.length) {
    browseGroupCardsRow.innerHTML =
      '<div class="text-center text-muted">No groups found.</div>';
    console.warn("[Browse Debug] No groups found to display.");
    return;
  }
  // Horizontal scrollable row container
  const row = document.createElement("div");
  row.className =
    "d-flex flex-row overflow-auto gap-3 mb-3 justify-content-center";
  row.style.whiteSpace = "nowrap";
  row.style.scrollBehavior = "smooth";

  // Add 'All Groups' card as the first card
  const allCard = document.createElement("div");
  allCard.style.minWidth = "220px";
  allCard.style.maxWidth = "220px";
  allCard.style.flex = "0 0 auto";
  allCard.innerHTML = `
    <div class="card h-100 shadow-sm${
      selectedGroup === null ? " border-primary border-2" : ""
    }" style="width: 100%; cursor:pointer;">
      <div class="card-body d-flex flex-column align-items-center justify-content-center p-2" style="height: 180px;">
        <h6 class="card-title mb-1">All Groups</h6>
      </div>
    </div>
  `;
  allCard.addEventListener("click", () => {
    selectedGroup = null;
    currentPage = 1;
    renderGroupCardsRow();
    renderResults();
  });
  row.appendChild(allCard);

  pageGroups.forEach((group) => {
    const cardWrapper = document.createElement("div");
    cardWrapper.style.minWidth = "220px";
    cardWrapper.style.maxWidth = "220px";
    cardWrapper.style.flex = "0 0 auto";
    // Check if group is already in user's collection (by id or unique fields)
    const alreadyOwned = userGroups.some(
      (ug) => ug.id === group.id || ug.name === group.name
    );
    // Highlight if selected
    const isSelected = selectedGroup === group.name;
    cardWrapper.innerHTML = `
      <div class="card h-100 shadow-sm${
        isSelected ? " border-primary border-2" : ""
      }" style="width: 100%; cursor:pointer;">
        <img src="${
          group.image || "../assets/images/default_album.png"
        }" class="card-img-top" alt="${
      group.name
    }" style="object-fit:contain;width:100%;height:140px;background:transparent;">
        <div class="card-body d-flex flex-column p-2">
          <h6 class="card-title mb-1">${group.name}</h6>
          <p class="card-text mb-1"><span class="fw-bold">Debut:</span> ${
            group.debut_year || "—"
          }</p>
          ${
            alreadyOwned
              ? '<div class="alert alert-success py-1 px-2 mb-2">Already in your collection</div>'
              : `<button class="btn btn-info btn-sm mt-auto add-to-group-collection-btn" data-group-id="${group.id}">Add Group</button>`
          }
        </div>
      </div>
    `;
    // Only set filter if not clicking the Add Group button
    cardWrapper.addEventListener("click", (e) => {
      if (e.target.closest(".add-to-group-collection-btn")) return;
      selectedGroup = group.name;
      currentPage = 1;
      renderGroupCardsRow();
      renderResults();
    });
    row.appendChild(cardWrapper);
  });
  browseGroupCardsRow.appendChild(row);

  // Pagination controls
  const pagination = document.createElement("div");
  pagination.className =
    "d-flex justify-content-center align-items-center gap-2";
  pagination.innerHTML = `
    <button class="btn btn-outline-secondary btn-sm" id="browsePrevGroupPage" ${
      groupPage === 1 ? "disabled" : ""
    }>Prev</button>
    <span class="mx-2">Page ${groupPage} of ${totalGroupPages}</span>
    <button class="btn btn-outline-secondary btn-sm" id="browseNextGroupPage" ${
      groupPage === totalGroupPages ? "disabled" : ""
    }>Next</button>
  `;
  browseGroupCardsRow.appendChild(pagination);

  // Add event listeners for group pagination
  setTimeout(() => {
    const prevBtn = document.getElementById("browsePrevGroupPage");
    const nextBtn = document.getElementById("browseNextGroupPage");
    if (prevBtn)
      prevBtn.onclick = () => {
        if (groupPage > 1) {
          groupPage--;
          renderGroupCardsRow();
        }
      };
    if (nextBtn)
      nextBtn.onclick = () => {
        if (groupPage < totalGroupPages) {
          groupPage++;
          renderGroupCardsRow();
        }
      };
  }, 0);
}

function renderResults() {
  const search = browseSearchInput.value.trim().toLowerCase();
  const group = selectedGroup;
  // Always start with all albums from the database
  filteredAlbums = allAlbums.filter((a) => {
    // Only filter by group if a group is selected
    const matchesGroup = !group || a.group === group;
    // Always allow search
    const matchesSearch =
      a.album.toLowerCase().includes(search) ||
      a.group.toLowerCase().includes(search);
    return matchesGroup && matchesSearch;
  });
  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredAlbums.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageAlbums = filteredAlbums.slice(startIdx, endIdx);

  browseResults.innerHTML = "";
  if (!filteredAlbums.length) {
    browseResults.innerHTML =
      '<div class="text-center text-muted">No albums found.</div>';
    console.warn("[Browse Debug] No albums found to display.");
    return;
  }

  // Horizontal scrollable row container
  const row = document.createElement("div");
  row.className =
    "d-flex flex-row overflow-auto gap-3 mb-3 justify-content-center";
  row.style.whiteSpace = "nowrap";
  row.style.scrollBehavior = "smooth";

  pageAlbums.forEach((album) => {
    const cardWrapper = document.createElement("div");
    cardWrapper.style.minWidth = "220px";
    cardWrapper.style.maxWidth = "220px";
    cardWrapper.style.flex = "0 0 auto";
    // Check if album is already in user's collection (by id or unique fields)
    const alreadyOwned = userAlbums.some(
      (ua) =>
        ua.id === album.id ||
        (ua.album === album.album && ua.group === album.group)
    );
    cardWrapper.innerHTML = `
      <div class="card h-100 shadow-sm" style="width: 100%; cursor:pointer;">
        <img src="${
          album.image || "../assets/images/default_album.png"
        }" class="card-img-top" alt="${
      album.album
    }" style="object-fit:contain;width:100%;height:140px;background:transparent;">
        <div class="card-body d-flex flex-column p-2">
          <h6 class="card-title mb-1">${album.album}</h6>
          <p class="card-text mb-1"><span class="fw-bold">Group:</span> ${
            album.group
          }</p>
          <p class="card-text mb-1"><span class="fw-bold">Year:</span> ${
            album.year
          }</p>
          ${
            alreadyOwned
              ? '<div class="alert alert-success py-1 px-2 mb-2">Already in your collection</div>'
              : `<button class="btn btn-info btn-sm mt-auto add-to-collection-btn" data-album-id="${album.id}">Add to My Collection</button>`
          }
        </div>
      </div>
    `;
    // Open album info modal on card click, but not if Add to My Collection button is clicked
    cardWrapper.addEventListener("click", async (e) => {
      if (e.target.closest(".add-to-collection-btn")) {
        console.log(
          "[BrowsePage] Clicked Add to My Collection button, not opening modal."
        );
        return;
      }
      try {
        const { showAlbumInfoModal } = await import(
          "../components/albumModals.js"
        );
        console.log(
          "[BrowsePage] showAlbumInfoModal loaded:",
          typeof showAlbumInfoModal
        );
        showAlbumInfoModal(album);
        // Show the Bootstrap modal after content is set
        const modalEl = document.getElementById("albumInfoModal");
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
          const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.show();
        } else {
          console.warn("[BrowsePage] Bootstrap modal not found or not loaded.");
        }
      } catch (err) {
        console.error("[BrowsePage] Error opening album info modal:", err);
      }
    });
    row.appendChild(cardWrapper);
  });
  browseResults.appendChild(row);

  // Pagination controls
  const pagination = document.createElement("div");
  pagination.className =
    "d-flex justify-content-center align-items-center gap-2";
  pagination.innerHTML = `
    <button class="btn btn-outline-secondary btn-sm" id="browsePrevPage" ${
      currentPage === 1 ? "disabled" : ""
    }>Prev</button>
    <span class="mx-2">Page ${currentPage} of ${totalPages}</span>
    <button class="btn btn-outline-secondary btn-sm" id="browseNextPage" ${
      currentPage === totalPages ? "disabled" : ""
    }>Next</button>
  `;
  browseResults.appendChild(pagination);

  // Add event listeners for pagination
  setTimeout(() => {
    const prevBtn = document.getElementById("browsePrevPage");
    const nextBtn = document.getElementById("browseNextPage");
    if (prevBtn)
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          renderResults();
        }
      };
    if (nextBtn)
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderResults();
        }
      };
  }, 0);
}
// Album add-to-collection
browseResults.addEventListener("click", async (e) => {
  const btn = e.target.closest(".add-to-collection-btn");
  if (btn) {
    const albumId = btn.getAttribute("data-album-id");
    btn.disabled = true;
    btn.textContent = "Adding...";
    const result = await addAlbumToUser(albumId);
    if (result.success) {
      btn.textContent = "Added!";
      // Refresh all data to update UI and user collection
      await loadBrowseData();
      // Force re-render to update alert-success state
      renderResults();
    } else if (result.error && result.error.code === "23505") {
      btn.textContent = "Already in your collection";
    } else {
      btn.textContent = "Error";
    }
    setTimeout(() => {
      btn.textContent = "Add to My Collection";
      btn.disabled = false;
    }, 1200);
  }
});
// Group add-to-collection
browseGroupCardsRow.addEventListener("click", async (e) => {
  const btn = e.target.closest(".add-to-group-collection-btn");
  if (btn) {
    const groupId = btn.getAttribute("data-group-id");
    btn.disabled = true;
    btn.textContent = "Adding...";
    const result = await addGroupToUser(groupId);
    if (result.success) {
      btn.textContent = "Added!";
      // Refresh all data to update UI and user collection
      await loadBrowseData();
      // Force re-render to update alert-success state
      renderGroupCardsRow();
    } else if (result.error && result.error.code === "23505") {
      btn.textContent = "Already in your collection";
    } else {
      btn.textContent = "Error";
    }
    setTimeout(() => {
      btn.textContent = "Add Group";
      btn.disabled = false;
    }, 1200);
  }
});
// Reset page on filter/search change
// Reset page on filter/search change
// No longer need to listen for group select changes
browseSearchInput.addEventListener("input", () => {
  currentPage = 1;
  renderResults();
});
loadBrowseData();
