// Populate the group filter dropdown with unique group names from albums
function populateGroupFilter() {
  const filterGroup = document.getElementById("filterGroup");
  if (!filterGroup) return;
  const groupNames = Array.from(new Set(albums.map((a) => a.group)))
    .filter(Boolean)
    .sort();
  filterGroup.innerHTML =
    '<option value="">All Groups</option>' +
    groupNames.map((g) => `<option value="${g}">${g}</option>`).join("");
}
// Dynamically set the width of the filterGroup select based on the longest group name
function adjustFilterGroupWidth() {
  const filterGroup = document.getElementById("filterGroup");
  if (!filterGroup) return;
  // Get unique group names
  const groupNames = Array.from(new Set(albums.map((a) => a.group))).filter(
    Boolean
  );
  // Find the longest group name
  let longest = "All Groups";
  groupNames.forEach((name) => {
    if (name.length > longest.length) longest = name;
  });
  // Estimate width: 1ch per character + some padding (add 4ch)
  const width = Math.max(longest.length, 10) + 4;
  filterGroup.style.minWidth = width + "ch";
}
// Populate the release date filter dropdown with unique years, months, and full dates from albums
function populateReleaseDateFilter() {
  const filterReleaseDate = document.getElementById("filterReleaseDate");
  if (!filterReleaseDate) return;
  // Get unique years, months, and full dates from release dates
  const allDates = albums.map((a) => a.releaseDate).filter(Boolean);
  const years = Array.from(
    new Set(allDates.map((date) => date.split("-")[0]))
  ).sort((a, b) => b - a);
  const months = Array.from(
    new Set(allDates.map((date) => date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));
  const fullDates = Array.from(new Set(allDates)).sort((a, b) =>
    b.localeCompare(a)
  );
  let html = '<option value="">All Dates</option>';
  years.forEach((y) => {
    html += `<option value="${y}">${y}</option>`;
  });
  html += "<option disabled>────────────</option>";
  html += '<option value="__months__" disabled>Months</option>';
  months.forEach((m) => {
    html += `<option value="${m}">${m}</option>`;
  });
  html += "<option disabled>────────────</option>";
  html += '<option value="__dates__" disabled>Full Dates</option>';
  fullDates.forEach((d) => {
    html += `<option value="${d}">${d}</option>`;
  });
  filterReleaseDate.innerHTML = html;
}
// Modularized entry point for album collection page
import "../modules/main.js";
import { albums, sortAlbums } from "../modules/albumData.js";
import { renderAlbums } from "../modules/albumUI.js";

// Pagination state
let currentAlbumPage = 1;
const ALBUMS_PER_PAGE = 8;

let filtered = albums;
let sortReversed = false;

function renderAlbumPagination(totalPages) {
  const paginationDiv = document.getElementById("albumPagination");
  if (!paginationDiv) return;
  paginationDiv.className =
    "d-flex justify-content-center align-items-center mt-3";
  paginationDiv.innerHTML = "";
  if (totalPages > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-secondary me-2";
    prevBtn.textContent = "Previous";
    prevBtn.type = "button";
    prevBtn.disabled = currentAlbumPage === 1;
    prevBtn.onclick = (e) => {
      if (e) e.preventDefault();
      if (currentAlbumPage > 1) {
        currentAlbumPage--;
        updateFilters._fromPagination = true;
        updateFilters();
        updateFilters._fromPagination = false;
        // Scroll pagination into view after update
        setTimeout(() => {
          const pagDiv = document.getElementById("albumPagination");
          if (pagDiv)
            pagDiv.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
      }
    };
    paginationDiv.appendChild(prevBtn);
    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${currentAlbumPage} of ${totalPages}`;
    pageInfo.className = "mx-2";
    paginationDiv.appendChild(pageInfo);
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-secondary ms-2";
    nextBtn.textContent = "Next";
    nextBtn.type = "button";
    nextBtn.disabled = currentAlbumPage === totalPages;
    nextBtn.onclick = (e) => {
      if (e) e.preventDefault();
      if (currentAlbumPage < totalPages) {
        currentAlbumPage++;
        updateFilters._fromPagination = true;
        updateFilters();
        updateFilters._fromPagination = false;
        // Scroll pagination into view after update
        setTimeout(() => {
          const pagDiv = document.getElementById("albumPagination");
          if (pagDiv)
            pagDiv.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
      }
    };
    paginationDiv.appendChild(nextBtn);
  }
}

function updateFilters() {
  // If this is a filter-triggered update (not a pagination-triggered one), reset to first page
  if (!updateFilters._fromPagination) {
    currentAlbumPage = 1;
  }
  const searchInput = document.getElementById("searchInput");
  const filterGroup = document.getElementById("filterGroup");
  const filterReleaseDate = document.getElementById("filterReleaseDate");
  const sortSelect = document.getElementById("sortAlbums");
  const albumCount = document.getElementById("albumCount");

  const text = searchInput ? searchInput.value.trim() : "";
  const group = filterGroup ? filterGroup.value : "";
  const dateFilter = filterReleaseDate ? filterReleaseDate.value : "";
  const sortBy = sortSelect ? sortSelect.value : "group";

  // Filter by group and release date (year, month, or full date)
  filtered = albums.filter((album) => {
    const albumName = album.album ? album.album.trim().toLowerCase() : "";
    const groupName = album.group ? album.group.trim().toLowerCase() : "";
    const releaseDate = album.releaseDate
      ? album.releaseDate.trim().toLowerCase()
      : "";
    const searchWords = text.toLowerCase().split(/\s+/).filter(Boolean);
    const matchesText = searchWords.every(
      (word) =>
        albumName.includes(word) ||
        groupName.includes(word) ||
        releaseDate.includes(word)
    );
    const matchesGroup = !group || album.group === group;
    let matchesDate = true;
    if (dateFilter && dateFilter.length === 4) {
      // Year
      matchesDate =
        album.releaseDate && album.releaseDate.startsWith(dateFilter);
    } else if (dateFilter && dateFilter.length === 7) {
      // Month
      matchesDate =
        album.releaseDate && album.releaseDate.startsWith(dateFilter);
    } else if (dateFilter && dateFilter.length === 10) {
      // Full date
      matchesDate = album.releaseDate === dateFilter;
    }
    return matchesText && matchesGroup && matchesDate;
  });
  // Sort by group, album, or releaseDate
  if (sortBy === "releaseDate") {
    filtered = filtered.slice().sort((a, b) => {
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return b.releaseDate.localeCompare(a.releaseDate);
    });
  } else {
    filtered = sortAlbums(filtered, sortBy);
  }
  if (sortReversed) filtered.reverse();
  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / ALBUMS_PER_PAGE));
  if (currentAlbumPage > totalPages) currentAlbumPage = totalPages;
  if (currentAlbumPage < 1) currentAlbumPage = 1;
  const startIdx = (currentAlbumPage - 1) * ALBUMS_PER_PAGE;
  const endIdx = startIdx + ALBUMS_PER_PAGE;
  const pageAlbums = filtered.slice(startIdx, endIdx);
  if (albumCount) albumCount.textContent = filtered.length + " albums";
  // Update global filtered for renderAlbums
  if (typeof window !== "undefined") window.filtered = filtered;
  renderAlbums(pageAlbums);
  renderAlbumPagination(totalPages);
}

window.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const filterGroup = document.getElementById("filterGroup");
  const filterReleaseDate = document.getElementById("filterReleaseDate");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      updateFilters();
    });
  } else {
    console.warn("#searchInput not found when attaching event listener");
  }
  if (filterGroup) {
    filterGroup.addEventListener("change", () => {
      updateFilters();
    });
  } else {
    console.warn("#filterGroup not found when attaching event listener");
  }
  if (filterReleaseDate) {
    filterReleaseDate.addEventListener("change", () => {
      updateFilters();
    });
  } else {
    console.warn("#filterReleaseDate not found when attaching event listener");
  }
  const sortSelect = document.getElementById("sortAlbums");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      updateFilters();
    });
  } else {
    console.warn("#sortAlbums not found when attaching event listener");
  }
  const reverseSortBtn = document.getElementById("reverseSortBtn");
  if (reverseSortBtn) {
    reverseSortBtn.addEventListener("click", () => {
      sortReversed = !sortReversed;
      // Toggle icon direction
      const icon = document.getElementById("reverseSortIcon");
      if (icon)
        icon.style.transform = sortReversed ? "rotate(0deg)" : "rotate(180deg)";
      updateFilters();
    });
  }

  // Always re-initialize Flatpickr after the edit album modal is shown
  const editAlbumModal = document.getElementById("editAlbumModal");
  if (editAlbumModal) {
    editAlbumModal.addEventListener("shown.bs.modal", () => {
      if (window.initFlatpickrOnAll) window.initFlatpickrOnAll();
    });
  }

  populateGroupFilter();
  populateReleaseDateFilter();
  adjustFilterGroupWidth();
  currentAlbumPage = 1;
  updateFilters();
  // Re-populate filters and adjust group width after albums are loaded (in case albums load async)
  if (typeof window !== "undefined") {
    const origUpdateAlbumFilters = window.updateAlbumFilters;
    window.updateAlbumFilters = function () {
      // Preserve filter UI state
      const searchInput = document.getElementById("searchInput");
      const filterGroup = document.getElementById("filterGroup");
      const filterReleaseDate = document.getElementById("filterReleaseDate");
      const sortAlbums = document.getElementById("sortAlbums");
      const reverseSortBtn = document.getElementById("reverseSortBtn");
      const prevState = {
        search: searchInput ? searchInput.value : "",
        group: filterGroup ? filterGroup.value : "",
        date: filterReleaseDate ? filterReleaseDate.value : "",
        sort: sortAlbums ? sortAlbums.value : "",
        reverse: reverseSortBtn
          ? reverseSortBtn.getAttribute("data-reversed")
          : null,
      };
      populateGroupFilter();
      populateReleaseDateFilter();
      adjustFilterGroupWidth();
      // Restore filter UI state
      if (searchInput) searchInput.value = prevState.search;
      if (filterGroup) filterGroup.value = prevState.group;
      if (filterReleaseDate) filterReleaseDate.value = prevState.date;
      if (sortAlbums) sortAlbums.value = prevState.sort;
      if (reverseSortBtn && prevState.reverse !== null)
        reverseSortBtn.setAttribute("data-reversed", prevState.reverse);
      origUpdateAlbumFilters();
    };
  }
});

// Expose for debugging
window.updateAlbumFilters = updateFilters;
