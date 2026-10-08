import { getAllInvitations, deleteInvitation, getUsers, addUser, deleteUser, updateUser, verifyUser, addInvitation, buildInviteLink } from './simple-db.js';

const $ = id => document.getElementById(id);

const loginSection = $('loginSection');
const dashboardSection = $('dashboardSection');
const displayAdminEmail = $('displayAdminEmail');
const tableBody = $('tableBody');
const adminEmail = $('adminEmail');
const adminPass = $('adminPass');
const loginBtn = $('loginBtn');
const loginError = $('loginError');

const tabInvitations = $('tabInvitations');
const tabCreate = $('tabCreate');
const tabUsers = $('tabUsers');
const tabResponses = $('tabResponses');
const invitationsTab = $('invitationsTab');
const createTab = $('createTab');
const usersTab = $('usersTab');
const responsesTab = $('responsesTab');
const responsesList = $('responsesList');
const responseCount = $('responseCount');

const statTotal = $('statTotal');
const statAccepted = $('statAccepted');
const statPending = $('statPending');

const adminGenerateBtn = $('adminGenerateBtn');
const adminGeneratedLink = $('adminGeneratedLink');
const adminGenerateResult = $('adminGenerateResult');
const adminCopyLink = $('adminCopyLink');

const usersTableBody = $('usersTableBody');
const newUserEmail = $('newUserEmail');
const newUserPass = $('newUserPass');
const createUserBtn = $('createUserBtn');
const userMsg = $('userMsg');
const editUserModal = $('editUserModal');
const editUserEmail = $('editUserEmail');
const editUserPass = $('editUserPass');
const editUserMsg = $('editUserMsg');
const editUserSaveBtn = $('editUserSaveBtn');
const editUserCancelBtn = $('editUserCancelBtn');
let editingUserEmail = null;

let currentFilter = 'all';

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function checkAuth() {
  return sessionStorage.getItem('admin_email') !== null;
}

// Tab switching with sidebar active state
function switchTab(active) {
  [tabInvitations, tabCreate, tabUsers, tabResponses].forEach(t => t.classList.remove('sidebar-active'));
  active.classList.add('sidebar-active');
  hide(invitationsTab);
  hide(createTab);
  hide(usersTab);
  hide(responsesTab);
}

tabInvitations.addEventListener('click', () => { switchTab(tabInvitations); show(invitationsTab); });
tabCreate.addEventListener('click', () => { switchTab(tabCreate); show(createTab); });
tabUsers.addEventListener('click', () => { switchTab(tabUsers); show(usersTab); loadUsers(); });
tabResponses.addEventListener('click', () => { switchTab(tabResponses); show(responsesTab); loadResponses(); });

