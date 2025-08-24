import {
  fetchAlbums,
  addAlbum,
  updateAlbum,
  deleteAlbum,
} from "../api/albumApi.js";
import { fetchGroups } from "../api/groupApi.js";
import { showAlbumInfoModal } from "../components/albumModals.js";

const ids = [
  "albumForm",
  "albumList",
  "searchInput",
  "sortSelect",
  "albumCount",
  "groupSelect",
  "year",
  "albumImage",
  "editAlbumForm",
  "editGroup",
  "editAlbum",
  "editYear",
  "editImage",
  "editVersions",
  "albumInfoBody",
  "filterGroup",
  "filterYear",
];
const elements = {};
ids.forEach((id) => {
  elements[id] = document.getElementById(id);
});

const albumForm = elements.albumForm;
const albumList = elements.albumList;
const searchInput = elements.searchInput;
const sortSelect = elements.sortSelect;
const filterGroup = elements.filterGroup;
const filterYear = elements.filterYear;
const albumCount = elements.albumCount;
const groupSelect = elements.groupSelect;
const yearSelect = elements.year;
const albumImage = elements.albumImage;
const editAlbumForm = elements.editAlbumForm;
const editGroup = elements.editGroup;
const editAlbum = elements.editAlbum;
const editYear = elements.editYear;
const editImage = elements.editImage;
const editVersions = elements.editVersions;
const albumInfoBody = elements.albumInfoBody;

const editAlbumModal = new bootstrap.Modal(
  document.getElementById("editAlbumModal")
);
const albumInfoModal = new bootstrap.Modal(
  document.getElementById("albumInfoModal")
);

let albums = [];
let groups = [];
let filterText = "";
let sortBy = "group";
let editingId = null;
let currentAlbumPage = 1;
const ALBUMS_PER_PAGE = 10;

function populateYearSelect() {
  const currentYear = new Date().getFullYear();
  if (!yearSelect) {
    console.error('Element with id="year" not found in DOM.');
    return;
  }
  yearSelect.innerHTML = "";
  for (let y = currentYear; y >= 2000; y--) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
  }
}

function renderGroupDropdown() {
  groupSelect.innerHTML =
    '<option value="" disabled selected>Select Group</option>';
  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.name;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });
}

async function loadAndRenderGroups() {
  groups = await fetchGroups();
  renderGroupDropdown();
}

async function loadAndRenderAlbums() {
  albums = await fetchAlbums();
  populateFilterDropdowns();
  renderAlbums();
}

function populateFilterDropdowns() {
  // Populate group filter
  if (filterGroup) {
    const uniqueGroups = [...new Set(albums.map((a) => a.group))].sort();
    filterGroup.innerHTML =
      '<option value="">All Groups</option>' +
      uniqueGroups.map((g) => `<option value="${g}">${g}</option>`).join("");
  }
  // Populate year filter
  if (filterYear) {
    const uniqueYears = [...new Set(albums.map((a) => a.year))].sort(
      (a, b) => b - a
    );
    filterYear.innerHTML =
      '<option value="">All Years</option>' +
      uniqueYears.map((y) => `<option value="${y}">${y}</option>`).join("");
  }
}

// Utility functions
function filterAlbums(albums, filterText) {
  const text = filterText.toLowerCase();
  const groupVal = filterGroup && filterGroup.value ? filterGroup.value : "";
  const yearVal = filterYear && filterYear.value ? filterYear.value : "";
  return albums.filter((item) => {
    // Search text matches group, album, or year (partial, case-insensitive)
    const matchesText =
      item.group.toLowerCase().includes(text) ||
      item.album.toLowerCase().includes(text) ||
      item.year.toString().includes(text);
    // Group filter
    const matchesGroup = !groupVal || item.group === groupVal;
    // Year filter
    const matchesYear = !yearVal || item.year.toString() === yearVal;
    return matchesText && matchesGroup && matchesYear;
  });
}
function sortAlbums(albums, sortBy) {
  return albums.slice().sort((a, b) => {
    if (sortBy === "year") {
      return parseInt(a.year) - parseInt(b.year);
    }
    return a[sortBy].localeCompare(b[sortBy]);
  });
}
function resetAlbumForm() {
  albumForm.reset();
  groupSelect.selectedIndex = 0;
}
function updateAlbumsList() {
  loadAndRenderAlbums();
}

function getTotalAlbumCount(albums) {
  return albums.reduce((total, album) => {
    if (Array.isArray(album.versions) && album.versions.length > 0) {
      return total + album.versions.length;
    }
    return total + 1;
  }, 0);
}

