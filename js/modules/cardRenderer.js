// cardRenderer.js
// Functions to generate card HTML for albums and groups

export function albumCardHtml(album, cardWidth, alreadyOwned) {
  return `
    <div class="card h-100 shadow-sm" style="width: ${cardWidth}px; cursor:pointer;">
      <img src="${
        album.image || "../assets/images/default_album.png"
      }" class="card-img-top browse-group-img" alt="${album.album}">
      <div class="card-body d-flex flex-column p-2">
        <h6 class="card-title mb-1">${album.album}</h6>
        <p class="card-text mb-1"><span class="fw-bold">Group:</span> ${
          album.group
        }</p>
        <p class="card-text mb-1"><span class="fw-bold">Release Date:</span> ${
          album.releaseDate || album.year
        }</p>
        ${
          alreadyOwned
            ? '<div class="alert alert-success py-1 px-2 mb-2">Already in your collection</div>'
            : `<button class="btn btn-info btn-sm mt-auto add-to-collection-btn" data-album-id="${album.id}">Add to My Collection</button>`
        }
      </div>
    </div>
  `;
}

export function groupCardHtml(group, cardWidth, alreadyOwned, isSelected) {
  return `
    <div class="card h-100 shadow-sm${
      isSelected ? " border-primary border-2" : ""
    }" style="width: ${cardWidth}px; cursor:pointer;">
      <img src="${
        group.image || "../assets/images/default_album.png"
      }" class="card-img-top browse-group-img" alt="${group.name}">
      <div class="card-body d-flex flex-column p-2">
        <h6 class="card-title mb-1">${group.name}</h6>
        <p class="card-text mb-1"><span class="fw-bold">Debut:</span> ${
          group.debutDate || group.debut_year || "—"
        }</p>
        ${
          alreadyOwned
            ? '<div class="alert alert-success py-1 px-2 mb-2">Already in your collection</div>'
            : `<button class="btn btn-info btn-sm mt-auto add-to-group-collection-btn" data-group-id="${group.id}">Add Group</button>`
        }
      </div>
    </div>
  `;
}

export function allGroupsCardHtml(cardWidth, isSelected) {
  return `
    <div class="card h-100 shadow-sm${
      isSelected ? " border-primary border-2" : ""
    }" style="width: ${cardWidth}px; cursor:pointer;">
      <div class="card-body d-flex flex-column align-items-center justify-content-center p-2" style="height: 180px;">
        <h6 class="card-title mb-1">All Groups</h6>
      </div>
    </div>
  `;
}
