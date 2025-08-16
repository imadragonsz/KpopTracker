export function showMemberInfoModal(member) {
  const memberInfoBody = document.getElementById("memberInfoBody");
  let memberHtml = "";
  if (member.image) {
    memberHtml += `<img src='${member.image}' alt='Member Image' class='img-thumbnail mb-3' style='max-width:160px;max-height:160px;display:block;margin:auto;'>`;
  }
  const displayName = member.name.replace(/\b\w/g, (c) => c.toUpperCase());
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
  memberInfoBody.innerHTML = memberHtml;
}

export function showMemberManagementModal(member = {}, onSave) {
  const modal = document.getElementById("memberManagementModal");
  const modalBody = modal.querySelector(".modal-body");
  const memberForm = document.getElementById("memberForm");

  modalBody.innerHTML = `
    <form id="memberForm">
      <div class="mb-3">
        <label for="memberName" class="form-label">Name</label>
        <input type="text" class="form-control" id="memberName" value="${
          member.name || ""
        }" required>
      </div>
      <div class="mb-3">
        <label for="memberBirthday" class="form-label">Birthday</label>
        <input type="date" class="form-control" id="memberBirthday" value="${
          member.birthday || ""
        }">
      </div>
      <div class="mb-3">
        <label for="memberHeight" class="form-label">Height (cm)</label>
        <input type="number" class="form-control" id="memberHeight" value="${
          member.height || ""
        }" min="0">
      </div>
      <div class="mb-3">
        <label for="memberImage" class="form-label">Image URL</label>
        <input type="url" class="form-control" id="memberImage" value="${
          member.image || ""
        }">
      </div>
      <div class="mb-3">
        <label for="memberInfo" class="form-label">Info</label>
        <textarea class="form-control" id="memberInfo">${
          member.info || ""
        }</textarea>
      </div>
      <button type="submit" class="btn btn-primary">Save</button>
    </form>
  `;

  memberForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const updatedMember = {
      name: document.getElementById("memberName").value.trim(),
      birthday: document.getElementById("memberBirthday").value,
      height: document.getElementById("memberHeight").value,
      image: document.getElementById("memberImage").value.trim(),
      info: document.getElementById("memberInfo").value.trim(),
      id: member.id || undefined,
    };
    onSave(updatedMember);
    bootstrap.Modal.getInstance(modal).hide();
  });

  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}
