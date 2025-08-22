import { showAlbumInfoModal } from "./albumModals.js";
let currentGroupAlbumsPage = 1;
const GROUP_ALBUMS_PER_PAGE = 3;

export function showGroupInfoModal(group, members, albums, callbacks) {
  const groupInfoBody = document.getElementById("groupInfoBody");
  let infoHtml = "";
  if (group.image) {
    infoHtml += `<img src="${group.image}" alt="Group Image" class="img-thumbnail mb-3" style="max-width:200px;max-height:200px;display:block;margin:auto;">`;
  }
  infoHtml += `<h4 class="text-center mb-2">${group.name}</h4>`;
  infoHtml += `<div class='text-center mb-3'><button class='btn btn-info btn-sm' id='manageMembersBtn'>Manage Members</button></div>`;
  if (members.length > 0) {
    infoHtml += `<div class='mt-3 text-center'>
      <span class='fw-bold d-block mb-2'>Members (${members.length}):</span>
      <div class='d-flex flex-wrap justify-content-center gap-2'>
        ${members
          .map(
            (m) =>
              `<span class='badge bg-info text-dark fs-6 px-3 py-2 member-badge' data-member-id='${
                m.id
              }' style='cursor:pointer;'>${m.name.replace(/\b\w/g, (c) =>
                c.toUpperCase()
              )}</span>`
          )
          .join("")}
      </div>
    </div>`;
  }
  // Albums pagination
  let albumsHtml = "";
  if (albums.length > 0) {
    const totalPages = Math.ceil(albums.length / GROUP_ALBUMS_PER_PAGE);
    if (currentGroupAlbumsPage > totalPages)
      currentGroupAlbumsPage = totalPages || 1;
    if (currentGroupAlbumsPage < 1) currentGroupAlbumsPage = 1;
    const startIdx = (currentGroupAlbumsPage - 1) * GROUP_ALBUMS_PER_PAGE;
    const endIdx = startIdx + GROUP_ALBUMS_PER_PAGE;
    const pageAlbums = albums.slice(startIdx, endIdx);
    albumsHtml += `<div class='mt-4'>
      <span class='fw-bold d-block mb-2'>Albums:</span>
      <ul class='list-group' id='groupAlbumsList'>
        ${pageAlbums
          .map(
            (album) => `
          <li class='list-group-item bg-dark text-light d-flex align-items-center album-list-item' data-album-id='${
            album.id
          }' style='cursor:pointer;'>
            ${
              album.image
                ? `<img src='${album.image}' alt='Album Cover' class='img-thumbnail me-2' style='max-width:50px;max-height:50px;'>`
                : ""
            }
            <span><strong>${album.album}</strong> (${
              album.releaseDate || ""
            })</span>
          </li>
        `
          )
          .join("")}
      </ul>
    </div>`;
    // Pagination controls
    if (totalPages > 1) {
      albumsHtml += `<div class='d-flex justify-content-center align-items-center mt-3' id='groupAlbumsPagination'>`;
      albumsHtml += `<button class='btn btn-secondary me-2' id='groupAlbumsPrevBtn' ${
        currentGroupAlbumsPage === 1 ? "disabled" : ""
      }>Previous</button>`;
      albumsHtml += `<span class='mx-2'>Page ${currentGroupAlbumsPage} of ${totalPages}</span>`;
      albumsHtml += `<button class='btn btn-secondary ms-2' id='groupAlbumsNextBtn' ${
        currentGroupAlbumsPage === totalPages ? "disabled" : ""
      }>Next</button>`;
      albumsHtml += `</div>`;
    }
  }
  infoHtml += albumsHtml;
  groupInfoBody.innerHTML = infoHtml;
  callbacks.onShow();
  setTimeout(() => {
    document.getElementById("manageMembersBtn").onclick =
      callbacks.onManageMembers;

    // Event delegation for album-list-item clicks (matches albumCollectionPage pattern)
    const groupAlbumsList = document.getElementById("groupAlbumsList");
    if (groupAlbumsList && !groupAlbumsList._albumItemDelegation) {
      groupAlbumsList.addEventListener("click", function (event) {
        const item = event.target.closest(".album-list-item");
        if (item) {
          const albumId = item.getAttribute("data-album-id");
          const album = albums.find((a) => String(a.id) === String(albumId));
          if (album) {
            // Hide group info modal before showing album info modal
            const groupInfoModal = document.getElementById("groupInfoModal");
            if (groupInfoModal && window.bootstrap && window.bootstrap.Modal) {
              const modalInstance =
                window.bootstrap.Modal.getOrCreateInstance(groupInfoModal);
              modalInstance.hide();
            }
            setTimeout(() => {
              showAlbumInfoModal(album);
            }, 350);
          } else if (
            callbacks &&
            typeof callbacks.onAlbumClick === "function"
          ) {
            callbacks.onAlbumClick(albumId);
          }
        }
      });
      groupAlbumsList._albumItemDelegation = true;
    }

    // Event delegation for member-badge clicks
    if (!groupInfoBody._memberBadgeDelegation) {
      groupInfoBody.addEventListener("click", function (event) {
        const badge = event.target.closest(".member-badge");
        if (badge) {
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          const memberId = badge.getAttribute("data-member-id");
          callbacks.onMemberClick(memberId);
        }
      });
      groupInfoBody._memberBadgeDelegation = true;
    }

    // Pagination button events
    const prevBtn = document.getElementById("groupAlbumsPrevBtn");
    const nextBtn = document.getElementById("groupAlbumsNextBtn");
    if (prevBtn)
      prevBtn.onclick = () => {
        currentGroupAlbumsPage--;
        showGroupInfoModal(group, members, albums, callbacks);
      };
    if (nextBtn)
      nextBtn.onclick = () => {
        currentGroupAlbumsPage++;
        showGroupInfoModal(group, members, albums, callbacks);
      };
  }, 100);
}
