// Always open the edit versions modal using Bootstrap's JS API
document.addEventListener("click", function (e) {
  const btn = e.target.closest('[data-bs-target="#editVersionsModal"]');
  if (btn) {
    const modalElem = document.getElementById("editVersionsModal");
    console.log("[DEBUG] Edit Versions button clicked.");
    if (modalElem && window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalElem);
      modal.show();
    }
  }
});
// Handle edit-version event in the edit versions modal
document.addEventListener("edit-version", function (e) {
  // Only handle for the editVersionsList
  const list = document.getElementById("editVersionsList");
  if (!list || !list.contains(e.target)) return;
  const { idx, version } = e.detail;
  const input = document.getElementById("editVersionInput");
  const onTheWay = document.getElementById("editVersionOnTheWay");
  if (input) input.value = version && version.name ? version.name : version;
  if (onTheWay) onTheWay.checked = !!(version && version.onTheWay);
  // Store the index being edited on the list element
  list._editIdx = idx;
});
// --- Edit Versions Modal Logic ---
document.addEventListener("show.bs.modal", function (e) {
  if (e.target && e.target.id === "editVersionsModal") {
    // Copy versions from edit album modal to modal persistent array
    const editVersionsList = document.getElementById("editVersionsList");
    if (editVersionsList) {
      // Already handled by persistent array, but ensure UI is up to date
      renderVersionList(editVersionsList, editVersionsList._versionsArr || []);
    }
    // Clear input fields
    const input = document.getElementById("editVersionInput");
    const onTheWay = document.getElementById("editVersionOnTheWay");
    if (input) input.value = "";
    if (onTheWay) onTheWay.checked = false;
  }
});

// When closing the modal, update the summary in the edit album modal if needed (optional, UI only)
document.addEventListener("hide.bs.modal", function (e) {
  if (e.target && e.target.id === "editVersionsModal") {
    // No action needed, as persistent array is shared
    // Optionally, could update a summary display in the edit album modal
  }
});
// Add version to add album form (always add, never edit/replace)
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "addAlbumVersionBtn") {
    const input = document.getElementById("albumVersionInput");
    const onTheWay = document.getElementById("albumVersionOnTheWay");
    const list = document.getElementById("albumVersionsList");
    if (!input || !list) return;
    const val = input.value.trim();
    if (!val) return;
    // Use persistent array for this session
    let versionsArr = list._versionsArr || [];
    // Prevent duplicates
    if (versionsArr.some((v) => (typeof v === "object" ? v.name : v) === val)) {
      input.value = "";
      if (onTheWay) onTheWay.checked = false;
      input.focus();
      return;
    }
    versionsArr = [
      ...versionsArr,
      { name: val, onTheWay: onTheWay && onTheWay.checked },
    ];
    list._versionsArr = versionsArr;
    renderVersionList(list, versionsArr);
    input.value = "";
    if (onTheWay) onTheWay.checked = false;
    input.focus();
  }
});
// Handle remove album button
document.addEventListener("click", async function (e) {
  const removeBtn = e.target.closest(".remove-btn");
  if (removeBtn) {
    const albumId = removeBtn.getAttribute("data-id");
    if (!albumId) return;
    if (!confirm("Are you sure you want to remove this album?")) return;
    try {
      const { deleteAlbum } = await import("../api/albumApi.js");
      await deleteAlbum(albumId);
      const { loadAndRenderAlbums } = await import("./albumLoader.js");
      loadAndRenderAlbums();
    } catch (err) {
      alert("Failed to remove album.");
    }
  }
});
// Handle add album form submit
document.addEventListener("submit", async function (e) {
  if (e.target && e.target.id === "albumForm") {
    e.preventDefault();
    const groupSelect = document.getElementById("groupSelect");
    const albumInput = document.getElementById("album");
    const yearSelect = document.getElementById("year");
    const albumImage = document.getElementById("albumImage");
    const onTheWay = document.getElementById("onTheWay");
    const albumVersionsList = document.getElementById("albumVersionsList");
    // Get versions from persistent array
    let versionsArr =
      albumVersionsList && albumVersionsList._versionsArr
        ? albumVersionsList._versionsArr
        : [];
    // Validate required fields
    if (!groupSelect.value || !albumInput.value || !yearSelect.value) {
      alert("Please fill in all required fields.");
      return;
    }
    // Add album via API
    try {
      const { addAlbum } = await import("../api/albumApi.js");
      await addAlbum({
        group: groupSelect.value,
        album: albumInput.value,
        year: yearSelect.value,
        image: albumImage.value,
        onTheWay: onTheWay && onTheWay.checked,
        versions: versionsArr,
      });
      // Optionally reset form and refresh list
      e.target.reset();
      if (albumVersionsList) albumVersionsList._versionsArr = [];
      renderVersionList(albumVersionsList, []);
      const { loadAndRenderAlbums } = await import("./albumLoader.js");
      loadAndRenderAlbums();
    } catch (err) {
      alert("Failed to add album.");
    }
  }
});
// Event handler setup for album page
// Import needed functions and state from other modules as needed

