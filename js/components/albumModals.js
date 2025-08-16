export function showAlbumInfoModal(album) {
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
  if (Array.isArray(album.versions) && album.versions.length > 0) {
    albumHtml += `<div class='mt-3 text-center'>
      <span class='fw-bold d-block mb-2'>Versions:</span>
      <div class='d-flex flex-wrap justify-content-center gap-2'>
        ${album.versions
          .map(
            (v) =>
              `<span class='badge bg-info text-dark fs-6 px-3 py-2'>${v}</span>`
          )
          .join("")}
      </div>
    </div>`;
  }
  albumInfoBody.innerHTML = albumHtml;
}
