<<<<<<< HEAD
import { getAllInvitations, deleteInvitation, getUsers, addUser, deleteUser, updateUser, verifyUser, getAllViewCounts, getUserDetail, getLogins, deleteLogin, clearLogins, getSessionInfo, adminLogout } from './simple-db.js?v=7';
=======
import { getAllInvitations, deleteInvitation, getUsers, addUser, deleteUser, updateUser, verifyUser, addInvitation, buildInviteLink } from './simple-db.js';
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2

const $ = id => document.getElementById(id);

const loginSection = $('loginSection');
const dashboardSection = $('dashboardSection');
const displayAdminEmail = $('displayAdminEmail');
<<<<<<< HEAD
const displayAdminEmailMobile = $('displayAdminEmailMobile');
=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
const tableBody = $('tableBody');
const adminEmail = $('adminEmail');
const adminPass = $('adminPass');
const loginBtn = $('loginBtn');
const loginError = $('loginError');

const tabInvitations = $('tabInvitations');
<<<<<<< HEAD
const tabUsers = $('tabUsers');
const tabResponses = $('tabResponses');
const tabLogins = $('tabLogins');
const invitationsTab = $('invitationsTab');
const usersTab = $('usersTab');
const responsesTab = $('responsesTab');
const loginsTab = $('loginsTab');
const responsesList = $('responsesList');
const responseCount = $('responseCount');
const loginsTableBody = $('loginsTableBody');
const refreshLoginsBtn = $('refreshLoginsBtn');
const clearLoginsBtn = $('clearLoginsBtn');
=======
const tabCreate = $('tabCreate');
const tabUsers = $('tabUsers');
const tabResponses = $('tabResponses');
const invitationsTab = $('invitationsTab');
const createTab = $('createTab');
const usersTab = $('usersTab');
const responsesTab = $('responsesTab');
const responsesList = $('responsesList');
const responseCount = $('responseCount');
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2

const statTotal = $('statTotal');
const statAccepted = $('statAccepted');
const statPending = $('statPending');

<<<<<<< HEAD
=======
const adminGenerateBtn = $('adminGenerateBtn');
const adminGeneratedLink = $('adminGeneratedLink');
const adminGenerateResult = $('adminGenerateResult');
const adminCopyLink = $('adminCopyLink');

>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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
<<<<<<< HEAD
let editingUserId = null;

const userDetailModal = $('userDetailModal');
const udTitle = $('udTitle');
const udSubtitle = $('udSubtitle');
const udProfile = $('udProfile');
const udStats = $('udStats');
const udInvitations = $('udInvitations');
const udResponses = $('udResponses');
const udLogins = $('udLogins');
const udCloseBtn = $('udCloseBtn');
const udDeleteBtn = $('udDeleteBtn');
let udUserId = null;
let udUsername = null;

const themeToggle = $('themeToggle');
const themeToggleMobile = $('themeToggleMobile');
const themeToggleLogin = $('themeToggleLogin');
const themeIcon = $('themeIcon');
const themeLabel = $('themeLabel');

// ========== THEME (light / dark) ==========
const THEME_KEY = 'admin_theme';
function isDark() { return document.documentElement.classList.contains('dark'); }
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  const icon = dark ? 'light_mode' : 'dark_mode';
  const label = dark ? 'Light mode' : 'Dark mode';
  if (themeIcon) themeIcon.textContent = icon;
  if (themeLabel) themeLabel.textContent = label;
  [themeToggleMobile, themeToggleLogin].forEach(b => { if (b) b.textContent = icon; });
}
function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
})();
[themeToggle, themeToggleMobile, themeToggleLogin].forEach(btn => {
  if (btn) btn.addEventListener('click', toggleTheme);
});
=======
let editingUserEmail = null;
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2

let currentFilter = 'all';

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

<<<<<<< HEAD
// Tab switching with sidebar active state
function switchTab(active) {
  [tabInvitations, tabUsers, tabResponses, tabLogins].forEach(t => t.classList.remove('sidebar-active'));
  active.classList.add('sidebar-active');
  hide(invitationsTab);
  hide(usersTab);
  hide(responsesTab);
  hide(loginsTab);
}

