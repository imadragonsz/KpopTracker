// Render a list of album versions into a given DOM element
export function renderVersionList(container, versionsArr = []) {
  if (!container) return;
  container.innerHTML =
    versionsArr && versionsArr.length
      ? versionsArr
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
              return `<span class='badge bg-info text-dark me-1 mb-1 d-inline-flex align-items-center justify-content-center' style='min-width:90px;min-height:32px;vertical-align:middle;'>${
                obj.name
              }${
                obj.onTheWay
                  ? " <span class='badge bg-warning text-dark ms-1 d-inline-flex align-items-center justify-content-center' style='font-size:0.85em;height:24px;vertical-align:middle;'>On the Way</span>"
                  : ""
              }</span>`;
            } else {
              return `<span class='badge bg-secondary text-light me-1 mb-1'>Unknown Version</span>`;
            }
          })
          .join("")
      : "<span class='album-card-version-placeholder'>&nbsp;</span>";
}
// Album rendering logic wrapped in exported async function
import { albums, VERSIONS_PER_PAGE } from "./albumData.js";
import { fetchUserAlbumVersionsBatch } from "../api/userAlbumVersionsApi.js";
let userVersionsMap = {};
let cacheKey = "user_album_versions";
let albumList = document.getElementById("album-list");
let lastRenderList = null;

export async function renderAlbums(albumListArg) {
  albumList = document.getElementById("album-list");
  if (!albumList) {
    console.error("[renderAlbums] album-list element not found in DOM.");
    return;
  }
  let renderStart = performance.now();
  let htmlGenStart = performance.now();
  let cacheStatus = "none";
  let getCachedData, setCachedData;
  let cached;
  let loadedFrom = "backend";
  if (cacheKey) {
    ({ getCachedData, setCachedData } = await import("./cacheUtils.js"));
    cached = getCachedData(cacheKey, 300000);
    if (cached && typeof cached === "object") {
      cacheStatus = "used";
    } else {
      // Check if cache exists but is expired
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed._ts) {
            const now = Date.now();
            if (now - parsed._ts > 300000) cacheStatus = "expired";
          }
        } catch {}
      }
    }
  }
  if (cached && typeof cached === "object") {
    userVersionsMap = cached;
    loadedFrom = "cache";
  }

  // Always use the last filtered array for rendering
  if (Array.isArray(albumListArg)) {
    lastRenderList = albumListArg;
  }
  const renderList = Array.isArray(lastRenderList) ? lastRenderList : albums;
  let html = "";
  for (let i = 0; i < renderList.length; i++) {
    const item = renderList[i];
    let imageHtml = "";
    if (item.image) {
      imageHtml = `<div class='album-card-img-wrap'><img src="${item.image}" alt="Album Cover" class="album-card-img"></div>`;
    } else {
      const initials = (item.group?.[0] || "?").toUpperCase();
      imageHtml = `<div class='album-card-img-wrap album-card-img-placeholder'>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#232946"/>
              <path d="M16 3v10.56A4 4 0 1 1 14 17V7h4V3h-2Z" fill="#43c6ac"/>
            </svg>
            <span class="album-card-img-initials">${initials}</span>
          </div>`;
    }
    // Per-album version pagination (per user)
    let versionsHtml = "";
    let userVersions = userVersionsMap[item.id] || [];
    const totalVersions = Array.isArray(userVersions) ? userVersions.length : 0;
    let totalPages = 1;
    let page = 1;
    let paginationControls = "";
    if (totalVersions > 0) {
      if (!item._versionPage) item._versionPage = 1;
      totalPages = Math.ceil(totalVersions / VERSIONS_PER_PAGE);
      if (item._versionPage > totalPages) item._versionPage = 1;
      page = item._versionPage;
      const start = (page - 1) * VERSIONS_PER_PAGE;
      const end = start + VERSIONS_PER_PAGE;
      const pageVersions = userVersions.slice(start, end);
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
            return `<span class='badge bg-info text-dark me-1 mb-1 d-inline-flex align-items-center justify-content-center' style='min-width:90px;min-height:32px;vertical-align:middle;'>${
              obj.name
            }${
              obj.onTheWay
                ? " <span class='badge bg-warning text-dark ms-1 d-inline-flex align-items-center justify-content-center' style='font-size:0.85em;height:24px;vertical-align:middle;'>On the Way</span>"
                : ""
            }</span>`;
          } else {
            return `<span class='badge bg-secondary text-light me-1 mb-1'>Unknown Version</span>`;
          }
        })
        .join("");
      if (totalVersions > 4) {
        paginationControls = `
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
            </div>`;
      }
    }
    html += `
        <li class="list-group-item album-list-item redesigned-album-card p-3 mb-3" data-album-id="${
          item.id
        }" style="cursor:pointer;">
          <div class="album-card-flex">
            ${imageHtml}
            <div class="album-card-main">
              <div class="album-card-title mb-1">
                <span class="album-card-group">${item.group}</span>
                <span class="album-card-sep">-</span>
                <span class="album-card-name">${item.album}</span>
                <span class="album-card-year">(${item.releaseDate || ""})</span>
              </div>
              <div class='version-list mb-2'>${
                versionsHtml ||
                "<span class='album-card-version-placeholder'>&nbsp;</span>"
              }</div>
              <div class="album-card-controls-row">
                ${paginationControls}
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
        </li>
      `;
  }
  albumList.innerHTML = html;

  // Use event delegation for version pagination buttons
  if (!albumList._paginationDelegated) {
    albumList.addEventListener("click", (e) => {
      const prevBtn = e.target.closest(".version-prev-btn");
      const nextBtn = e.target.closest(".version-next-btn");
      if (prevBtn) {
        e.stopPropagation();
        const albumId = prevBtn.getAttribute("data-album-id");
        const album = albums.find((a) => String(a.id) === String(albumId));
        if (album) {
          album._versionPage = Math.max(1, (album._versionPage || 1) - 1);
          renderAlbums(lastRenderList);
        }
      } else if (nextBtn) {
        e.stopPropagation();
        const albumId = nextBtn.getAttribute("data-album-id");
        const album = albums.find((a) => String(a.id) === String(albumId));
        if (album) {
          album._versionPage = Math.min(
            Math.ceil(
              (userVersionsMap[album.id]?.length || 0) / VERSIONS_PER_PAGE
            ),
            (album._versionPage || 1) + 1
          );
          renderAlbums(lastRenderList);
        }
      }
    });
    albumList._paginationDelegated = true;
  }

  // Fetch latest from backend in background
  const albumIds = albums.map((a) => a.id);
  fetchUserAlbumVersionsBatch(albumIds).then(async (freshUserVersionsMap) => {
    if (
      freshUserVersionsMap &&
      JSON.stringify(freshUserVersionsMap) !== JSON.stringify(userVersionsMap)
    ) {
      userVersionsMap = freshUserVersionsMap;
      if (cacheKey && setCachedData) {
        setCachedData(cacheKey, freshUserVersionsMap);
      }
      // Re-render with fresh data if it changed
      renderAlbums._rerendered = renderAlbums._rerendered || 0;
      if (renderAlbums._rerendered < 2) {
        renderAlbums._rerendered++;
        setTimeout(() => {
          renderAlbums._rerendered = 0;
        }, 1000);
        await renderAlbums(lastRenderList);
      }
    }
  });
}
