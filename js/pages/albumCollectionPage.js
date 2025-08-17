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
// Populate the year filter dropdown with unique years from albums
function populateYearFilter() {
  const filterYear = document.getElementById("filterYear");
  if (!filterYear) return;
  // Get unique years from albums
  const years = Array.from(new Set(albums.map((a) => a.year)))
    .filter(Boolean)
    .sort((a, b) => b - a);
  filterYear.innerHTML =
    '<option value="">All Years</option>' +
    years.map((y) => `<option value="${y}">${y}</option>`).join("");
}
// Modularized entry point for album collection page
import "../modules/main.js";
import { albums, filterAlbums, sortAlbums } from "../modules/albumData.js";
import { renderAlbums } from "../modules/albumUI.js";

let filtered = albums;
let sortReversed = false;

function updateFilters() {
  const searchInput = document.getElementById("searchInput");
  const filterGroup = document.getElementById("filterGroup");
  const filterYear = document.getElementById("filterYear");
  const sortSelect = document.getElementById("sortAlbums");
  const albumCount = document.getElementById("albumCount");

  const text = searchInput ? searchInput.value : "";
  const group = filterGroup ? filterGroup.value : "";
  const year = filterYear ? filterYear.value : "";
  const sortBy = sortSelect ? sortSelect.value : "group";

  filtered = filterAlbums(albums, text, { value: group }, { value: year });
  filtered = sortAlbums(filtered, sortBy);
  if (sortReversed) filtered.reverse();
  if (albumCount) albumCount.textContent = filtered.length + " albums";
  // Update global filtered for renderAlbums
  if (typeof window !== "undefined") window.filtered = filtered;
  renderAlbums(filtered);
}

window.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const filterGroup = document.getElementById("filterGroup");
  const filterYear = document.getElementById("filterYear");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      console.log("#searchInput input event fired");
      updateFilters();
    });
  } else {
    console.warn("#searchInput not found when attaching event listener");
  }
  if (filterGroup) filterGroup.addEventListener("change", updateFilters);
  if (filterYear) filterYear.addEventListener("change", updateFilters);
  const sortSelect = document.getElementById("sortAlbums");
  if (sortSelect) sortSelect.addEventListener("change", updateFilters);
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

  // Populate group and year filters, adjust group width, and run initial filter
  populateGroupFilter();
  populateYearFilter();
  adjustFilterGroupWidth();
  updateFilters();
  // Re-populate filters and adjust group width after albums are loaded (in case albums load async)
  if (typeof window !== "undefined") {
    const origUpdateAlbumFilters = window.updateAlbumFilters;
    window.updateAlbumFilters = function () {
      populateGroupFilter();
      populateYearFilter();
      adjustFilterGroupWidth();
      origUpdateAlbumFilters();
    };
  }
});

// Expose for debugging
window.updateAlbumFilters = updateFilters;
