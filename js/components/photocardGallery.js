// Photocard Gallery Logic
// This script handles uploading, displaying, and deleting photocards in the gallery.


const galleryContainer = document.getElementById('photocardGallery');
const paginationContainer = document.getElementById('photocardPagination');
const uploadForm = document.getElementById('photocardUploadForm');
const fileInput = document.getElementById('photocardFile');
const groupSelect = document.getElementById('photocardGroupSelect');
const memberSelect = document.getElementById('photocardMemberSelect');
const filterGroupSelect = document.getElementById('filterGroupSelect');
const filterMemberSelect = document.getElementById('filterMemberSelect');
const clearFilterBtn = document.getElementById('clearFilterBtn');

// --- Improved Admin check helper ---
// Add bulletproof CSS class for hiding
if (uploadForm) {
  if (!document.getElementById('hidden-upload-form-style')) {
    const style = document.createElement('style');
    style.id = 'hidden-upload-form-style';
    style.innerHTML = `.hidden-upload-form { display: none !important; }`;
    document.head.appendChild(style);
  }
}
let isAdmin = false;
let lastCheckedUserId = null;
let lastCheckedIsAdmin = null;

async function checkAdmin() {
  const supabase = await window.supabasePromise;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  let adminStatusChanged = false;
  // Always hide the form by default (with class)
  if (uploadForm) {
    uploadForm.classList.add('hidden-upload-form');
    uploadForm.style.display = 'none';
    // Only log on first call or user change
    if (lastCheckedUserId !== user?.id) {
      console.log('[photocardGallery] Upload form forcibly hidden (default)');
    }
  }
  if (!user) {
    isAdmin = false;
    if (lastCheckedUserId !== null) adminStatusChanged = true;
    lastCheckedUserId = null;
    lastCheckedIsAdmin = false;
    // Not logged in, never show form
    if (uploadForm) {
      uploadForm.classList.add('hidden-upload-form');
      uploadForm.style.display = 'none';
      console.log('[photocardGallery] Not logged in, upload form hidden');
    }
  } else {
    if (user.id === lastCheckedUserId && lastCheckedIsAdmin !== null) {
      // Use cached admin status
      isAdmin = lastCheckedIsAdmin;
      // Only log on user change
      if (uploadForm) {
        if (isAdmin) {
          uploadForm.classList.remove('hidden-upload-form');
          uploadForm.style.display = '';
          console.log(`[photocardGallery] User: ${user.email}, isAdmin: ${isAdmin} (cached) -- upload form shown`);
        } else {
          uploadForm.classList.add('hidden-upload-form');
          uploadForm.style.display = 'none';
          console.log(`[photocardGallery] User: ${user.email}, isAdmin: ${isAdmin} (cached) -- upload form hidden`);
        }
      }
    } else {
      // Query Supabase for admin status
      const { data, error } = await supabase
        .from('user_roles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();
      isAdmin = !!(data && data.is_admin);
      lastCheckedUserId = user.id;
      lastCheckedIsAdmin = isAdmin;
      adminStatusChanged = true;
      if (uploadForm) {
        if (isAdmin) {
          uploadForm.classList.remove('hidden-upload-form');
          uploadForm.style.display = '';
          console.log(`[photocardGallery] User: ${user.email}, isAdmin: ${isAdmin} -- upload form shown`);
        } else {
          uploadForm.classList.add('hidden-upload-form');
          uploadForm.style.display = 'none';
          console.log(`[photocardGallery] User: ${user.email}, isAdmin: ${isAdmin} -- upload form hidden`);
        }
      }
    }
  }
  // Hide all delete buttons if not admin
  document.querySelectorAll('.delete-photocard').forEach(btn => {
    btn.style.display = isAdmin ? '' : 'none';
  });
}

// Call on page load, after login, and after gallery refresh
window.addEventListener('DOMContentLoaded', checkAdmin);
window.addEventListener('updateAuthUIReady', checkAdmin);
window.addEventListener('authStateChanged', checkAdmin);

// Hide upload form immediately on script load (before any async checks)
if (uploadForm) uploadForm.style.display = 'none';

// Helper to populate group dropdowns (for upload and filter)
async function populateGroups() {
  let groups = [];
  if (window.fetchGroups) {
    groups = await window.fetchGroups();
  } else if (window.fetchAllGroups) {
    groups = await window.fetchAllGroups();
  }
  // Upload form group select
  groupSelect.innerHTML = '<option value="">Select Group</option>';
  for (const group of groups) {
    const opt = document.createElement('option');
    opt.value = group.id;
    opt.textContent = group.name;
    groupSelect.appendChild(opt);
  }
  // Filter group select
  filterGroupSelect.innerHTML = '<option value="">All Groups</option>';
  for (const group of groups) {
    const opt = document.createElement('option');
    opt.value = group.id;
    opt.textContent = group.name;
    filterGroupSelect.appendChild(opt);
  }
}

// Helper to populate member dropdowns (for upload and filter)
async function populateMembers(groupId, targetSelect, isFilter = false) {
  targetSelect.innerHTML = isFilter ? '<option value="">All Members</option>' : '<option value="">Select Member</option>';
  if (!groupId || !window.fetchMembersByGroup) return;
  const members = await window.fetchMembersByGroup(groupId);
  for (const member of members) {
    const opt = document.createElement('option');
    opt.value = member.id;
    opt.textContent = member.name;
    targetSelect.appendChild(opt);
  }
}

groupSelect.addEventListener('change', async (e) => {
  await populateMembers(e.target.value, memberSelect, false);
  memberSelect.value = '';
});

filterGroupSelect.addEventListener('change', async (e) => {
  await populateMembers(e.target.value, filterMemberSelect, true);
  filterMemberSelect.value = '';
  await refreshGallery();
});

filterMemberSelect.addEventListener('change', async () => {
  await refreshGallery();
});

clearFilterBtn.addEventListener('click', (e) => {
  e.preventDefault();
  filterGroupSelect.value = '';
  filterMemberSelect.innerHTML = '<option value="">All Members</option>';
  refreshGallery();
});

// On page load, populate groups (for both upload and filter)
populateGroups();

async function fetchPhotocards() {
  const res = await fetch('/api/photocards');
  if (!res.ok) return [];
  let photocards = await res.json();
  // Filter by group/member if selected
  const groupId = filterGroupSelect.value;
  const memberId = filterMemberSelect.value;
  if (groupId) {
    photocards = photocards.filter(card => card.groupId === groupId);
    if (memberId) {
      photocards = photocards.filter(card => card.memberId === memberId);
    }
  }
  return photocards;
}

// Helper to cache group/member id->name for display
const groupNameCache = {};
const memberNameCache = {};

async function getGroupName(groupId) {
  if (!groupId) return '';
  if (groupNameCache[groupId]) return groupNameCache[groupId];
  if (window.fetchAllGroups) {
    const groups = await window.fetchAllGroups();
    for (const g of groups) groupNameCache[g.id] = g.name;
    return groupNameCache[groupId] || '';
  }
  return '';
}

async function getMemberName(groupId, memberId) {
  if (!memberId) return '';
  if (memberNameCache[memberId]) return memberNameCache[memberId];
  if (window.fetchMembersByGroup) {
    const members = await window.fetchMembersByGroup(groupId);
    for (const m of members) memberNameCache[m.id] = m.name;
    return memberNameCache[memberId] || '';
  }
  return '';
}

let currentPage = 1;
const CARDS_PER_PAGE = 14; // 2 rows of 7

async function renderGallery(photocards) {
  galleryContainer.innerHTML = '';
  paginationContainer.innerHTML = '';
  if (!photocards.length) {
    galleryContainer.innerHTML = '<div class="text-center text-muted">No photocards uploaded yet.</div>';
    return;
  }
  const totalPages = Math.ceil(photocards.length / CARDS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const startIdx = (currentPage - 1) * CARDS_PER_PAGE;
  const endIdx = startIdx + CARDS_PER_PAGE;
  const pageCards = photocards.slice(startIdx, endIdx);
  for (const card of pageCards) {
    const item = document.createElement('div');
    item.className = 'photocard-item';
    // Fetch group/member names if present
    let groupName = '';
    let memberName = '';
    if (card.groupId) groupName = await getGroupName(card.groupId);
    if (card.groupId && card.memberId) memberName = await getMemberName(card.groupId, card.memberId);
    item.innerHTML = `
      <img src="${card.url}"
        srcset="${card.url} 600w, ${card.url} 900w, ${card.url} 1200w"
        sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 300px"
        width="150" height="225"
        class="photocard-img" alt="Photocard" loading="lazy" />
      <div class="photocard-actions">
        <span class="photocard-filename">${card.originalname}</span>
        <button class="btn btn-sm btn-danger delete-photocard" data-filename="${card.filename}" style="display:${isAdmin ? 'inline-block' : 'none'}"><i class="bi bi-trash"></i></button>
      </div>
      <div class="photocard-meta px-2 pb-2" style="font-size:0.95em;color:#bfc9db;">
        ${groupName ? `<span><i class='bi bi-people'></i> ${groupName}</span>` : ''}
        ${memberName ? `<span class='ms-2'><i class='bi bi-person'></i> ${memberName}</span>` : ''}
      </div>
    `;
    galleryContainer.appendChild(item);
  }
  // Pagination controls
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement('li');
      li.className = 'page-item' + (i === currentPage ? ' active' : '');
      const btn = document.createElement('button');
      btn.className = 'page-link';
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        refreshGallery();
      });
      li.appendChild(btn);
      paginationContainer.appendChild(li);
    }
  }
  // After rendering, update delete buttons
  checkAdmin();
}

