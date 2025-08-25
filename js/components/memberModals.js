import { showGalleryModal } from "./galleryModal.js";
// Expose for global use
window.showMemberManagementModal = showMemberManagementModal;
export function showMemberInfoModal(member) {
  const memberInfoBody = document.getElementById("memberInfoBody");
  const modalEl = document.getElementById("memberInfoModal");
  if (!memberInfoBody || !modalEl) return;
  let memberHtml = "";
  if (!member) {
    memberHtml = `<div class='text-center text-danger'>Member info not available.</div>`;
  } else {
    if (member.image) {
      memberHtml += `<img src='${member.image}' alt='Member Image' class='img-thumbnail mb-3' style='max-width:160px;max-height:160px;display:block;margin:auto;'>`;
    }
    const displayName = member.name
      ? member.name.replace(/\b\w/g, (c) => c.toUpperCase())
      : "";
    memberHtml += `<h4 class='text-center mb-2'>${displayName}</h4>`;
    // Age calculation
    if (member.birthday) {
      const birthDate = new Date(member.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      memberHtml += `<div class='mb-2 text-center'><span class='fw-bold'>Age:</span> ${age} (Born: ${birthDate.toLocaleDateString()})</div>`;
    }
    if (member.height) {
      memberHtml += `<div class='mb-2 text-center'><span class='fw-bold'>Height:</span> ${member.height} cm</div>`;
    }
    if (member.info) {
      memberHtml += `<div class='mb-2 text-center'><span class='fw-bold'>Info:</span> ${member.info}</div>`;
    }
  }
  memberInfoBody.innerHTML = memberHtml;
  // Hide group info modal if open
  const groupInfoModalEl = document.getElementById("groupInfoModal");
  if (groupInfoModalEl && window.bootstrap && window.bootstrap.Modal) {
    const groupInfoModal =
      window.bootstrap.Modal.getOrCreateInstance(groupInfoModalEl);
    groupInfoModal.hide();
  }
  // Show the member info modal after a short delay to avoid stacking issues
  setTimeout(() => {
    if (window.bootstrap && window.bootstrap.Modal) {
      const memberInfoModal =
        window.bootstrap.Modal.getOrCreateInstance(modalEl);
      memberInfoModal.show();
      // Accessibility: focus modal
      modalEl.focus && modalEl.focus();
    }
  }, 150);
}

export function showMemberManagementModal(members = [], onSave) {
  const modal = document.getElementById("manageMembersModal");
  const modalBody = modal.querySelector(".modal-body");
  let membersListHtml = "";
  if (Array.isArray(members) && members.length > 0) {
    membersListHtml =
      '<div class="mb-3"><label class="form-label">Current Members</label><ul class="list-group mb-2">';
    members.forEach(function (m) {
      membersListHtml +=
        '<li class="list-group-item d-flex align-items-center member-list-item" style="cursor:pointer;" data-member-id="' +
        m.id +
        '">';
      if (m.image) {
        membersListHtml +=
          '<img src="' +
          m.image +
          '" alt="Member Image" style="max-width:32px;max-height:32px;border-radius:6px;margin-right:10px;">';
      }
      membersListHtml +=
        '<span class="flex-grow-1">' +
        (m.name
          ? m.name.replace(/\b\w/g, function (c) {
              return c.toUpperCase();
            })
          : "") +
        "</span>";
      membersListHtml +=
        '<button class="btn btn-sm btn-info edit-member-btn ms-2" data-member-id="' +
        m.id +
        '">Edit</button>';
      membersListHtml +=
        '<button class="btn btn-sm btn-danger remove-member-btn ms-2" data-member-id="' +
        m.id +
        '">Remove</button>';
      membersListHtml += "</li>";
    });
    membersListHtml += "</ul></div>";
  }
  modalBody.innerHTML =
    membersListHtml +
    '<form id="memberForm">' +
    '<div class="mb-3">' +
    '<label for="memberName" class="form-label">Name</label>' +
    '<input type="text" class="form-control" id="memberName" required>' +
    '</div>' +
    '<div class="mb-3">' +
    '<label for="memberBirthday" class="form-label">Birthday</label>' +
    '<input type="text" class="form-control date-picker" id="memberBirthday">' +
    '</div>' +
    '<div class="mb-3">' +
    '<label for="memberHeight" class="form-label">Height (cm)</label>' +
    '<input type="number" class="form-control" id="memberHeight" min="0">' +
    '</div>' +
    '<div class="mb-3">' +
    '<label class="form-label">Image</label>' +
    '<div class="input-group">' +
    '<input type="hidden" id="memberImage">' +
    '<button type="button" class="btn btn-outline-info" id="chooseMemberImageBtn">Choose or Upload Image</button>' +
    '<span id="memberImagePreview" style="margin-left:10px;display:none;"></span>' +
    '</div>' +
    '</div>' +
    '<div class="mb-3">' +
    '<label for="memberInfo" class="form-label">Info</label>' +
    '<textarea class="form-control" id="memberInfo"></textarea>' +
    '</div>' +
  '<div class="d-grid">' +
  '<button type="submit" class="btn btn-primary fw-bold" id="saveMemberBtn">Save</button>' +
  '</div>' +
    '</form>';

  setTimeout(function () {
    // Remove member button logic
    document.querySelectorAll(".remove-member-btn").forEach(function (btn) {
      btn.onclick = async function (e) {
        e.preventDefault();
        const memberId = this.getAttribute("data-member-id");
        if (!memberId) return;
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
          // Dynamically import removeMember and call it
          const mod = await import("../api/memberApi.js");
          if (typeof mod.removeMember === "function") {
            await mod.removeMember(memberId);
            // Remove from local members array
            const idx = members.findIndex(m => String(m.id) === String(memberId));
            if (idx !== -1) members.splice(idx, 1);
            // Re-render modal with updated members
            showMemberManagementModal(members, onSave);
          } else {
            alert("Remove member function not available.");
          }
        } catch (err) {
          alert("Failed to remove member. See console for details.");
          console.error("Remove member error:", err);
        }
      };
    });
    // Edit member button logic
    document.querySelectorAll(".edit-member-btn").forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        var memberId = this.getAttribute("data-member-id");
        var m = members.find(function (mem) {
          return mem.id == memberId;
        });
        if (m) {
          document.getElementById("memberName").value = m.name || "";
          document.getElementById("memberBirthday").value = m.birthday || "";
          document.getElementById("memberHeight").value = m.height || "";
          document.getElementById("memberImage").value = m.image || "";
          document.getElementById("memberInfo").value = m.info || "";
          var imagePreview = document.getElementById("memberImagePreview");
          if (m.image && imagePreview) {
            imagePreview.innerHTML =
              '<img src="' +
              m.image +
              '" alt="Member Image" style="max-width:40px;max-height:40px;border-radius:6px;">';
            imagePreview.style.display = "";
          } else if (imagePreview) {
            imagePreview.innerHTML = "";
            imagePreview.style.display = "none";
          }
        }
      };
    });
    // Gallery modal logic for image selection
    var chooseBtn = document.getElementById("chooseMemberImageBtn");
    var imageInput = document.getElementById("memberImage");
    var imagePreview = document.getElementById("memberImagePreview");
    if (chooseBtn && imageInput) {
      chooseBtn.onclick = function () {
        showGalleryModal({
          onSelect: function (url) {
            imageInput.value = url;
            if (imagePreview) {
    // Add Member (Keep Open) button logic
    var addMemberNoCloseBtn = document.getElementById("addMemberNoCloseBtn");
    var memberForm = document.getElementById("memberForm");
    if (addMemberNoCloseBtn && memberForm) {
      console.log('[AddMemberNoCloseBtn] Handler attached');
      addMemberNoCloseBtn.onclick = async function (e) {
        e.preventDefault();
        console.log('[AddMemberNoCloseBtn] Clicked');
        // Validate required fields
        var name = document.getElementById("memberName").value.trim();
        if (!name) {
          console.log('[AddMemberNoCloseBtn] Name required');
          document.getElementById("memberName").focus();
          return;
        }
        var birthday = document.getElementById("memberBirthday").value.trim();
        var height = document.getElementById("memberHeight").value.trim();
        var image = document.getElementById("memberImage").value.trim();
        var info = document.getElementById("memberInfo").value.trim();
        const memberData = { name, birthday, height, image, info };
        console.log('[AddMemberNoCloseBtn] onSave:', typeof onSave, memberData);
        // Call onSave if provided
        if (typeof onSave === "function") {
          await onSave(memberData);
        } else {
          console.log('[AddMemberNoCloseBtn] onSave is not a function');
        }
        // After onSave, re-fetch and update only the members list in place if modal is still open
        if (modal.classList.contains("show")) {
          if (typeof window.fetchMembersByGroup === "function" && window.currentGroupId) {
            const refreshed = await window.fetchMembersByGroup(window.currentGroupId);
            // Update only the <ul class="list-group mb-2">...</ul> element
            const membersListUl = modalBody.querySelector('.list-group.mb-2');
            if (membersListUl) {
              membersListUl.innerHTML = refreshed.map(m =>
                '<li class="list-group-item d-flex align-items-center member-list-item" style="cursor:pointer;" data-member-id="' + m.id + '">' +
                  (m.image ? '<img src="' + m.image + '" alt="Member Image" style="max-width:32px;max-height:32px;border-radius:6px;margin-right:10px;">' : '') +
                  '<span class="flex-grow-1">' + (m.name ? m.name.replace(/\b\w/g, c => c.toUpperCase()) : '') + '</span>' +
                  '<button class="btn btn-sm btn-info edit-member-btn ms-2" data-member-id="' + m.id + '">Edit</button>' +
                  '<button class="btn btn-sm btn-danger remove-member-btn ms-2" data-member-id="' + m.id + '">Remove</button>' +
                '</li>'
              ).join('');
              // Re-attach remove/edit handlers for new list
              setTimeout(() => {
                document.querySelectorAll(".remove-member-btn").forEach(function (btn) {
                  btn.onclick = async function (e) {
                    e.preventDefault();
                    const memberId = this.getAttribute("data-member-id");
                    if (!memberId) return;
                    if (!confirm("Are you sure you want to remove this member?")) return;
                    try {
                      const mod = await import("../api/memberApi.js");
                      if (typeof mod.removeMember === "function") {
                        await mod.removeMember(memberId);
                        // Remove from local members array
                        const idx = refreshed.findIndex(m => String(m.id) === String(memberId));
                        if (idx !== -1) refreshed.splice(idx, 1);
                        // Update list again
                        membersListUl.innerHTML = refreshed.map(m =>
                          '<li class="list-group-item d-flex align-items-center member-list-item" style="cursor:pointer;" data-member-id="' + m.id + '">' +
                            (m.image ? '<img src="' + m.image + '" alt="Member Image" style="max-width:32px;max-height:32px;border-radius:6px;margin-right:10px;">' : '') +
                            '<span class="flex-grow-1">' + (m.name ? m.name.replace(/\b\w/g, c => c.toUpperCase()) : '') + '</span>' +
                            '<button class="btn btn-sm btn-info edit-member-btn ms-2" data-member-id="' + m.id + '">Edit</button>' +
                            '<button class="btn btn-sm btn-danger remove-member-btn ms-2" data-member-id="' + m.id + '">Remove</button>' +
                          '</li>'
                        ).join('');
                        // Re-attach handlers again
                        setTimeout(() => {
                          document.querySelectorAll(".remove-member-btn").forEach(function (btn) {
                            btn.onclick = arguments.callee;
                          });
                          document.querySelectorAll(".edit-member-btn").forEach(function (btn) {
                            btn.onclick = function (e) {
                              e.preventDefault();
                              var memberId = this.getAttribute("data-member-id");
                              var m = refreshed.find(function (mem) {
                                return mem.id == memberId;
                              });
                              if (m) {
                                document.getElementById("memberName").value = m.name || "";
                                document.getElementById("memberBirthday").value = m.birthday || "";
                                document.getElementById("memberHeight").value = m.height || "";
                                document.getElementById("memberImage").value = m.image || "";
                                document.getElementById("memberInfo").value = m.info || "";
                                var imagePreview = document.getElementById("memberImagePreview");
                                if (m.image && imagePreview) {
                                  imagePreview.innerHTML =
                                    '<img src="' +
                                    m.image +
                                    '" alt="Member Image" style="max-width:40px;max-height:40px;border-radius:6px;">';
                                  imagePreview.style.display = "";
                                } else if (imagePreview) {
                                  imagePreview.innerHTML = "";
                                  imagePreview.style.display = "none";
                                }
                              }
                            };
                          });
                        }, 0);
                      } else {
                        alert("Remove member function not available.");
                      }
                    } catch (err) {
                      alert("Failed to remove member. See console for details.");
                      console.error("Remove member error:", err);
                    }
                  };
                });
                document.querySelectorAll(".edit-member-btn").forEach(function (btn) {
                  btn.onclick = function (e) {
                    e.preventDefault();
                    var memberId = this.getAttribute("data-member-id");
                    var m = refreshed.find(function (mem) {
                      return mem.id == memberId;
                    });
                    if (m) {
                      document.getElementById("memberName").value = m.name || "";
                      document.getElementById("memberBirthday").value = m.birthday || "";
                      document.getElementById("memberHeight").value = m.height || "";
                      document.getElementById("memberImage").value = m.image || "";
                      document.getElementById("memberInfo").value = m.info || "";
                      var imagePreview = document.getElementById("memberImagePreview");
                      if (m.image && imagePreview) {
                        imagePreview.innerHTML =
                          '<img src="' +
                          m.image +
                          '" alt="Member Image" style="max-width:40px;max-height:40px;border-radius:6px;">';
                        imagePreview.style.display = "";
                      } else if (imagePreview) {
                        imagePreview.innerHTML = "";
                        imagePreview.style.display = "none";
                      }
                    }
                  };
                });
              }, 0);
            }
          }
        }
        // Reset form for next entry
        memberForm.reset();
        if (imagePreview) {
          imagePreview.innerHTML = "";
          imagePreview.style.display = "none";
        }
        document.getElementById("memberName").focus();
      };
    }
                '<img src="' +
                url +
                '" alt="Member Image" style="max-width:40px;max-height:40px;border-radius:6px;">';
              imagePreview.style.display = "";
            }
          },
          title: "Select or Upload Member Image",
          groupName: document.getElementById("memberName")
            ? document.getElementById("memberName").value
            : null,
        });
      };
    }
  }, 0);

  var memberForm = document.getElementById("memberForm");
  if (!memberForm) return;
  memberForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var updatedMember = {
      name: document.getElementById("memberName").value.trim(),
      birthday: document.getElementById("memberBirthday").value,
      height: document.getElementById("memberHeight").value,
      image: document.getElementById("memberImage").value.trim(),
      info: document.getElementById("memberInfo").value.trim(),
    };
    onSave(updatedMember);
    bootstrap.Modal.getInstance(modal).hide();
  });

  var modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}