function renderAlbums() {
  albumList.innerHTML = "";
  let filtered = sortAlbums(filterAlbums(albums, filterText), sortBy);
  albumCount.textContent = `Albums: ${getTotalAlbumCount(filtered)}`;
  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ALBUMS_PER_PAGE);
  if (currentAlbumPage > totalPages) currentAlbumPage = totalPages || 1;
  const startIdx = (currentAlbumPage - 1) * ALBUMS_PER_PAGE;
  const endIdx = startIdx + ALBUMS_PER_PAGE;
  const pageAlbums = filtered.slice(startIdx, endIdx);
  pageAlbums.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-group-item album-list-item";
    li.setAttribute("data-album-id", item.id);
    li.style.cursor = "pointer";
    let imageHtml = "";
    if (item.image) {
      imageHtml = `<img src="${item.image}" alt="Album Cover" class="img-thumbnail me-2" style="max-width:80px;max-height:80px;">`;
    }
    li.innerHTML = `${imageHtml}<span><strong>${item.group}</strong> - ${item.album} (${item.year})</span>
      <div>
        <button class='btn btn-sm btn-warning edit-btn me-2' data-id='${item.id}'>Edit</button>
        <button class='remove-btn btn btn-sm btn-danger' data-id='${item.id}'>Remove</button>
      </div>`;
    albumList.appendChild(li);
  });
  // Pagination controls
  const paginationDiv =
    document.getElementById("albumPagination") || document.createElement("div");
  paginationDiv.id = "albumPagination";
  paginationDiv.className =
    "d-flex justify-content-center align-items-center mt-3";
  paginationDiv.innerHTML = "";
  if (totalPages > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-secondary me-2";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = currentAlbumPage === 1;
    prevBtn.onclick = () => {
      currentAlbumPage--;
      renderAlbums();
    };
    paginationDiv.appendChild(prevBtn);
    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${currentAlbumPage} of ${totalPages}`;
    pageInfo.className = "mx-2";
    paginationDiv.appendChild(pageInfo);
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-secondary ms-2";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentAlbumPage === totalPages;
    nextBtn.onclick = () => {
      currentAlbumPage++;
      renderAlbums();
    };
    paginationDiv.appendChild(nextBtn);
  }
  if (!document.getElementById("albumPagination")) {
    albumList.parentNode.appendChild(paginationDiv);
  }
}

if (albumList) {
  albumList.addEventListener("click", async function (e) {
    const li = e.target.closest(".album-list-item");
    if (!li) return;
    const albumId = li.getAttribute("data-album-id");
    const album = albums.find((a) => a.id == albumId);
    if (e.target.classList.contains("remove-btn")) {
      await deleteAlbum(albumId);
      updateAlbumsList();
      return;
    }
    if (e.target.classList.contains("edit-btn")) {
      albumInfoModal.hide();
      setTimeout(() => {
        editGroup.value = album.group;
        editAlbum.value = album.album;
        editYear.value = album.year;
        editImage.value = album.image || "";
        editVersions.value = album.versions ? album.versions.join(", ") : "";
        editingId = albumId;
        editAlbumModal.show();
      }, 300);
      return;
    }
    // Open album info modal for other clicks
    if (album) {
      showAlbumInfoModal(album);
      albumInfoModal.show();
    }
  });
} else {
  console.error('Element with id="albumList" not found in DOM.');
}

if (albumForm) {
  albumForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const group = groupSelect.value.trim();
    const album = elements.album.value.trim();
    const year = yearSelect.value;
    const image = albumImage.value.trim();
    // Prevent duplicate albums (case-insensitive, ignore year)
    const duplicate = albums.some(
      (a) =>
        a.group.toLowerCase() === group.toLowerCase() &&
        a.album.toLowerCase() === album.toLowerCase()
    );
    if (duplicate) {
      alert("This album already exists.");
      return;
    }
    if (group && album && year) {
      const albumData = {
        group,
        album,
        year,
        image,
        versions: editVersions.value.trim()
          ? editVersions.value.split(/\s*,\s*/)
          : [],
      };
      if (editingId !== null) {
        await updateAlbum(editingId, albumData);
        editingId = null;
      } else {
        await addAlbum(albumData);
      }
      updateAlbumsList();
      resetAlbumForm();
    }
  });
} else {
  console.error('Element with id="albumForm" not found in DOM.');
}

function resetToFirstPageAndRender() {
  currentAlbumPage = 1;
  renderAlbums();
}

if (searchInput) {
  searchInput.addEventListener("input", function () {
    filterText = this.value;
    resetToFirstPageAndRender();
  });
} else {
  console.error('Element with id="searchInput" not found in DOM.');
}

if (filterGroup) {
  filterGroup.addEventListener("change", function () {
    resetToFirstPageAndRender();
  });
}
if (filterYear) {
  filterYear.addEventListener("change", function () {
    resetToFirstPageAndRender();
  });
}

if (editAlbumForm) {
  editAlbumForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (editingId !== null) {
      await updateAlbum(editingId, {
        group: editGroup.value.trim(),
        album: editAlbum.value.trim(),
        year: editYear.value.trim(),
        image: editImage.value.trim(),
        versions: editVersions.value.trim()
          ? editVersions.value.split(/\s*,\s*/)
          : [],
      });
      updateAlbumsList();
      editingId = null;
      editAlbumModal.hide();
    }
  });
} else {
  console.error('Element with id="editAlbumForm" not found in DOM.');
}

document.addEventListener("DOMContentLoaded", function () {
  populateYearSelect();
  loadAndRenderGroups();
  loadAndRenderAlbums();
  // Listen for clicks on group link in album info modal
  albumInfoBody.addEventListener("click", function (e) {
    if (e.target.classList.contains("album-group-link")) {
      e.preventDefault();
      window.location.href = e.target.getAttribute("href");
    }
  });
});
