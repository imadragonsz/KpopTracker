// Gallery management modal: select and delete images
import { checkAdminStatus } from "./adminCheck.js";
export async function showGalleryManagementModal({
  title = "Manage Gallery Images",
  groupName = null,
} = {}) {
  // Debug: Log entry and check admin status
  console.log("[GalleryManagementModal] Checking admin status...");
  const isAdmin = await checkAdminStatus();
  console.log("[GalleryManagementModal] Admin check result:", isAdmin);
  if (!isAdmin) {
    console.warn("[GalleryManagementModal] User is not admin. Blocking access.");
    alert("You must be an admin to manage the gallery.");
    return;
  }
  let modal = document.getElementById("galleryManagementModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "galleryManagementModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-dark text-light" style="border-radius: 18px;">
          <div class="modal-header border-info">
            <h5 class="modal-title"><i class="bi bi-images me-2 text-info"></i>${title}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="d-flex flex-wrap align-items-end justify-content-between mb-3 gap-2">
              <div style="min-width:220px;">
                <label for="galleryGroupInput" class="form-label mb-1">Group</label>
                <select id="galleryGroupInput" class="form-control bg-dark text-info border-info"></select>
              </div>
              <form id="galleryUploadForm" class="d-flex align-items-end gap-2 flex-wrap" enctype="multipart/form-data" style="min-width:260px;">
                <div class="input-group">
                  <input type="file" class="form-control bg-dark text-info border-info" id="galleryUploadInput" name="image" accept="image/*" required>
                  <button class="btn btn-outline-info" type="submit"><i class="bi bi-upload"></i> Upload</button>
                </div>
                <div id="galleryUploadStatus" class="form-text text-info mt-1"></div>
              </form>
            </div>
            <div id="galleryManagementStatus" class="mb-2 text-info"></div>
            <div id="galleryManagementGallery" class="row g-3 mb-3"></div>
            <button id="deleteSelectedImagesBtn" class="btn btn-danger w-100 mb-2" disabled><i class="bi bi-trash"></i> Delete Selected</button>
            <div id="galleryManagementPagination" class="mb-3 d-flex justify-content-center align-items-center" style="gap:8px;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const bsModal = window.bootstrap.Modal.getOrCreateInstance(modal);
  bsModal.show();

  const gallery = modal.querySelector("#galleryManagementGallery");
  const status = modal.querySelector("#galleryManagementStatus");
  const pagination = modal.querySelector("#galleryManagementPagination");
  const deleteBtn = modal.querySelector("#deleteSelectedImagesBtn");
  const groupInput = modal.querySelector("#galleryGroupInput");
  const uploadForm = modal.querySelector("#galleryUploadForm");
  const uploadInput = modal.querySelector("#galleryUploadInput");
  const uploadStatus = modal.querySelector("#galleryUploadStatus");

  let imagesByGroup = {};
  let groupNames = [];
  let selectedGroup = null;
  let page = 1;
  const PAGE_SIZE = 10;
  let selectedImages = new Set();

  function renderGallery() {
    gallery.innerHTML = "";
    pagination.innerHTML = "";
    deleteBtn.disabled = selectedImages.size === 0;
    if (
      !selectedGroup ||
      !imagesByGroup[selectedGroup] ||
      !imagesByGroup[selectedGroup].length
    ) {
      gallery.innerHTML =
        '<div class="col-12 text-center text-muted py-5"><i class="bi bi-image fs-1 mb-2"></i><br>No images for this group.<br><small>Upload images to get started!</small></div>';
      return;
    }
    const images = imagesByGroup[selectedGroup];
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    images.slice(start, end).forEach((url) => {
      // Card container
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2";
      const card = document.createElement("div");
      card.className =
        "card bg-dark text-light shadow-sm position-relative gallery-card h-100 border-info";
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.15s, box-shadow 0.15s";
      card.onmouseover = () => {
        card.style.transform = "scale(1.04)";
        card.style.boxShadow = "0 4px 24px #43c6ac33";
      };
      card.onmouseout = () => {
        card.style.transform = "none";
        card.style.boxShadow = "";
      };
      // 1x1 aspect ratio container
      const aspectBox = document.createElement("div");
      aspectBox.style.position = "relative";
      aspectBox.style.width = "100%";
      aspectBox.style.paddingTop = "100%";
      aspectBox.style.overflow = "hidden";
      aspectBox.style.background = "#181a20";
      // Image
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.className = "card-img-top rounded-top";
      img.style.position = "absolute";
      img.style.top = 0;
      img.style.left = 0;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.alt = "Gallery image";
      img.onclick = (e) => {
        e.stopPropagation();
        // Lightbox preview
        showImageLightbox(url);
      };
      aspectBox.appendChild(img);
      card.appendChild(aspectBox);
      // Card body with metadata
      const cardBody = document.createElement("div");
      cardBody.className = "card-body py-2 px-2 text-center";
      // Filename (extract from url)
      const filename = url.split("/").pop();
      const meta = document.createElement("div");
      meta.className = "small text-info text-truncate";
      meta.title = filename;
      meta.textContent = filename;
      cardBody.appendChild(meta);
      card.appendChild(cardBody);
      // Selection overlay
      if (selectedImages.has(url)) {
        card.style.outline = "3px solid #ff6f61";
        const check = document.createElement("span");
        check.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
        check.style.position = "absolute";
        check.style.top = "8px";
        check.style.right = "8px";
        check.style.color = "#ff6f61";
        check.style.fontSize = "1.5em";
        card.appendChild(check);
      }
      card.onclick = () => {
        if (selectedImages.has(url)) {
          selectedImages.delete(url);
        } else {
          selectedImages.add(url);
        }
        renderGallery();
      };
      col.appendChild(card);
      gallery.appendChild(col);
    });
    // Lightbox preview function
    function showImageLightbox(url) {
      let lightbox = document.getElementById("galleryImageLightbox");
      if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "galleryImageLightbox";
        lightbox.style.position = "fixed";
        lightbox.style.top = 0;
        lightbox.style.left = 0;
        lightbox.style.width = "100vw";
        lightbox.style.height = "100vh";
        lightbox.style.background = "rgba(0,0,0,0.85)";
        lightbox.style.zIndex = 2000;
        lightbox.style.display = "flex";
        lightbox.style.alignItems = "center";
        lightbox.style.justifyContent = "center";
        lightbox.innerHTML = `<img src="${url}" style="max-width:90vw; max-height:80vh; border-radius:12px; box-shadow:0 8px 32px #43c6ac55; border:4px solid #43c6ac;" alt="Preview" />
        <button style="position:absolute;top:32px;right:48px;font-size:2.5em;background:none;border:none;color:#fff;z-index:10;" title="Close"><i class="bi bi-x-circle-fill"></i></button>`;
        document.body.appendChild(lightbox);
        lightbox.querySelector("button").onclick = () => lightbox.remove();
        lightbox.onclick = (e) => {
          if (e.target === lightbox) lightbox.remove();
        };
      }
    }
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
    // Update datalist for group suggestions
    // Populate select with group options
    groupInput.innerHTML = groupNames.map(g => `<option value="${g}">${g}</option>`).join("");
    // Set selected value
    groupInput.value = selectedGroup || "";
    // Initialize Choices.js if not already
    if (!groupInput.choicesInstance) {
      if (window.Choices) {
        groupInput.choicesInstance = new window.Choices(groupInput, {
          searchEnabled: true,
          itemSelectText: '',
          shouldSort: false,
          placeholder: true,
          placeholderValue: 'Select or search group...'
        });
        // Inject dark theme CSS if not already present
        if (!document.getElementById('choices-dark-theme')) {
          const style = document.createElement('style');
          style.id = 'choices-dark-theme';
          style.textContent = `
            .choices.choices-dark, .choices.choices-dark .choices__inner, .choices.choices-dark .choices__list--dropdown, .choices.choices-dark .choices__list[aria-expanded] {
              background: #181a20 !important;
              color: #e0e0e0 !important;
              border-color: #43c6ac !important;
            }
            .choices.choices-dark .choices__item--selectable, .choices.choices-dark .choices__item {
              color: #e0e0e0 !important;
              background: #181a20 !important;
            }
            .choices.choices-dark .choices__item--selectable.is-highlighted, .choices.choices-dark .choices__item--selectable.is-selected {
              background: #23272f !important;
              color: #43c6ac !important;
            }
            .choices.choices-dark .choices__input {
              background: #181a20 !important;
              color: #e0e0e0 !important;
            }
            .choices.choices-dark .choices__placeholder {
              color: #43c6ac !important;
              opacity: 1 !important;
            }
            .choices.choices-dark .choices__list--dropdown .choices__item--selectable {
              border-bottom: 1px solid #23272f !important;
            }
            .choices.choices-dark .choices__list--dropdown {
              box-shadow: 0 4px 24px #43c6ac33 !important;
            }
          `;
          document.head.appendChild(style);
        }
        // Add .choices-dark to the parent .choices container
        setTimeout(() => {
          const container = groupInput.closest('.choices') || groupInput.parentNode.querySelector('.choices');
          if (container) container.classList.add('choices-dark');
        }, 0);
      }
    } else {
      groupInput.choicesInstance.setChoices(
        groupNames.map(g => ({ value: g, label: g })),
        'value', 'label', true
      );
      groupInput.choicesInstance.setChoiceByValue(selectedGroup || "");
    }
  }

  function updateGalleryView() {
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
      if (groupName && groupNames.includes(groupName)) {
        selectedGroup = groupName;
      } else {
        selectedGroup = groupNames[0] || null;
      }
      page = 1;
      selectedImages.clear();
      updateGalleryView();
    });

  // Group input change handler
  groupInput.addEventListener("change", () => {
    const val = groupInput.value;
    selectedGroup = val;
    page = 1;
    selectedImages.clear();
    updateGalleryView();
  });

  // Upload form handler
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!uploadInput.files.length) return;
    const file = uploadInput.files[0];
    const groupVal = groupInput.value.trim() || "Ungrouped";
    const formData = new FormData();
    formData.append("image", file);
    formData.append("group", groupVal);
    uploadStatus.textContent = "Uploading...";
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      uploadStatus.textContent = "Upload successful!";
      uploadInput.value = "";
      // Reload gallery
      fetch("/api/list-uploads")
        .then((res) => res.json())
        .then((data) => {
          imagesByGroup = data.imagesByGroup || {};
          groupNames = Object.keys(imagesByGroup);
          selectedGroup = groupVal;
          page = 1;
          selectedImages.clear();
          updateGalleryView();
        });
    } catch (err) {
      uploadStatus.textContent = "Upload failed. Please try again.";
    }
  });

  // Delete selected images
  deleteBtn.onclick = async () => {
    if (!selectedImages.size) return;
    if (
      !confirm(
        `Delete ${selectedImages.size} selected image(s)? This cannot be undone.`
      )
    )
      return;
    status.textContent = "Deleting...";
    try {
      const res = await fetch("/api/delete-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: Array.from(selectedImages),
          group: selectedGroup,
        }),
      });
      if (!res.ok) throw new Error("Delete failed");
      status.textContent = "Delete successful!";
      // Reload gallery
      fetch("/api/list-uploads")
        .then((res) => res.json())
        .then((data) => {
          imagesByGroup = data.imagesByGroup || {};
          groupNames = Object.keys(imagesByGroup);
          selectedImages.clear();
          if (
            !imagesByGroup[selectedGroup] ||
            !imagesByGroup[selectedGroup].length
          ) {
            selectedGroup = groupNames[0] || null;
          }
          page = 1;
          updateGalleryView();
        });
    } catch (err) {
      status.textContent = "Delete failed. Please try again.";
    }
  };
}
// galleryModal.js
// Shows a modal with a gallery of available images and an upload option

