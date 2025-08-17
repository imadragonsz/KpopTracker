// Utility: Detect carrier and return tracking URL
export function getTrackingUrl(trackingCode) {
  if (!trackingCode) return null;
  // PostNL: 3S, CD, KG, LA, LB, RR, etc. + 9 digits + NL
  if (/^(3S|CD|KG|LA|LB|RR)[A-Z0-9]*[0-9]{9}NL$/i.test(trackingCode)) {
    return `https://www.internationalparceltracking.com/track-and-trace/${trackingCode}`;
  }
  // DPD: 14-digit or 12-digit numbers, sometimes with letters
  if (
    /^[0-9]{12,14}$/.test(trackingCode) ||
    /^[A-Z0-9]{14}$/.test(trackingCode)
  ) {
    return `https://www.dpdgroup.com/be/mydpd/my-parcels/incoming?parcelNumber=${trackingCode}`;
  }
  // UPS: 1Z + 16 alphanumeric
  if (/^1Z[0-9A-Z]{16}$/i.test(trackingCode)) {
    return `https://www.ups.com/track?tracknum=${trackingCode}`;
  }
  // DHL: 10-digit, 20-digit, JD + numbers, or CO...DE (Germany export)
  if (/^(JD[0-9]{14,20}|[0-9]{10,20}|CO[0-9A-Z]+DE)$/i.test(trackingCode)) {
    return `https://www.dhl.com/nl-en/home/tracking.html?tracking-id=${trackingCode}&submit=1`;
  }
  // Default: Google search
  return `https://www.google.com/search?q=${encodeURIComponent(
    trackingCode + " tracking"
  )}`;
}

import {
  fetchUserAlbumVersions,
  upsertUserAlbumVersions,
} from "../api/userAlbumVersionsApi.js";

export async function showAlbumInfoModal(album) {
  const albumInfoBody = document.getElementById("albumInfoBody");
  let albumHtml = "";
  if (album.image) {
    albumHtml += `<img src='${album.image}' alt='Album Cover' class='img-thumbnail mb-3' style='max-width:200px;max-height:200px;display:block;margin:auto;'>`;
  }
  albumHtml += `<h4 class='text-center mb-2'>${album.album}</h4>`;
  albumHtml += `<div class='text-center mb-2'><span class='fw-bold'>Group:</span> <a href='groupManagement.html?group=${encodeURIComponent(
    album.group
  )}' class='text-info album-group-link' style='cursor:pointer;text-decoration:underline;'>${
    album.group
  }</a></div>`;
  albumHtml += `<div class='text-center mb-2'><span class='fw-bold'>Year:</span> ${album.year}</div>`;

  // Fetch per-user versions for this album
  const userVersions = await fetchUserAlbumVersions(album.id);
  if (!album._infoVersionPage) album._infoVersionPage = 1;
  const VERSIONS_PER_PAGE = 4;
  const totalVersions = Array.isArray(userVersions) ? userVersions.length : 0;
  const totalPages =
    totalVersions > 0 ? Math.ceil(totalVersions / VERSIONS_PER_PAGE) : 1;
  if (album._infoVersionPage > totalPages) album._infoVersionPage = 1;
  const page = album._infoVersionPage;
  const start = (page - 1) * VERSIONS_PER_PAGE;
  const end = start + VERSIONS_PER_PAGE;
  const pageVersions = Array.isArray(userVersions)
    ? userVersions.slice(start, end)
    : [];

  if (totalVersions > 0) {
    albumHtml += `<div class='mt-3 text-center'>
      <span class='fw-bold d-block mb-2'>Versions:</span>
      <div class='d-flex flex-wrap justify-content-center gap-2' id='albumInfoVersionsList'>
        ${pageVersions
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
            let trackingHtml = "";
            if (typeof obj === "string") {
              return `<span class='badge bg-info text-dark fs-6 px-3 py-2'>${obj}</span>`;
            } else if (
              obj &&
              typeof obj === "object" &&
              typeof obj.name === "string"
            ) {
              return `<span class='badge bg-info text-dark fs-6 px-3 py-2'>${
                obj.name
              }${
                obj.onTheWay
                  ? " <span class='badge bg-warning text-dark ms-1'>On the Way</span>"
                  : ""
              }${trackingHtml}</span>`;
            } else {
              return `<span class='badge bg-secondary text-light fs-6 px-3 py-2'>Unknown Version</span>`;
            }
          })
          .join("")}
      </div>
      <div class='d-flex justify-content-center align-items-center mt-2'>
        <button class='btn btn-sm btn-outline-secondary me-2' id='albumInfoVersionsPrev' ${
          page === 1 ? "disabled" : ""
        }>Prev</button>
        <span class='mx-2'>Page ${page} of ${totalPages}</span>
        <button class='btn btn-sm btn-outline-secondary ms-2' id='albumInfoVersionsNext' ${
          page === totalPages ? "disabled" : ""
        }>Next</button>
      </div>
    </div>`;
  }
  albumInfoBody.innerHTML = albumHtml;

  // Add event listeners for version badge click (all versions)
  if (totalVersions > 0) {
    setTimeout(() => {
      const prevBtn = document.getElementById("albumInfoVersionsPrev");
      const nextBtn = document.getElementById("albumInfoVersionsNext");
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          album._infoVersionPage = Math.max(1, album._infoVersionPage - 1);
          showAlbumInfoModal(album);
        };
      }
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          album._infoVersionPage = Math.min(
            totalPages,
            album._infoVersionPage + 1
          );
          showAlbumInfoModal(album);
        };
      }

      // Add event delegation for version badge click (all versions)
      const versionBadges = document.querySelectorAll(
        "#albumInfoVersionsList .badge.bg-info.text-dark.fs-6.px-3.py-2"
      );
      versionBadges.forEach((badge, idx) => {
        badge.style.cursor = "pointer";
        badge.addEventListener("click", async (e) => {
          e.stopPropagation();
          // Find version index in current page
          const versionIdx =
            (album._infoVersionPage - 1) * VERSIONS_PER_PAGE + idx;
          if (!Array.isArray(userVersions) || versionIdx >= userVersions.length)
            return;
          let version = userVersions[versionIdx];
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
            "./albumVersionModal.js"
          );
          showAlbumVersionModal(
            {
              name: obj.name || (typeof obj === "string" ? obj : ""),
              trackingCode: obj.trackingCode || "",
              onTheWay: obj.onTheWay || false,
              notes: obj.notes || "",
            },
            async (newData) => {
              let updatedVersion = {};
              if (typeof obj === "object" && obj !== null) {
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
                    newData.name && newData.name.trim() !== ""
                      ? newData.name
                      : obj,
                  ...newData,
                };
              }
              // Update the version in the user's versions array
              userVersions[versionIdx] = updatedVersion;
              // Persist to user_album_versions table
              await upsertUserAlbumVersions(album.id, userVersions);
              // Reload modal to reflect changes
              showAlbumInfoModal(album);
            }
          );
        });
      });
    }, 0);
  }
}
