// js/components/editGroupModal.js
// Dynamically injects the Edit Group Modal into the DOM if not present
export function ensureEditGroupModal() {
  if (document.getElementById("editGroupModal")) return;
  const modalHtml = `
    <div class="modal fade" id="editGroupModal" tabindex="-1" aria-labelledby="editGroupModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header">
            <h5 class="modal-title" id="editGroupModalLabel">Edit Group</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="editGroupForm">
              <div class="mb-3">
                <label for="editGroupName" class="form-label">Group Name</label>
                <input type="text" class="form-control" id="editGroupName" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Group Image</label>
                <button type="button" class="btn btn-outline-info w-100" id="showEditGroupImageModal">Choose Existing Image</button>
                <input type="hidden" id="editGroupImage" />
              </div>
              <div class="mb-3">
                <label for="editGroupNotes" class="form-label">Notes/Comments</label>
                <textarea class="form-control" id="editGroupNotes" rows="2"></textarea>
              </div>
              <button type="submit" class="btn btn-info fw-bold">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  const temp = document.createElement("div");
  temp.innerHTML = modalHtml;
  document.body.appendChild(temp.firstElementChild);

  // Add event listener for the image picker button
  setTimeout(() => {
    const btn = document.getElementById("showEditGroupImageModal");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        // Get the current group name from the input
        const groupNameInput = document.getElementById("editGroupName");
        const groupName = groupNameInput ? groupNameInput.value.trim() : null;
        import("./galleryModal.js").then(({ showGalleryModal }) => {
          showGalleryModal({
            onSelect: async (imgUrl) => {
              const input = document.getElementById("editGroupImage");
              if (input) input.value = imgUrl;
              // Immediately update the group in the database
              const name = groupNameInput ? groupNameInput.value.trim() : "";
              const notesInput = document.getElementById("editGroupNotes");
              const notes = notesInput ? notesInput.value.trim() : "";
              const groupId = window.editingGroupId;
              if (groupId && name) {
                // Dynamically import updateGroup if not available
                let updateGroupFn = window.updateGroup;
                if (!updateGroupFn) {
                  const mod = await import("../api/groupApi.js");
                  updateGroupFn = mod.updateGroup;
                }
                await updateGroupFn(groupId, name, imgUrl, notes);
                // Rerender the album list with fresh data
                if (window.localStorage) {
                  localStorage.removeItem("groups");
                }
                // Always fetch fresh data and render
                let fetchGroupsFn = window.fetchGroups;
                let renderGroupsFn = window.renderGroups;
                if (!fetchGroupsFn || !renderGroupsFn) {
                  const mgmt = await import("../pages/groupManagement.js");
                  fetchGroupsFn = mgmt.fetchGroups;
                  renderGroupsFn = mgmt.renderGroups;
                }
                if (fetchGroupsFn && renderGroupsFn) {
                  const groups = await fetchGroupsFn();
                  if (window.setCachedData) setCachedData("groups", groups);
                  renderGroupsFn(groups);
                }
              }
            },
            context: "edit-group",
            groupName: groupName || undefined,
          });
        });
      });
    }
  }, 0);
}
