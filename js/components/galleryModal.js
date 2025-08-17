// galleryModal.js
// Shows a modal with a gallery of available images and an upload option

export function showGalleryModal({
  onSelect,
  title = "Select or Upload Image",
  groupName = null,
}) {
  let modal = document.getElementById("galleryModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "galleryModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="galleryModalStatus" class="mb-2 text-info"></div>
            <div id="galleryModalGallery" class="d-flex flex-wrap mb-3" style="gap:12px;"></div>
            <div id="galleryModalPagination" class="mb-3 d-flex justify-content-center align-items-center" style="gap:8px;"></div>
            <hr/>
            <form id="galleryModalUploadForm">
              <label for="galleryModalFile" class="form-label">Upload New Image</label>
              <input type="file" id="galleryModalFile" class="form-control mb-2" accept="image/*" required />
              <button type="submit" class="btn btn-info">Upload</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const bsModal = window.bootstrap.Modal.getOrCreateInstance(modal);
  bsModal.show();

  const gallery = modal.querySelector("#galleryModalGallery");
  const status = modal.querySelector("#galleryModalStatus");
  const pagination = modal.querySelector("#galleryModalPagination");

  let imagesByGroup = {};
  let groupNames = [];
  let selectedGroup = null;
  let page = 1;
  const PAGE_SIZE = 10;

  function renderGallery() {
    gallery.innerHTML = "";
    pagination.innerHTML = "";
    if (
      !selectedGroup ||
      !imagesByGroup[selectedGroup] ||
      !imagesByGroup[selectedGroup].length
    ) {
      gallery.innerHTML =
        '<div class="text-muted">No images for this group.</div>';
      return;
    }
    const images = imagesByGroup[selectedGroup];
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    images.slice(start, end).forEach((url) => {
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.style.width = "90px";
      img.style.height = "90px";
      img.style.objectFit = "cover";
      img.style.cursor = "pointer";
      img.className = "rounded border mb-2";
      img.onclick = () => {
        // Immediately update the group image input and close the modal
        if (onSelect) onSelect(url);
        bsModal.hide();
      };
      gallery.appendChild(img);
    });
    // Pagination controls
    const totalPages = Math.ceil(images.length / PAGE_SIZE);
    if (totalPages > 1) {
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "btn btn-outline-secondary btn-sm";
      prevBtn.textContent = "Prev";
      prevBtn.disabled = page === 1;
      prevBtn.onclick = () => {
        page = Math.max(1, page - 1);
        renderGallery();
      };
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "btn btn-outline-secondary btn-sm";
      nextBtn.textContent = "Next";
      nextBtn.disabled = page === totalPages;
      nextBtn.onclick = () => {
        page = Math.min(totalPages, page + 1);
        renderGallery();
      };
      const pageInfo = document.createElement("span");
      pageInfo.className = "mx-2";
      pageInfo.textContent = `Page ${page} of ${totalPages}`;
      pagination.appendChild(prevBtn);
      pagination.appendChild(pageInfo);
      pagination.appendChild(nextBtn);
    }
  }

  function renderGroupFolders() {
    // Show group folders as buttons
    const folderBar = document.createElement("div");
    folderBar.className = "mb-3 d-flex flex-wrap align-items-center";
    groupNames.forEach((g) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-sm me-2 mb-2 ${
        selectedGroup === g ? "btn-info" : "btn-outline-info"
      }`;
      btn.textContent = g;
      btn.onclick = () => {
        selectedGroup = g;
        page = 1;
        updateGalleryView();
      };
      folderBar.appendChild(btn);
    });
    gallery.parentNode.insertBefore(folderBar, gallery);
  }

  function updateGalleryView() {
    // Remove any existing folder bar
    const prevBar = gallery.parentNode.querySelector(
      ".mb-3.d-flex.flex-wrap.align-items-center"
    );
    if (prevBar) prevBar.remove();
    renderGroupFolders();
    renderGallery();
  }

  // Load gallery
  gallery.innerHTML = "Loading...";
  fetch("/api/list-uploads")
    .then((res) => res.json())
    .then((data) => {
      imagesByGroup = data.imagesByGroup || {};
      groupNames = Object.keys(imagesByGroup);
      // Use provided groupName if available and exists, else fallback
      if (groupName && groupNames.includes(groupName)) {
        selectedGroup = groupName;
      } else {
        selectedGroup = groupNames[0] || null;
      }
      page = 1;
      updateGalleryView();
    });

  // Handle upload
  const uploadForm = modal.querySelector("#galleryModalUploadForm");
  uploadForm.onsubmit = async (e) => {
    e.preventDefault();
    const fileInput = modal.querySelector("#galleryModalFile");
    if (!fileInput.files || !fileInput.files[0]) return;
    status.textContent = "Uploading...";
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);
    // Use provided groupName if available, else try to detect
    let uploadGroupName = groupName;
    if (!uploadGroupName) {
      uploadGroupName = "Ungrouped";
      const groupInput =
        document.querySelector("#editGroup") ||
        document.querySelector("#groupSelect") ||
        document.querySelector("#editGroupSelect") ||
        document.querySelector("#groupName") ||
        document.querySelector("#editGroupName");
      if (groupInput && groupInput.value) uploadGroupName = groupInput.value;
    }
    formData.append("group", uploadGroupName);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      status.textContent = "Upload successful!";
      // Reload gallery to update group folders
      fetch("/api/list-uploads")
        .then((res) => res.json())
        .then((data) => {
          imagesByGroup = data.imagesByGroup || {};
          groupNames = Object.keys(imagesByGroup);
          selectedGroup = uploadGroupName;
          page = 1;
          updateGalleryView();
        });
      fileInput.value = "";
    } catch (err) {
      status.textContent = "Upload failed. Please try again.";
    }
  };
}
