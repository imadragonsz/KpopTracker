// js/components/albumVersionModal.js

// Dynamically creates and shows a modal for adding/editing a tracking code for a version
import { getTrackingUrl } from "./albumModals.js";

export function showAlbumVersionModal(
  { name = "", trackingCode = "", onTheWay = false, notes = "" } = {},
  onSave
) {
  // Close any open Bootstrap modals
  document.querySelectorAll(".modal.show").forEach((openModal) => {
    if (window.bootstrap && window.bootstrap.Modal.getInstance(openModal)) {
      window.bootstrap.Modal.getInstance(openModal).hide();
    }
  });

  // Remove any existing modal
  let modalElem = document.getElementById("albumVersionModal");
  if (modalElem) modalElem.remove();

  // Create modal HTML
  let trackingSection = "";
  if (onTheWay) {
    const trackingUrl = getTrackingUrl(trackingCode);
    trackingSection = `
      <div class="mb-3" id="trackingSection">
        <label for="albumVersionTrackingInput" class="form-label">Tracking Code</label>
        <input type="text" class="form-control" id="albumVersionTrackingInput" value="${
          trackingCode || ""
        }" placeholder="Enter tracking code">
        <div id='trackingLinkContainer'>${
          trackingCode && trackingUrl
            ? `<div class='mt-2'><a href='${trackingUrl}' target='_blank' rel='noopener' class='btn btn-sm btn-warning'>Track Package</a></div>`
            : ""
        }</div>
      </div>
    `;
  }
  modalElem = document.createElement("div");
  modalElem.className = "modal fade";
  modalElem.id = "albumVersionModal";
  modalElem.tabIndex = -1;
  modalElem.setAttribute("aria-labelledby", "albumVersionModalLabel");
  modalElem.setAttribute("aria-hidden", "true");
  modalElem.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content bg-dark text-light">
        <div class="modal-header">
          <h5 class="modal-title" id="albumVersionModalLabel">Edit Version Details</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="albumVersionForm">
            <div class="mb-3">
              <label for="albumVersionNameInput" class="form-label">Version Name</label>
              <input type="text" class="form-control" id="albumVersionNameInput" value="${
                name || ""
              }" placeholder="Enter version name">
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="albumVersionOnTheWayInput" ${
                onTheWay ? "checked" : ""
              }>
              <label class="form-check-label" for="albumVersionOnTheWayInput">On the Way</label>
            </div>
            ${trackingSection}
            <div class="mb-3">
              <label for="albumVersionNotesInput" class="form-label">Notes</label>
              <textarea class="form-control" id="albumVersionNotesInput" rows="2" placeholder="Add any notes here...">${
                notes || ""
              }</textarea>
            </div>
            <button type="submit" class="btn btn-info">Save</button>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalElem);

  // Add submit handler
  const form = modalElem.querySelector("#albumVersionForm");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("albumVersionNameInput").value.trim();
    const onTheWayChecked = document.getElementById(
      "albumVersionOnTheWayInput"
    ).checked;
    let code = "";
    if (onTheWayChecked) {
      const codeInput = document.getElementById("albumVersionTrackingInput");
      if (codeInput) code = codeInput.value.trim();
    }
    const notesVal = document
      .getElementById("albumVersionNotesInput")
      .value.trim();
    if (onSave)
      onSave({
        name,
        trackingCode: code,
        onTheWay: onTheWayChecked,
        notes: notesVal,
      });
    bootstrap.Modal.getInstance(modalElem).hide();
  });

  // Show/hide tracking section on checkbox change
  const onTheWayCheckbox = modalElem.querySelector(
    "#albumVersionOnTheWayInput"
  );
  onTheWayCheckbox.addEventListener("change", function () {
    const checked = this.checked;
    const formBody = modalElem.querySelector("#albumVersionForm");
    if (checked) {
      // Insert tracking section after the checkbox
      const trackingDiv = document.createElement("div");
      trackingDiv.className = "mb-3";
      trackingDiv.id = "trackingSection";
      trackingDiv.innerHTML = `
        <label for="albumVersionTrackingInput" class="form-label">Tracking Code</label>
        <input type="text" class="form-control" id="albumVersionTrackingInput" value="" placeholder="Enter tracking code">
        <div id='trackingLinkContainer'></div>
      `;
      const notesDiv = modalElem.querySelector(
        "#albumVersionNotesInput"
      ).parentElement;
      formBody.insertBefore(trackingDiv, notesDiv);
      // Add live update for tracking link
      const trackingInput = trackingDiv.querySelector(
        "#albumVersionTrackingInput"
      );
      const trackingLinkContainer = trackingDiv.querySelector(
        "#trackingLinkContainer"
      );
      trackingInput.addEventListener("input", function () {
        const code = trackingInput.value.trim();
        const url = getTrackingUrl(code);
        trackingLinkContainer.innerHTML =
          code && url
            ? `<div class='mt-2'><a href='${url}' target='_blank' rel='noopener' class='btn btn-sm btn-warning'>Track Package</a></div>`
            : "";
      });
    } else {
      const trackingInput = modalElem.querySelector(
        "#albumVersionTrackingInput"
      );
      if (trackingInput) {
        trackingInput.parentElement.remove();
      }
    }
  });
  // Show modal
  const modalInstance = new bootstrap.Modal(modalElem);
  modalInstance.show();
}