tabInvitations.addEventListener('click', () => { switchTab(tabInvitations); show(invitationsTab); });
tabUsers.addEventListener('click', () => { switchTab(tabUsers); show(usersTab); loadUsers(); });
tabResponses.addEventListener('click', () => { switchTab(tabResponses); show(responsesTab); loadResponses(); });
tabLogins.addEventListener('click', () => { switchTab(tabLogins); show(loginsTab); loadLogins(); });
refreshLoginsBtn.addEventListener('click', () => loadLogins());

// --- RESPONSES (RSVP tracking) ---
async function loadResponses() {
  const invites = await getAllInvitations(true);
=======
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
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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
<<<<<<< HEAD
        <span>🚗 Pick up: ${inv.pickupLocation || '—'}</span>
=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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

<<<<<<< HEAD
function showDashboard(email) {
=======
function onLogin(email) {
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
  sessionStorage.setItem('admin_email', email);
  hide(loginSection);
  show(dashboardSection);
  displayAdminEmail.textContent = email;
<<<<<<< HEAD
  if (displayAdminEmailMobile) displayAdminEmailMobile.textContent = email;
=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
  loadStats();
  loadInvitations('all');
  setActiveFilter('all');
  switchTab(tabInvitations);
  show(invitationsTab);
}

<<<<<<< HEAD
// Verify the admin session with the server (the admin panel keeps its own
// signed cookie, independent of the public user session).
async function bootAdmin() {
  let info = null;
  try { info = await getSessionInfo(); } catch (e) {}
  if (info && info.is_admin) {
    const email = info.admin_user || (info.user && info.user.username) || 'admin';
    showDashboard(email);
  } else {
    sessionStorage.removeItem('admin_email');
    hide(dashboardSection);
    show(loginSection);
  }
}
bootAdmin();
=======
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
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2

// Login
loginBtn.addEventListener('click', async () => {
  hide(loginError);
  const email = adminEmail.value.trim();
  const pass = adminPass.value;
  if (!email || !pass) { loginError.textContent = 'Fill in all fields'; show(loginError); return; }
  const user = await verifyUser(email, pass);
  if (user) {
<<<<<<< HEAD
    let info = null;
    try { info = await getSessionInfo(); } catch (e) {}
    if (info && info.is_admin) {
      showDashboard((info.user && info.user.username) || email);
    } else {
      loginError.textContent = 'This account is not an admin';
      show(loginError);
    }
=======
    onLogin(email);
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
  } else {
    loginError.textContent = 'Invalid email or password';
    show(loginError);
  }
});

adminPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

<<<<<<< HEAD
async function logout() {
  try { await adminLogout(); } catch (e) {}
=======
function logout() {
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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
<<<<<<< HEAD
  const invites = await getAllInvitations(true);
  const users = await getUsers();
  const counts = {
    total:    invites.length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    pending:  invites.filter(i => i.status === 'pending' || !i.status).length,
    declined: invites.filter(i => i.status === 'declined').length,
  };
  statTotal.textContent = counts.total;
  statAccepted.textContent = counts.accepted;
  statPending.textContent = counts.pending;
  renderStatusDonut(counts);
  renderTrendChart(invites);
}

// --- STATISTICS CHARTS (self-contained SVG/CSS, no external library) ---
const SVG_NS = 'http://www.w3.org/2000/svg';
const STATUS_SLICES = [
  { key: 'accepted', label: 'Accepted', color: '#16a34a' },
  { key: 'pending',  label: 'Pending',  color: '#ca8a04' },
  { key: 'declined', label: 'Declined', color: '#ef4444' },
];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderStatusDonut(counts) {
  const svg = $('statusDonut');
  if (!svg) return;
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const total = counts.total || 0;

  svg.innerHTML = '';
  const track = document.createElementNS(SVG_NS, 'circle');
  track.setAttribute('cx', '60'); track.setAttribute('cy', '60'); track.setAttribute('r', String(R));
  track.setAttribute('fill', 'none'); track.setAttribute('stroke-width', '16');
  track.setAttribute('class', 'donut-track');
  svg.appendChild(track);

  let offset = 0;
  STATUS_SLICES.forEach(s => {
    const value = counts[s.key] || 0;
    if (value <= 0 || total <= 0) return;
    const dash = (value / total) * CIRC;
    const seg = document.createElementNS(SVG_NS, 'circle');
    seg.setAttribute('cx', '60'); seg.setAttribute('cy', '60'); seg.setAttribute('r', String(R));
    seg.setAttribute('fill', 'none'); seg.setAttribute('stroke', s.color);
    seg.setAttribute('stroke-width', '16'); seg.setAttribute('stroke-linecap', 'butt');
    seg.setAttribute('class', 'donut-seg');
    seg.setAttribute('stroke-dasharray', `${dash} ${CIRC - dash}`);
    seg.setAttribute('stroke-dashoffset', String(-offset));
    svg.appendChild(seg);
    offset += dash;
  });

  const totalEl = $('donutTotal');
  if (totalEl) totalEl.textContent = total;

  const legend = $('donutLegend');
  if (!legend) return;
  if (total === 0) {
    legend.innerHTML = '<span class="text-sm text-on-surface-variant italic">No invitations yet.</span>';
    return;
  }
  legend.innerHTML = STATUS_SLICES.map(s => {
    const value = counts[s.key] || 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return `<div class="legend-row">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span class="legend-label">${s.label}</span>
        <span class="legend-val">${value}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
  }).join('');
}

function renderTrendChart(invites) {
  const chart = $('trendChart');
  if (!chart) return;
  const DAYS = 14;

  const days = [];
  const buckets = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    buckets[key] = 0;
    days.push({ key, label: String(d.getDate()) });
  }

  (invites || []).forEach(inv => {
    const d = toDate(inv.createdAt);
    if (!d) return;
    const key = localDayKey(d);
    if (key in buckets) buckets[key]++;
  });

  const max = Math.max(1, ...days.map(d => buckets[d.key]));
  const windowTotal = days.reduce((sum, d) => sum + buckets[d.key], 0);

  chart.innerHTML = days.map(d => {
    const count = buckets[d.key];
    const px = count > 0 ? Math.max(3, Math.round((count / max) * 130)) : 2;
    const cls = count > 0 ? 'trend-bar' : 'trend-bar trend-bar-empty';
    return `<div class="trend-col" title="${d.key}: ${count}">
        <span class="trend-count">${count > 0 ? count : ''}</span>
        <div class="${cls}" style="height:${px}px"></div>
        <span class="trend-day">${d.label}</span>
      </div>`;
  }).join('');

  const summary = $('trendSummary');
  if (summary) summary.textContent = `${windowTotal} in last 14 days`;
}

// --- EXPORT (CSV opens directly in Excel) ---
function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return '"' + s.replace(/"/g, '""') + '"';
}

function csvRows(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

async function exportInvitationsCsv() {
  const btn = $('exportCsvBtn');
  const original = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-lg">progress_activity</span><span>Preparing…</span>'; }
  try {
    const invites = await getAllInvitations(true);
    const viewCounts = await getAllViewCounts().catch(() => ({}));
    const counts = {
      total:    invites.length,
      accepted: invites.filter(i => i.status === 'accepted').length,
      pending:  invites.filter(i => i.status === 'pending' || !i.status).length,
      declined: invites.filter(i => i.status === 'declined').length,
    };

    const rows = [];
    rows.push(['Amour — Invitation Report']);
    rows.push(['Generated', formatDateTime(new Date())]);
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total', counts.total]);
    rows.push(['Accepted', counts.accepted]);
    rows.push(['Pending', counts.pending]);
    rows.push(['Declined', counts.declined]);
    rows.push([]);
    rows.push(['ID', 'Date', 'Activity', 'Status', 'Responder', 'Created By', 'Location', 'Dress Code', 'Pick Up', 'Views', 'Unique Views', 'Created At']);

    invites
      .slice()
      .sort((a, b) => ((toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0)))
      .forEach(inv => {
        const vc = viewCounts[inv.id] || {};
        rows.push([
          inv.id,
          formatDateTime(inv.date),
          inv.activity || '',
          inv.status || 'pending',
          inv.acceptedBy || inv.declinedBy || '',
          inv.createdBy || '',
          inv.location || '',
          inv.dressCode || '',
          inv.pickupLocation || '',
          vc.total || 0,
          vc.uniques || 0,
          formatDateTime(inv.createdAt),
        ]);
      });

    const csv = '\uFEFF' + csvRows(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const a = document.createElement('a');
    a.href = url;
    a.download = `amour-invitations-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
}

if ($('exportCsvBtn')) $('exportCsvBtn').addEventListener('click', exportInvitationsCsv);

async function loadInvitations(filter) {
  const invites = await getAllInvitations(true);
  const viewCounts = await getAllViewCounts().catch(() => ({}));
=======
  const invites = await getAllInvitations();
  const users = await getUsers();
  statTotal.textContent = invites.length;
  statAccepted.textContent = invites.filter(i => i.status === 'accepted').length;
  statPending.textContent = invites.filter(i => i.status === 'pending' || !i.status).length;
}

async function loadInvitations(filter) {
  const invites = await getAllInvitations();
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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
<<<<<<< HEAD
    const vc = viewCounts[inv.id] ? viewCounts[inv.id] : {};
=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2

    tr.innerHTML = `
      <td class="p-4 font-mono text-xs text-on-surface-variant">${inv.id.slice(0, 8)}</td>
      <td class="p-4 whitespace-nowrap">${dateVal}</td>
      <td class="p-4">${inv.activity || '-'}</td>
      <td class="p-4">${statusBadge(inv.status)}</td>
      <td class="p-4">${responder}</td>
      <td class="p-4 text-xs text-on-surface-variant">${inv.createdBy || '—'}</td>
      <td class="p-4 max-w-[140px] truncate" title="${inv.location || ''}">${inv.location || '-'}</td>
<<<<<<< HEAD
      <td class="p-4"><span class="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">👀 ${vc.total || 0} <span class="opacity-70">(${vc.uniques || 0})</span></span></td>
=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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

<<<<<<< HEAD
=======
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

>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
// --- USERS ---
async function loadUsers() {
  const users = await getUsers();
  usersTableBody.innerHTML = '';

  if (users.length === 0) {
<<<<<<< HEAD
    usersTableBody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-on-surface-variant italic">No users yet.</td></tr>`;
=======
    usersTableBody.innerHTML = `<tr><td colspan="2" class="p-10 text-center text-on-surface-variant italic">No users yet.</td></tr>`;
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#eef5f7] transition-colors';
<<<<<<< HEAD
    const isSelf = u.username === sessionStorage.getItem('admin_email');
    tr.innerHTML = `
      <td class="p-4"><span class="font-mono text-xs text-on-surface-variant mr-2">#${u.id}</span>${u.username} ${isSelf ? '<span class="text-xs text-primary ml-2">(you)</span>' : ''}</td>
      <td class="p-4">${u.full_name || '—'}</td>
      <td class="p-4 text-xs text-on-surface-variant">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
      <td class="p-4 text-xs text-on-surface-variant">${u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'never'}</td>
      <td class="p-4"><span class="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">${u.invites || 0}</span></td>
      <td class="p-4">
        <div class="flex items-center gap-3">
          <button class="view-user-btn text-primary hover:text-primary/70 transition-all text-sm font-medium">View</button>
=======
    const isSelf = u.email === sessionStorage.getItem('admin_email');
    tr.innerHTML = `
      <td class="p-4">${u.email} ${isSelf ? '<span class="text-xs text-primary ml-2">(you)</span>' : ''}</td>
      <td class="p-4">
        <div class="flex items-center gap-3">
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
          <button class="edit-user-btn text-primary hover:text-primary/70 transition-all text-sm font-medium">Edit</button>
          <button class="delete-user-btn text-red-500 hover:text-red-700 transition-all text-sm font-medium ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}">${isSelf ? 'Cannot delete' : 'Delete'}</button>
        </div>
      </td>
    `;
<<<<<<< HEAD
    tr.querySelector('.view-user-btn').addEventListener('click', () => openUserDetail(u.id));
    tr.querySelector('.edit-user-btn').addEventListener('click', () => openEditUserModal(u.id, u.username));
    const delBtn = tr.querySelector('.delete-user-btn');
    if (!isSelf) {
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete user ${u.username}?`)) return;
        delBtn.disabled = true;
        try {
          await deleteUser(u.id);
          loadUsers();
          loadStats();
        } catch (err) {
          alert(err.message || 'Could not delete user');
          delBtn.disabled = false;
=======
    const editBtn = tr.querySelector('.edit-user-btn');
    editBtn.addEventListener('click', () => openEditUserModal(u.email, u.password));
    const delBtn = tr.querySelector('.delete-user-btn');
    if (!isSelf) {
      delBtn.addEventListener('click', async () => {
        if (confirm(`Delete user ${u.email}?`)) {
          await deleteUser(u.email);
          loadUsers();
          loadStats();
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
        }
      });
    }
    usersTableBody.appendChild(tr);
  });
}

<<<<<<< HEAD
// --- ACTIVITY (logins) ---
async function loadLogins() {
  loginsTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-on-surface-variant italic">Loading…</td></tr>`;
  try {
    const logins = await getLogins(200);
    if (!logins.length) {
      loginsTableBody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-on-surface-variant italic">No logins recorded yet.</td></tr>`;
      return;
    }
    loginsTableBody.innerHTML = logins.map(l => `
      <tr class="hover:bg-[#eef5f7] transition-colors">
        <td class="p-4 font-medium text-primary">${l.username || '—'}</td>
        <td class="p-4 text-xs text-on-surface-variant">${l.logged_at ? new Date(l.logged_at).toLocaleString() : ''}</td>
        <td class="p-4 font-mono text-xs">${l.ip || ''}</td>
        <td class="p-4 text-xs text-on-surface-variant">${l.browser || '?'} · ${l.os || '?'} (${l.device || '?'})</td>
        <td class="p-4"><button class="delete-login-btn text-red-500 hover:text-red-700 transition-all text-sm font-medium" data-id="${l.id}">Delete</button></td>
      </tr>`).join('');
  } catch (err) {
    loginsTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-500">${err.message}</td></tr>`;
  }
}

loginsTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-login-btn');
  if (!btn) return;
  if (!confirm('Delete this activity entry?')) return;
  btn.disabled = true;
  try {
    await deleteLogin(btn.dataset.id);
    loadLogins();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

clearLoginsBtn.addEventListener('click', async () => {
  if (!confirm('Delete ALL login activity? This cannot be undone.')) return;
  try {
    await clearLogins();
    loadLogins();
  } catch (err) {
    alert(err.message);
  }
});

// --- USER DETAIL ---
async function openUserDetail(id) {
  show(userDetailModal);
  userDetailModal.classList.add('flex');
  udTitle.textContent = 'Loading…';
  udSubtitle.textContent = '';
  udProfile.innerHTML = '';
  udStats.innerHTML = '';
  udInvitations.innerHTML = '';
  udResponses.innerHTML = '';
  udLogins.innerHTML = '';
  udUserId = id;
  udUsername = null;
  udDeleteBtn.classList.add('hidden');
  udDeleteBtn.disabled = true;
  try {
    const d = await getUserDetail(id);
    const u = d.user;
    udUserId = u.id;
    udUsername = u.username;
    const self = u.username === sessionStorage.getItem('admin_email');
    if (!self) {
      udDeleteBtn.classList.remove('hidden');
      udDeleteBtn.disabled = false;
    }
    udTitle.textContent = u.username + (u.full_name ? ` — ${u.full_name}` : '');
    udSubtitle.textContent = `Joined ${u.created_at ? new Date(u.created_at).toLocaleString() : '—'}`;

    const profileFields = [
      ['Full name', u.full_name || '—'],
      ['Gender', u.gender || '—'],
      ['Birth date', u.birth_date || '—'],
      ['Address', u.address || '—'],
      ['Last login', u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'never'],
    ];
    udProfile.innerHTML = profileFields.map(([k, v]) =>
      `<div class="bg-[#eef5f7] rounded-lg p-3"><div class="text-xs uppercase tracking-wider text-on-surface-variant">${k}</div><div class="font-medium text-primary break-words">${v}</div></div>`
    ).join('');

    const stat = (label, val) => `<div class="bg-white/70 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-primary">${val}</div><div class="text-xs text-on-surface-variant">${label}</div></div>`;
    udStats.innerHTML =
      stat('Invitations', d.counts.invitations) +
      stat('Accepted', d.counts.accepted) +
      stat('Responses', d.counts.responses) +
      stat('Photos', d.counts.photos) +
      stat('Logins', d.counts.logins);

    udInvitations.innerHTML = d.invitations.length
      ? d.invitations.map(i => `<div class="flex items-center justify-between gap-2 bg-[#eef5f7] rounded-lg p-3 text-sm"><span class="font-mono text-xs">#${i.id}</span><span class="flex-1 truncate">${i.activity || '—'}</span><span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">${i.status || 'pending'}</span><span class="text-xs text-on-surface-variant">${i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}</span></div>`).join('')
      : '<p class="text-sm text-on-surface-variant italic">No invitations.</p>';

    udResponses.innerHTML = d.responses.length
      ? d.responses.map(r => `<div class="flex items-center justify-between gap-2 bg-[#eef5f7] rounded-lg p-3 text-sm"><span>${r.decision === 'accepted' ? '✅ accepted' : '❌ declined'}</span><span class="font-mono text-xs">#${r.invitation_id}</span><span class="text-xs text-on-surface-variant">${r.responded_at ? new Date(r.responded_at).toLocaleString() : ''}</span></div>`).join('')
      : '<p class="text-sm text-on-surface-variant italic">No responses.</p>';

    udLogins.innerHTML = d.logins.length
      ? d.logins.map(l => `<div class="flex items-center justify-between gap-2 bg-[#eef5f7] rounded-lg p-3 text-sm"><span>${l.browser || '?'} · ${l.os || '?'} (${l.device || '?'})</span><span class="font-mono text-xs">${l.ip || ''}</span><span class="text-xs text-on-surface-variant">${l.logged_at ? new Date(l.logged_at).toLocaleString() : ''}</span></div>`).join('')
      : '<p class="text-sm text-on-surface-variant italic">No logins recorded.</p>';
  } catch (err) {
    udTitle.textContent = 'Error';
    udSubtitle.textContent = err.message;
  }
}

function closeUserDetail() {
  userDetailModal.classList.add('hidden');
  userDetailModal.classList.remove('flex');
}
udCloseBtn.addEventListener('click', closeUserDetail);
userDetailModal.addEventListener('click', (e) => { if (e.target === userDetailModal) closeUserDetail(); });

udDeleteBtn.addEventListener('click', async () => {
  if (!udUserId || udUsername === sessionStorage.getItem('admin_email')) return;
  if (!confirm(`Delete user ${udUsername}? This cannot be undone.`)) return;
  udDeleteBtn.disabled = true;
  try {
    await deleteUser(udUserId);
    closeUserDetail();
    loadUsers();
    loadStats();
  } catch (err) {
    udSubtitle.textContent = err.message;
    udDeleteBtn.disabled = false;
  }
});


=======
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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
<<<<<<< HEAD
function openEditUserModal(id, username) {
  editingUserId = id;
  editUserEmail.value = username;
  editUserPass.value = '';
=======
function openEditUserModal(email, password) {
  editingUserEmail = email;
  editUserEmail.value = email;
  editUserPass.value = password;
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
  editUserMsg.classList.add('hidden');
  editUserModal.classList.remove('hidden');
  editUserModal.classList.add('flex');
}

function closeEditUserModal() {
  editUserModal.classList.add('hidden');
  editUserModal.classList.remove('flex');
<<<<<<< HEAD
  editingUserId = null;
=======
  editingUserEmail = null;
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
}

editUserCancelBtn.addEventListener('click', closeEditUserModal);
editUserModal.addEventListener('click', (e) => { if (e.target === editUserModal) closeEditUserModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !editUserModal.classList.contains('hidden')) closeEditUserModal(); });

editUserSaveBtn.addEventListener('click', async () => {
  hide(editUserMsg);
  const newEmail = editUserEmail.value.trim();
  const newPass = editUserPass.value;
<<<<<<< HEAD
  if (!newEmail) {
    editUserMsg.textContent = 'Username is required';
=======
  if (!newEmail || !newPass) {
    editUserMsg.textContent = 'Fill in all fields';
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
    editUserMsg.className = 'text-sm text-red-600';
    show(editUserMsg);
    return;
  }
  try {
<<<<<<< HEAD
    await updateUser(editingUserId, newEmail, newPass);
=======
    await updateUser(editingUserEmail, newEmail, newPass);
>>>>>>> 62de656ea3be8bdb24cb55274d561083d3e72af2
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

