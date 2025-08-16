// Allow clicking on a version badge in .version-list to open the album version modal if it's 'on the way'
document.addEventListener("click", async function (e) {
  const badge = e.target.closest(
    ".version-list .badge.bg-info.text-dark.me-1.mb-1"
  );
  if (badge) {
    // Find the parent li to get album id
    const li = badge.closest(".album-list-item");
    if (!li) return;
    const albumId = li.getAttribute("data-album-id");
    const album = albums.find((a) => String(a.id) === String(albumId));
    if (!album) return;
    // Find the version index in the current page
    const versionBadges = Array.from(
      li.querySelectorAll(".version-list .badge.bg-info.text-dark.me-1.mb-1")
    );
    const idxOnPage = versionBadges.indexOf(badge);
    if (idxOnPage === -1) return;
    // Calculate the real index in the album.versions array
    const page = album._versionPage || 1;
    const VERSIONS_PER_PAGE = 4;
    const versionIdx = (page - 1) * VERSIONS_PER_PAGE + idxOnPage;
    let version = album.versions[versionIdx];
    let obj = version;
    if (
      typeof version === "string" &&
      version.trim().startsWith("{") &&
      version.trim().endsWith("}")
    ) {
      try {
        obj = JSON.parse(version);
      } catch (e) {
        obj = version;
      }
    }
    // Dynamically import and show modal
    const { showAlbumVersionModal } = await import(
      "../components/albumVersionModal.js"
    );
    showAlbumVersionModal(
      {
        name: obj.name || (typeof obj === "string" ? obj : ""),
        trackingCode: obj.trackingCode || "",
        onTheWay: obj.onTheWay || false,
        notes: obj.notes || "",
      },
      (newData) => {
        // newData: { name, trackingCode, onTheWay, notes }
        let updatedVersion = {};
        if (typeof obj === "object" && obj !== null) {
          // Only overwrite name if newData.name is not empty
          updatedVersion = {
            ...obj,
            ...newData,
            name:
              newData.name && newData.name.trim() !== ""
                ? newData.name
                : obj.name,
          };
        } else {
          updatedVersion = {
            name:
              newData.name && newData.name.trim() !== "" ? newData.name : obj,
            ...newData,
          };
        }
        album.versions[versionIdx] = updatedVersion;
        import("../api/albumApi.js").then(async ({ updateAlbum }) => {
          const { _infoVersionPage, _versionPage, ...albumToSave } = album;
          await updateAlbum(album.id, albumToSave);
          import("./albumLoader.js").then(({ loadAndRenderAlbums }) => {
            loadAndRenderAlbums();
          });
        });
      }
    );
  }
});
// Album rendering and UI logic
import {
  albums,
  currentAlbumPage,
  ALBUMS_PER_PAGE,
  VERSIONS_PER_PAGE,
  sortAlbums,
  filterAlbums,
  getTotalAlbumCount,
} from "./albumData.js";

export function renderVersionList(listElem, versionsArr) {
  listElem.innerHTML = "";
  versionsArr.forEach((ver, idx) => {
    let obj = ver;
    if (
      typeof ver === "string" &&
      ver.trim().startsWith("{") &&
      ver.trim().endsWith("}")
    ) {
      try {
        obj = JSON.parse(ver);
      } catch (e) {
        obj = ver;
      }
    }
    const badge = document.createElement("span");
    badge.className =
      "badge bg-info text-dark me-1 mb-1 d-inline-flex align-items-center";
    let versionName = "";
    if (typeof obj === "string") {
      versionName = obj;
    } else if (obj && typeof obj === "object" && typeof obj.name === "string") {
      versionName = obj.name;
    } else {
      versionName = "Unknown Version";
    }
    badge.textContent = versionName;
    if (obj && typeof obj === "object" && obj.onTheWay) {
      const tag = document.createElement("span");
      tag.className = "badge bg-warning text-dark ms-2";
      tag.textContent = "On the Way";
      badge.appendChild(tag);
      // Make badge clickable to open album version modal
      badge.style.cursor = "pointer";
      badge.addEventListener("click", (e) => {
        // Prevent triggering edit/remove buttons
        if (e.target !== badge) return;
        // Emit a custom event with the index
        const event = new CustomEvent("edit-version", {
          bubbles: true,
          detail: { idx, version: obj },
        });
        badge.dispatchEvent(event);
      });
    }
    // Edit button
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm btn-outline-light ms-1 px-1 py-0";
    editBtn.style.fontSize = "0.8em";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
      // Emit a custom event with the index
      const event = new CustomEvent("edit-version", {
        bubbles: true,
        detail: { idx, version: obj },
      });
      badge.dispatchEvent(event);
    };
    badge.appendChild(editBtn);
    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-close btn-close-white btn-sm ms-1";
    removeBtn.style.fontSize = "0.7em";
    removeBtn.setAttribute("aria-label", "Remove");
    removeBtn.onclick = () => {
      versionsArr.splice(idx, 1);
      renderVersionList(listElem, versionsArr);
    };
    badge.appendChild(removeBtn);
    listElem.appendChild(badge);
  });
}