async function refreshGallery() {
  const photocards = await fetchPhotocards();
  await renderGallery(photocards);
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const files = fileInput.files;
  const groupId = groupSelect.value;
  const memberId = memberSelect.value;
  if (!files.length || !groupId) {
    alert('Please select a group and at least one file.');
    return;
  }
  const formData = new FormData();
  for (const file of files) {
    formData.append('photocard', file);
  }
  formData.append('groupId', groupId);
  if (memberId) formData.append('memberId', memberId);
  // Get JWT for Authorization header
  const supabase = await window.supabasePromise;
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  const res = await fetch('/api/photocards/upload', {
    method: 'POST',
    body: formData,
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
  });
  let allSucceeded = false;
  if (res.ok) {
    const data = await res.json();
    if (data && data.uploaded && Array.isArray(data.uploaded)) {
      allSucceeded = data.uploaded.length === files.length;
    }
  }
  fileInput.value = '';
  groupSelect.value = '';
  memberSelect.innerHTML = '<option value="">(Optional) Select Member</option>';
  await refreshGallery();
  if (!allSucceeded) {
    alert('Some uploads may have failed.');
  }
});

// Lightbox modal for preview
function createLightbox() {
  let modal = document.getElementById('photocardLightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'photocardLightbox';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20,24,34,0.95)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 2000;
    modal.style.cursor = 'zoom-out';
    modal.innerHTML = '<img id="photocardLightboxImg" style="max-width:90vw;max-height:90vh;border-radius:18px;box-shadow:0 4px 32px #43c6ac55;outline:2px solid #43c6ac;">';
    modal.addEventListener('click', () => { modal.style.display = 'none'; });
    document.body.appendChild(modal);
  }
  return modal;
}

galleryContainer.addEventListener('click', async (e) => {
  if (e.target.closest('.delete-photocard')) {
    const filename = e.target.closest('.delete-photocard').dataset.filename;
    if (!filename) return;
    if (!confirm('Delete this photocard?')) return;
    // Get JWT for Authorization header
    const supabase = await window.supabasePromise;
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token;
    const res = await fetch('/api/photocards/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
      },
      body: JSON.stringify({ filename })
    });
    if (res.ok) {
      await refreshGallery();
    } else {
      alert('Delete failed.');
    }
    return;
  }
  // Lightbox preview
  const img = e.target.closest('.photocard-img');
  if (img) {
    const modal = createLightbox();
    const lightboxImg = modal.querySelector('#photocardLightboxImg');
    lightboxImg.src = img.src;
    modal.style.display = 'flex';
  }
});

// Initial load
refreshGallery();