// --- RESPONSES (RSVP tracking) ---
async function loadResponses() {
  const invites = await getAllInvitations();
  const accepted = invites
    .filter(i => i.status === 'accepted')
    .sort((a, b) => new Date(b.respondedAt || b.acceptedAt || b.createdAt) - new Date(a.respondedAt || a.acceptedAt || a.createdAt));

  responseCount.textContent = `${accepted.length} response${accepted.length === 1 ? '' : 's'}`;
  responsesList.innerHTML = '';

  if (accepted.length === 0) {
    responsesList.innerHTML = `<div class="col-span-full glass-card-elevated p-10 text-center text-on-surface-variant italic">No responses yet. Share an invitation link to get your first RSVP 💕</div>`;
    return;
  }

  accepted.forEach(inv => {
    const when = new Date(inv.respondedAt || inv.acceptedAt || inv.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const dateVal = inv.date ? new Date(inv.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const card = document.createElement('div');
    card.className = 'glass-card-elevated p-5 space-y-3 fade-in';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">${(inv.acceptedBy || '?').charAt(0).toUpperCase()}</div>
          <div>
            <p class="font-semibold text-primary">${inv.acceptedBy || 'Anonymous'}</p>
            <p class="text-xs text-on-surface-variant">responded ${when}</p>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">● Accepted</span>
      </div>
      ${inv.message ? `<p class="text-sm italic text-on-surface-variant border-l-2 border-primary/40 pl-3">"${inv.message}"</p>` : ''}
      <div class="text-xs text-on-surface-variant grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30">
        <span>📅 <strong>${dateVal}</strong></span>
        <span>📍 ${inv.location || '—'}</span>
        <span>🎭 ${inv.activity || '—'}</span>
        <span>👔 ${inv.dressCode || '—'}</span>
      </div>
    `;
    responsesList.appendChild(card);
  });
}

// --- FILTER STATE ---
const statCards = document.querySelectorAll('#statsContainer .stat-card');

function setActiveFilter(filter) {
  currentFilter = filter;
  statCards.forEach(card => {
    card.classList.toggle('stat-card-active', card.dataset.filter === filter);
  });
  loadInvitations(filter);
}

statCards.forEach(card => {
  card.addEventListener('click', () => setActiveFilter(card.dataset.filter));
});

function onLogin(email) {
  sessionStorage.setItem('admin_email', email);
  hide(loginSection);
  show(dashboardSection);
  displayAdminEmail.textContent = email;
  loadStats();
  loadInvitations('all');
  setActiveFilter('all');
  switchTab(tabInvitations);
  show(invitationsTab);
}

if (checkAuth()) {
  const email = sessionStorage.getItem('admin_email');
  displayAdminEmail.textContent = email;
  hide(loginSection);
  show(dashboardSection);
  loadStats();
  loadInvitations('all');
  setActiveFilter('all');
  switchTab(tabInvitations);
  show(invitationsTab);
}

// Login
loginBtn.addEventListener('click', async () => {
  hide(loginError);
  const email = adminEmail.value.trim();
  const pass = adminPass.value;
  if (!email || !pass) { loginError.textContent = 'Fill in all fields'; show(loginError); return; }
  const user = await verifyUser(email, pass);
  if (user) {
    onLogin(email);
  } else {
    loginError.textContent = 'Invalid email or password';
    show(loginError);
  }
});

adminPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

function logout() {
  sessionStorage.removeItem('admin_email');
  show(loginSection);
  hide(dashboardSection);
  adminPass.value = '';
}

$('logoutBtn').addEventListener('click', logout);
if ($('logoutBtnMobile')) $('logoutBtnMobile').addEventListener('click', logout);

// --- INVITATIONS ---
function statusBadge(status) {
  if (status === 'accepted') return '<span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">● Accepted</span>';
  if (status === 'declined') return '<span class="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">● Declined</span>';
  return '<span class="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">● Pending</span>';
}

async function loadStats() {
  const invites = await getAllInvitations();
  const users = await getUsers();
  statTotal.textContent = invites.length;
  statAccepted.textContent = invites.filter(i => i.status === 'accepted').length;
  statPending.textContent = invites.filter(i => i.status === 'pending' || !i.status).length;
}

async function loadInvitations(filter) {
  const invites = await getAllInvitations();
  tableBody.innerHTML = '';

  const filtered = filter && filter !== 'all'
    ? invites.filter(i => (filter === 'pending' ? (!i.status || i.status === 'pending') : i.status === filter))
    : invites;

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="p-10 text-center text-on-surface-variant italic">No ${filter !== 'all' ? filter : ''} invitations yet.</td></tr>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  filtered.forEach(inv => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#eef5f7] transition-colors';

    const dateVal = inv.date ? new Date(inv.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    let responder = inv.acceptedBy ? `<span class="font-semibold text-primary">${inv.acceptedBy}</span>` : '<span class="text-on-surface-variant/50">—</span>';

    tr.innerHTML = `
      <td class="p-4 font-mono text-xs text-on-surface-variant">${inv.id.slice(0, 8)}</td>
      <td class="p-4 whitespace-nowrap">${dateVal}</td>
      <td class="p-4">${inv.activity || '-'}</td>
      <td class="p-4">${statusBadge(inv.status)}</td>
      <td class="p-4">${responder}</td>
      <td class="p-4 text-xs text-on-surface-variant">${inv.createdBy || '—'}</td>
      <td class="p-4 max-w-[140px] truncate" title="${inv.location || ''}">${inv.location || '-'}</td>
      <td class="p-4">
        <button class="delete-btn text-red-500 hover:text-red-700 transition-all text-sm font-medium">Delete</button>
      </td>
    `;

    tr.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm('Delete this invitation permanently?')) {
        await deleteInvitation(inv.id);
        tr.remove();
        loadStats();
      }
    });

    tableBody.appendChild(tr);
  });
}

// --- CREATE INVITE ---
adminGenerateBtn.addEventListener('click', async () => {
  try {
    const data = {
      date: new Date().toISOString(),
      location: 'Secret Spot',
      dressCode: 'Casual',
      activity: 'Candlelight Dinner',
      status: 'pending',
      createdBy: sessionStorage.getItem('admin_email') || 'admin',
      createdAt: new Date().toISOString()
    };
    const newId = await addInvitation(data);
    const link = buildInviteLink(newId, data);
    adminGeneratedLink.textContent = link;
    show(adminGenerateResult);
    loadStats();
    switchTab(tabInvitations);
    show(invitationsTab);
    loadInvitations(currentFilter);
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

adminCopyLink.addEventListener('click', () => {
  navigator.clipboard.writeText(adminGeneratedLink.textContent).then(() => {
    adminCopyLink.textContent = 'check';
    setTimeout(() => { adminCopyLink.textContent = 'content_copy'; }, 1500);
  });
});

// --- USERS ---
async function loadUsers() {
  const users = await getUsers();
  usersTableBody.innerHTML = '';

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="2" class="p-10 text-center text-on-surface-variant italic">No users yet.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#eef5f7] transition-colors';
    const isSelf = u.email === sessionStorage.getItem('admin_email');
    tr.innerHTML = `
      <td class="p-4">${u.email} ${isSelf ? '<span class="text-xs text-primary ml-2">(you)</span>' : ''}</td>
      <td class="p-4">
        <div class="flex items-center gap-3">
          <button class="edit-user-btn text-primary hover:text-primary/70 transition-all text-sm font-medium">Edit</button>
          <button class="delete-user-btn text-red-500 hover:text-red-700 transition-all text-sm font-medium ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}">${isSelf ? 'Cannot delete' : 'Delete'}</button>
        </div>
      </td>
    `;
    const editBtn = tr.querySelector('.edit-user-btn');
    editBtn.addEventListener('click', () => openEditUserModal(u.email, u.password));
    const delBtn = tr.querySelector('.delete-user-btn');
    if (!isSelf) {
      delBtn.addEventListener('click', async () => {
        if (confirm(`Delete user ${u.email}?`)) {
          await deleteUser(u.email);
          loadUsers();
          loadStats();
        }
      });
    }
    usersTableBody.appendChild(tr);
  });
}

createUserBtn.addEventListener('click', async () => {
  hide(userMsg);
  const email = newUserEmail.value.trim();
  const pass = newUserPass.value;
  if (!email || !pass) { userMsg.textContent = 'Fill in all fields'; userMsg.className = 'text-sm text-red-600'; show(userMsg); return; }
  try {
    await addUser(email, pass);
    userMsg.textContent = `✅ User ${email} created successfully`;
    userMsg.className = 'text-sm text-green-600';
    show(userMsg);
    newUserEmail.value = '';
    newUserPass.value = '';
    loadUsers();
    loadStats();
  } catch (err) {
    userMsg.textContent = err.message;
    userMsg.className = 'text-sm text-red-600';
    show(userMsg);
  }
});

newUserPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') createUserBtn.click(); });

// --- EDIT USER MODAL ---
function openEditUserModal(email, password) {
  editingUserEmail = email;
  editUserEmail.value = email;
  editUserPass.value = password;
  editUserMsg.classList.add('hidden');
  editUserModal.classList.remove('hidden');
  editUserModal.classList.add('flex');
}

function closeEditUserModal() {
  editUserModal.classList.add('hidden');
  editUserModal.classList.remove('flex');
  editingUserEmail = null;
}

editUserCancelBtn.addEventListener('click', closeEditUserModal);
editUserModal.addEventListener('click', (e) => { if (e.target === editUserModal) closeEditUserModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !editUserModal.classList.contains('hidden')) closeEditUserModal(); });

editUserSaveBtn.addEventListener('click', async () => {
  hide(editUserMsg);
  const newEmail = editUserEmail.value.trim();
  const newPass = editUserPass.value;
  if (!newEmail || !newPass) {
    editUserMsg.textContent = 'Fill in all fields';
    editUserMsg.className = 'text-sm text-red-600';
    show(editUserMsg);
    return;
  }
  try {
    await updateUser(editingUserEmail, newEmail, newPass);
    editUserMsg.textContent = '✅ User updated successfully';
    editUserMsg.className = 'text-sm text-green-600';
    show(editUserMsg);
    closeEditUserModal();
    loadUsers();
    loadStats();
  } catch (err) {
    editUserMsg.textContent = err.message;
    editUserMsg.className = 'text-sm text-red-600';
    show(editUserMsg);
  }
});

editUserPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') editUserSaveBtn.click(); });