// Render the albums list to the DOM
export function renderAlbums() {
  const albumList = document.getElementById("albumList");
  const albumCount = document.getElementById("albumCount");
  if (!albumList || !albumCount) return;
  albumList.innerHTML = "";
  let filtered = sortAlbums(filterAlbums(albums, ""), "group");
  albumCount.textContent = `Albums: ${getTotalAlbumCount(filtered)}`;
  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item album-list-item redesigned-album-card p-3 mb-3";
    li.setAttribute("data-album-id", item.id);
    li.style.cursor = "pointer";
    let imageHtml = "";
    if (item.image) {
      imageHtml = `<div class='album-card-img-wrap'><img src="${item.image}" alt="Album Cover" class="album-card-img"></div>`;
    } else {
      // Placeholder: music note SVG, initials, or fallback
      const initials = (item.group?.[0] || "?").toUpperCase();
      imageHtml = `<div class='album-card-img-wrap album-card-img-placeholder'>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="#232946"/>
          <path d="M16 3v10.56A4 4 0 1 1 14 17V7h4V3h-2Z" fill="#43c6ac"/>
        </svg>
        <span class="album-card-img-initials">${initials}</span>
      </div>`;
    }
    // Per-album version pagination
    let versionsHtml = "";
    const VERSIONS_PER_PAGE = 4;
    const totalVersions = Array.isArray(item.versions)
      ? item.versions.length
      : 0;
    let totalPages = 1;
    let page = 1;
    if (totalVersions > 0) {
      if (!item._versionPage) item._versionPage = 1;
      totalPages = Math.ceil(totalVersions / VERSIONS_PER_PAGE);
      if (item._versionPage > totalPages) item._versionPage = 1;
      page = item._versionPage;
      const start = (page - 1) * VERSIONS_PER_PAGE;
      const end = start + VERSIONS_PER_PAGE;
      const pageVersions = item.versions.slice(start, end);
      versionsHtml = pageVersions
        .map((v) => {
          let obj = v;
          if (
            typeof v === "string" &&
            v.trim().startsWith("{") &&
            v.trim().endsWith("}")
          ) {
            try {
              obj = JSON.parse(v);
            } catch (e) {
              obj = v;
            }
          }
          if (typeof obj === "string") {
            return `<span class='badge bg-info text-dark me-1 mb-1'>${obj}</span>`;
          } else if (
            obj &&
            typeof obj === "object" &&
            typeof obj.name === "string"
          ) {
            return `<span class='badge bg-info text-dark me-1 mb-1'>${
              obj.name
            }${
              obj.onTheWay
                ? " <span class='badge bg-warning text-dark ms-1'>On the Way</span>"
                : ""
            }</span>`;
          } else {
            return `<span class='badge bg-secondary text-light me-1 mb-1'>Unknown Version</span>`;
          }
        })
        .join("");
    }
    li.innerHTML = `
      <div class="album-card-flex">
        ${imageHtml}
        <div class="album-card-main">
          <div class="album-card-title mb-1">
            <span class="album-card-group">${item.group}</span>
            <span class="album-card-sep">-</span>
            <span class="album-card-name">${item.album}</span>
            <span class="album-card-year">(${item.year})</span>
          </div>
          <div class='version-list mb-2'>${
            versionsHtml ||
            "<span class='album-card-version-placeholder'>&nbsp;</span>"
          }</div>
          <div class="album-card-controls-row">
            <div class='version-pagination-controls'>
              <button class='btn btn-sm btn-outline-secondary version-prev-btn' data-album-id='${
                item.id
              }' ${
      typeof page === "undefined" ||
      typeof totalPages === "undefined" ||
      Number(page) === 1 ||
      Number(totalPages) === 1
        ? "disabled"
        : ""
    }>Prev</button>
              <span class='mx-2'>Page ${
                typeof page !== "undefined" ? page : 1
              } of ${typeof totalPages !== "undefined" ? totalPages : 1}</span>
              <button class='btn btn-sm btn-outline-secondary version-next-btn' data-album-id='${
                item.id
              }' ${
      typeof page === "undefined" ||
      typeof totalPages === "undefined" ||
      Number(page) === Number(totalPages) ||
      Number(totalPages) === 1
        ? "disabled"
        : ""
    }>Next</button>
            </div>
            <div class="album-card-actions">
              <button class='btn btn-sm btn-warning edit-btn me-2' data-id='${
                item.id
              }'>Edit</button>
              <button class='remove-btn btn btn-sm btn-danger' data-id='${
                item.id
              }' aria-label='Remove' title='Remove'>&times;</button>
            </div>
          </div>
        </div>
      </div>
    `;
    albumList.appendChild(li);
  });

  // Add event listeners for version pagination buttons
  setTimeout(() => {
    const prevBtns = document.querySelectorAll(".version-prev-btn");
    const nextBtns = document.querySelectorAll(".version-next-btn");
    prevBtns.forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const albumId = btn.getAttribute("data-album-id");
        const album = albums.find((a) => String(a.id) === String(albumId));
        if (album) {
          album._versionPage = Math.max(1, (album._versionPage || 1) - 1);
          renderAlbums();
        }
      };
    });
    nextBtns.forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const albumId = btn.getAttribute("data-album-id");
        const album = albums.find((a) => String(a.id) === String(albumId));
        if (album) {
          const totalPages = Math.ceil((album.versions?.length || 0) / 4);
          album._versionPage = Math.min(
            totalPages,
            (album._versionPage || 1) + 1
          );
          renderAlbums();
        }
      };
    });
  }, 0);
}