export async function showGalleryModal({
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
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-dark text-light" style="border-radius: 18px;">
          <div class="modal-header border-info">
            <h5 class="modal-title"><i class="bi bi-images me-2 text-info"></i>${title}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="d-flex flex-wrap align-items-end justify-content-between mb-3 gap-2">
              <div style="min-width:220px;">
                <label for="galleryModalGroupInput" class="form-label mb-1">Group</label>
                <select id="galleryModalGroupInput" class="form-control bg-dark text-info border-info"></select>
              </div>
            </div>
            <div id="galleryModalStatus" class="mb-2 text-info"></div>
            <div id="galleryModalGallery" class="row g-3 mb-3"></div>
            <div id="galleryModalPagination" class="mb-3 d-flex justify-content-center align-items-center" style="gap:8px;"></div>
            <hr/>
            <form id="galleryModalUploadForm" class="d-flex align-items-end gap-2 flex-wrap" enctype="multipart/form-data" style="min-width:260px;">
              <label for="galleryModalFile" class="form-label mb-1">Upload New Image</label>
              <div class="input-group">
                <input type="file" id="galleryModalFile" class="form-control bg-dark text-info border-info" accept="image/*" required />
                <button type="submit" class="btn btn-outline-info"><i class="bi bi-upload"></i> Upload</button>
              </div>
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
  const groupInput = modal.querySelector("#galleryModalGroupInput");
  groupInput.classList.add('choices-dark');

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
        '<div class="col-12 text-center text-muted py-5"><i class="bi bi-image fs-1 mb-2"></i><br>No images for this group.<br><small>Upload images to get started!</small></div>';
      return;
    }
    const images = imagesByGroup[selectedGroup];
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    images.slice(start, end).forEach((url) => {
      // Card container
      const col = document.createElement("div");
      col.className = "col-6 col-sm-4 col-md-3 col-lg-2";
      const card = document.createElement("div");
      card.className =
        "card bg-dark text-light shadow-sm position-relative gallery-card h-100 border-info";
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.15s, box-shadow 0.15s";
      card.onmouseover = () => {
        card.style.transform = "scale(1.04)";
        card.style.boxShadow = "0 4px 24px #43c6ac33";
      };
      card.onmouseout = () => {
        card.style.transform = "none";
        card.style.boxShadow = "";
      };
      // Image
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.className = "card-img-top rounded-top";
      img.style.height = "120px";
      img.style.objectFit = "cover";
      img.alt = "Gallery image";
      img.onclick = (e) => {
        e.stopPropagation();
        // Lightbox preview
        showImageLightbox(url);
      };
      card.appendChild(img);
      // Card body with metadata
      const cardBody = document.createElement("div");
      cardBody.className = "card-body py-2 px-2 text-center";
      // Filename (extract from url)
      const filename = url.split("/").pop();
      const meta = document.createElement("div");
      meta.className = "small text-info text-truncate";
      meta.title = filename;
      meta.textContent = filename;
      cardBody.appendChild(meta);
      card.appendChild(cardBody);
      // Card click selects image for use
      card.onclick = (e) => {
        // Prevent lightbox if image was clicked
        if (e.target === img) return;
        if (onSelect) onSelect(url);
        bsModal.hide();
      };
      col.appendChild(card);
      gallery.appendChild(col);
    });
    // Lightbox preview function
    function showImageLightbox(url) {
      let lightbox = document.getElementById("galleryImageLightbox");
      if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "galleryImageLightbox";
        lightbox.style.position = "fixed";
        lightbox.style.top = 0;
        lightbox.style.left = 0;
        lightbox.style.width = "100vw";
        lightbox.style.height = "100vh";
        lightbox.style.background = "rgba(0,0,0,0.85)";
        lightbox.style.zIndex = 2000;
        lightbox.style.display = "flex";
        lightbox.style.alignItems = "center";
        lightbox.style.justifyContent = "center";
        lightbox.innerHTML = `<img src="${url}" style="max-width:90vw; max-height:80vh; border-radius:12px; box-shadow:0 8px 32px #43c6ac55; border:4px solid #43c6ac;" alt="Preview" />
          <button style="position:absolute;top:32px;right:48px;font-size:2.5em;background:none;border:none;color:#fff;z-index:10;" title="Close"><i class="bi bi-x-circle-fill"></i></button>`;
        document.body.appendChild(lightbox);
        lightbox.querySelector("button").onclick = () => lightbox.remove();
        lightbox.onclick = (e) => {
          if (e.target === lightbox) lightbox.remove();
        };
      }
    }
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

  function renderGroupDropdown() {
    // Populate select with group options
    groupInput.innerHTML = groupNames.map(g => `<option value="${g}">${g}</option>`).join("");
    groupInput.value = selectedGroup || "";
    // Initialize Choices.js if not already
    if (!groupInput.choicesInstance) {
      if (window.Choices) {
        groupInput.choicesInstance = new window.Choices(groupInput, {
          searchEnabled: true,
          itemSelectText: '',
          shouldSort: false,
          placeholder: true,
          placeholderValue: 'Select or search group...'
        });
        // Inject dark theme CSS if not already present
        if (!document.getElementById('choices-dark-theme')) {
          const style = document.createElement('style');
          style.id = 'choices-dark-theme';
          style.textContent = `
            .choices.choices-dark, .choices.choices-dark .choices__inner, .choices.choices-dark .choices__list--dropdown, .choices.choices-dark .choices__list[aria-expanded] {
              background: #181a20 !important;
              color: #e0e0e0 !important;
              border-color: #43c6ac !important;
            }
            .choices.choices-dark .choices__item--selectable, .choices.choices-dark .choices__item {
              color: #e0e0e0 !important;
              background: #181a20 !important;
            }
            .choices.choices-dark .choices__item--selectable.is-highlighted, .choices.choices-dark .choices__item--selectable.is-selected {
              background: #23272f !important;
              color: #43c6ac !important;
            }
            .choices.choices-dark .choices__input {
              background: #181a20 !important;
              color: #e0e0e0 !important;
            }
            .choices.choices-dark .choices__placeholder {
              color: #43c6ac !important;
              opacity: 1 !important;
            }
            .choices.choices-dark .choices__list--dropdown .choices__item--selectable {
              border-bottom: 1px solid #23272f !important;
            }
            .choices.choices-dark .choices__list--dropdown {
              box-shadow: 0 4px 24px #43c6ac33 !important;
            }
          `;
          document.head.appendChild(style);
        }
        // Add .choices-dark to the parent .choices container
        setTimeout(() => {
          const container = groupInput.closest('.choices') || groupInput.parentNode.querySelector('.choices');
          if (container) container.classList.add('choices-dark');
        }, 0);
      }
    } else {
      groupInput.choicesInstance.setChoices(
        groupNames.map(g => ({ value: g, label: g })),
        'value', 'label', true
      );
      groupInput.choicesInstance.setChoiceByValue(selectedGroup || "");
    }
  }

  function updateGalleryView() {
    renderGroupDropdown();
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

  // Group input change handler
  groupInput.addEventListener("change", () => {
    const val = groupInput.value;
    selectedGroup = val;
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