import { albums } from "./albumData.js";
import { renderVersionList } from "./albumUI.js";

// Import showAlbumInfoModal dynamically to avoid circular deps
let showAlbumInfoModal = null;
import("../components/albumModals.js").then((mod) => {
  showAlbumInfoModal = mod.showAlbumInfoModal;
});
// Show album info modal when clicking on album list item (not edit/remove)
document.addEventListener("click", function (e) {
  const li = e.target.closest(".album-list-item");
  // Prevent if clicking on edit/remove, version badge, or version pagination controls
  if (
    li &&
    !e.target.classList.contains("edit-btn") &&
    !e.target.classList.contains("remove-btn") &&
    !e.target.closest(
      ".d-flex.justify-content-center.align-items-center.mt-2"
    ) &&
    !e.target.closest(".version-list .badge.bg-info.text-dark.me-1.mb-1")
  ) {
    const albumId = li.getAttribute("data-album-id");
    const album = albums.find((a) => String(a.id) === String(albumId));
    if (album && showAlbumInfoModal) {
      showAlbumInfoModal(album);
      const modalElem = document.getElementById("albumInfoModal");
      if (modalElem && window.bootstrap && window.bootstrap.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(modalElem);
        modal.show();
      }
    }
  }
});

export function setupAlbumEventHandlers() {
  // Event delegation for edit buttons
  document.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const albumId = editBtn.getAttribute("data-id");
      const album = albums.find((a) => String(a.id) === String(albumId));
      if (!album) return;
      // Populate modal fields
      const editGroup = document.getElementById("editGroup");
      const editAlbum = document.getElementById("editAlbum");
      const editYear = document.getElementById("editYear");
      const editImage = document.getElementById("editImage");
      const editOnTheWay = document.getElementById("editOnTheWay");
      if (editGroup) editGroup.value = album.group;
      if (editAlbum) editAlbum.value = album.album;
      if (editYear) editYear.value = album.year;
      if (editImage) editImage.value = album.image || "";
      if (editOnTheWay) editOnTheWay.checked = !!album.onTheWay;
      // Show versions in modal and store in persistent array for this session
      const editVersionsList = document.getElementById("editVersionsList");
      if (editVersionsList) {
        // Store a persistent array on the modal element for this edit session
        editVersionsList._versionsArr = Array.isArray(album.versions)
          ? [...album.versions]
          : [];
        renderVersionList(editVersionsList, editVersionsList._versionsArr);
      }
      // Show modal
      const modalElem = document.getElementById("editAlbumModal");
      if (modalElem) {
        // Set the album ID for use by addEditVersionBtn handler
        modalElem.setAttribute("data-edit-id", album.id);
        if (window.bootstrap && window.bootstrap.Modal) {
          const modal = window.bootstrap.Modal.getOrCreateInstance(modalElem);
          modal.show();
        }
      }
    }
  });
  // Add version to edit modal (always add, never edit/replace)
  document.addEventListener("click", async function (e) {
    if (e.target && e.target.id === "addEditVersionBtn") {
      const input = document.getElementById("editVersionInput");
      const onTheWay = document.getElementById("editVersionOnTheWay");
      const list = document.getElementById("editVersionsList");
      if (!input || !list) return;
      const val = input.value.trim();
      if (!val) return;
      let versionsArr = list._versionsArr || [];
      // If editing, update the version at the index
      if (typeof list._editIdx === "number") {
        // Prevent duplicates except for the one being edited
        if (
          versionsArr.some(
            (v, i) =>
              i !== list._editIdx &&
              (typeof v === "object" ? v.name : v) === val
          )
        ) {
          input.value = "";
          if (onTheWay) onTheWay.checked = false;
          input.focus();
          return;
        }
        versionsArr[list._editIdx] = {
          name: val,
          onTheWay: onTheWay && onTheWay.checked,
        };
        list._editIdx = undefined;
      } else {
        // Prevent duplicates
        if (
          versionsArr.some((v) => (typeof v === "object" ? v.name : v) === val)
        ) {
          input.value = "";
          if (onTheWay) onTheWay.checked = false;
          input.focus();
          return;
        }
        versionsArr = [
          ...versionsArr,
          { name: val, onTheWay: onTheWay && onTheWay.checked },
        ];
      }
      list._versionsArr = versionsArr;
      renderVersionList(list, versionsArr);
      // Immediately update the database
      // Find the album being edited
      const modalElem = document.getElementById("editAlbumModal");
      const albumId = modalElem && modalElem.getAttribute("data-edit-id");
      if (albumId) {
        const album = albums.find((a) => String(a.id) === String(albumId));
        if (album) {
          try {
            const { updateAlbum } = await import("../api/albumApi.js");
            await updateAlbum(album.id, {
              group: album.group,
              album: album.album,
              year: album.year,
              image: album.image,
              onTheWay: album.onTheWay,
              versions: versionsArr,
            });
          } catch (err) {
            console.error(
              "[addEditVersionBtn] Failed to update album versions in database:",
              err
            );
            alert("Failed to update album versions in database.");
          }
        } else {
          console.warn("[addEditVersionBtn] Album not found for id:", albumId);
        }
      } else {
        console.warn("[addEditVersionBtn] No albumId found on editAlbumModal");
      }
      input.value = "";
      if (onTheWay) onTheWay.checked = false;
      input.focus();
    }
  });
  // Handle edit album form submit
  document.addEventListener("submit", async function (e) {
    if (e.target && e.target.id === "editAlbumForm") {
      e.preventDefault();
      const editGroup = document.getElementById("editGroup");
      const editAlbum = document.getElementById("editAlbum");
      const editYear = document.getElementById("editYear");
      const editImage = document.getElementById("editImage");
      const editOnTheWay = document.getElementById("editOnTheWay");
      const editVersionsList = document.getElementById("editVersionsList");
      // Find the album being edited
      const modalElem = document.getElementById("editAlbumModal");
      const albumId = modalElem && modalElem.getAttribute("data-edit-id");
      // Fallback: try to find the last opened edit button
      let album = null;
      if (albumId) {
        album = albums.find((a) => String(a.id) === String(albumId));
      } else {
        // fallback: try to find by group/album/year
        album = albums.find(
          (a) =>
            a.group === editGroup.value &&
            a.album === editAlbum.value &&
            String(a.year) === String(editYear.value)
        );
      }
      if (!album) return;
      // Get versions from persistent array
      let versionsArr =
        editVersionsList && editVersionsList._versionsArr
          ? editVersionsList._versionsArr
          : [];
      // Update album via API
      try {
        const { updateAlbum } = await import("../api/albumApi.js");
        await updateAlbum(album.id, {
          group: editGroup.value,
          album: editAlbum.value,
          year: editYear.value,
          image: editImage.value,
          onTheWay: editOnTheWay && editOnTheWay.checked,
          versions: versionsArr,
        });
        // Optionally close modal and refresh list
        if (window.bootstrap && window.bootstrap.Modal && modalElem) {
          const modal = window.bootstrap.Modal.getOrCreateInstance(modalElem);
          modal.hide();
        }
        // Reload albums
        const { loadAndRenderAlbums } = await import("./albumLoader.js");
        loadAndRenderAlbums();
      } catch (err) {
        alert("Failed to update album.");
      }
    }
  });
}
