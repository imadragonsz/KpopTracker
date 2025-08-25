// browsePage.js
// Browse all groups and albums, add to user's collection
import { showLoading, hideLoading } from "../components/loading.js";
import { createFlexRow, createCardCol } from "../modules/uiHelpers.js";
import {
  albumCardHtml,
  groupCardHtml,
  allGroupsCardHtml,
} from "../modules/cardRenderer.js";
import { getCardWidth, getCardPageSize } from "../modules/paginationUtils.js";
import { loadAllData, filterAlbums } from "../modules/browseData.js";
import { addAlbumToUser, addGroupToUser } from "../api/browseApi.js";
import { getCurrentUser } from "../auth.js";

const browseResults = document.getElementById("browseResults");
// Add a container for group cards row
let browseGroupCardsRow = document.getElementById("browseGroupCardsRow");
if (!browseGroupCardsRow) {
  browseGroupCardsRow = document.createElement("div");
  browseGroupCardsRow.id = "browseGroupCardsRow";
  // No margin class needed on outer container
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
let pageSize = getCardPageSize();
let groupPage = 1;
let groupPageSize = getCardPageSize();

window.addEventListener("resize", () => {
  pageSize = getCardPageSize();
  groupPageSize = getCardPageSize();
  renderGroupCardsRow();
  renderResults();
});

async function loadBrowseData() {
  showLoading();
  const data = await loadAllData();
  allGroups = data.allGroups;
  allAlbums = data.allAlbums;
  userAlbums = data.userAlbums;
  userGroups = data.userGroups;
  renderGroupCardsRow();
  renderResults();
  hideLoading();
}

function renderGroupCardsRow() {
  // Dynamically subtract 1 from the default maxCards for group row
  const defaultMaxCards = getCardPageSize();
  groupPageSize = getCardPageSize(undefined, undefined, defaultMaxCards - 1);
  const totalGroupPages = Math.max(
    1,
    Math.ceil(allGroups.length / groupPageSize)
  );
  if (groupPage > totalGroupPages) groupPage = totalGroupPages;
  const startIdx = (groupPage - 1) * groupPageSize;
  const endIdx = startIdx + groupPageSize;
  const pageGroups = allGroups.slice(startIdx, endIdx);

  browseGroupCardsRow.innerHTML = "";
  // No margin class needed on outer container
  if (!allGroups.length) {
    browseGroupCardsRow.innerHTML =
      '<div class="text-center text-muted">No groups found.</div>';
    return;
  }
  const cardWidth = getCardWidth();
  const row = createFlexRow();
  const allCol = createCardCol({
    width: cardWidth,
    isSelected: selectedGroup === null,
    cardHtml: allGroupsCardHtml(cardWidth, selectedGroup === null),
    onClick: () => {
      selectedGroup = null;
      currentPage = 1;
      renderGroupCardsRow();
      renderResults();
    },
  });
  row.appendChild(allCol);
  (async () => {
    const user = await getCurrentUser();
    const isLoggedIn = !!user;
    pageGroups.forEach((group) => {
      const alreadyOwned = userGroups.some(
        (ug) => ug.id === group.id || ug.name === group.name
      );
      const isSelected = selectedGroup === group.name;
      const col = createCardCol({
        width: cardWidth,
        isSelected,
        cardHtml: groupCardHtml(group, cardWidth, alreadyOwned, isSelected, isLoggedIn),
        onClick: (e) => {
          if (e.target.closest(".add-to-group-collection-btn")) return;
          selectedGroup = group.name;
          currentPage = 1;
          renderGroupCardsRow();
          renderResults();
        },
      });
      row.appendChild(col);
    });
    browseGroupCardsRow.innerHTML = "";
    browseGroupCardsRow.appendChild(row);
    // Remove existing pagination controls before appending new one
    Array.from(browseGroupCardsRow.querySelectorAll('.d-flex.justify-content-center.align-items-center.gap-2')).forEach(el => el.remove());
    // Pagination controls (moved inside async block)
    const pagination = document.createElement("div");
    pagination.className =
      "d-flex justify-content-center align-items-center gap-2";
    const totalGroupPagesDisplay = Math.max(
      1,
      Math.ceil(allGroups.length / groupPageSize)
    );
    pagination.innerHTML = `
      <button class="btn btn-outline-secondary btn-sm" id="browsePrevGroupPage" ${
        groupPage === 1 ? "disabled" : ""
      }>Prev</button>
      <span class="mx-2">Page ${groupPage} of ${totalGroupPagesDisplay}</span>
      <button class="btn btn-outline-secondary btn-sm" id="browseNextGroupPage" ${
        groupPage === totalGroupPagesDisplay ? "disabled" : ""
      }>Next</button>
    `;
    browseGroupCardsRow.appendChild(pagination);
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
          if (groupPage < totalGroupPagesDisplay) {
            groupPage++;
            renderGroupCardsRow();
          }
        };
    }, 0);
  })();
}

function renderResults() {
  pageSize = getCardPageSize();
  const search = browseSearchInput.value.trim().toLowerCase();
  const group = selectedGroup;
  filteredAlbums = filterAlbums(allAlbums, group, search);
  const totalPages = Math.max(1, Math.ceil(filteredAlbums.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageAlbums = filteredAlbums.slice(startIdx, endIdx);

  browseResults.innerHTML = "";
  if (!filteredAlbums.length) {
    browseResults.innerHTML =
      '<div class="text-center text-muted">No albums found.</div>';
    return;
  }
  const cardWidth = getCardWidth();
  const row = createFlexRow();
  (async () => {
    const user = await getCurrentUser();
    const isLoggedIn = !!user;
    pageAlbums.forEach((album) => {
      const alreadyOwned = userAlbums.some(
        (ua) =>
          ua.id === album.id ||
          (ua.album === album.album && ua.group === album.group)
      );
      const col = createCardCol({
        width: cardWidth,
        cardHtml: albumCardHtml(album, cardWidth, alreadyOwned, isLoggedIn),
        onClick: async (e) => {
          if (e.target.closest(".add-to-collection-btn")) {
            return;
          }
          try {
            const { showAlbumInfoModal } = await import(
              "../components/albumModals.js"
            );
            showAlbumInfoModal(album);
            const modalEl = document.getElementById("albumInfoModal");
            if (modalEl && window.bootstrap && window.bootstrap.Modal) {
              const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
              modal.show();
            }
          } catch (err) {
            console.error("[BrowsePage] Error opening album info modal:", err);
          }
        },
      });
      row.appendChild(col);
    });
    browseResults.innerHTML = "";
    browseResults.appendChild(row);
    // Remove existing pagination controls before appending new one
    Array.from(browseResults.querySelectorAll('.d-flex.justify-content-center.align-items-center.gap-2')).forEach(el => el.remove());
    // Pagination controls (moved inside async block)
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
  })();
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
      btn.textContent = "Login plz";
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
      btn.textContent = "Login plz";
    }
    setTimeout(() => {
      btn.textContent = "Add Group";
      btn.disabled = false;
    }, 1200);
  }
});
// Reset page on filter/search change
browseSearchInput.addEventListener("input", () => {
  currentPage = 1;
  renderResults();
});

loadBrowseData();
