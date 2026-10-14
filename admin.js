import { getAllInvitations, deleteInvitation, getUsers, addUser, deleteUser, updateUser, verifyUser, getAllViewCounts, getUserDetail, getLogins, deleteLogin, clearLogins, getSessionInfo, adminLogout } from './simple-db.js?v=8';

const $ = id => document.getElementById(id);

const loginSection = $('loginSection');
const dashboardSection = $('dashboardSection');
const displayAdminEmail = $('displayAdminEmail');
const displayAdminEmailMobile = $('displayAdminEmailMobile');
const tableBody = $('tableBody');
const adminEmail = $('adminEmail');
const adminPass = $('adminPass');
const loginBtn = $('loginBtn');
const loginError = $('loginError');

const tabInvitations = $('tabInvitations');
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

const statTotal = $('statTotal');
const statAccepted = $('statAccepted');
const statPending = $('statPending');

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

let currentFilter = 'all';

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

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
        <span>🚗 Pick up: ${inv.pickupLocation || '—'}</span>
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

function showDashboard(email) {
  sessionStorage.setItem('admin_email', email);
  hide(loginSection);
  show(dashboardSection);
  displayAdminEmail.textContent = email;
  if (displayAdminEmailMobile) displayAdminEmailMobile.textContent = email;
  loadStats();
  loadInvitations('all');
  setActiveFilter('all');
  switchTab(tabInvitations);
  show(invitationsTab);
}

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

// Login
loginBtn.addEventListener('click', async () => {
  hide(loginError);
  const email = adminEmail.value.trim();
  const pass = adminPass.value;
  if (!email || !pass) { loginError.textContent = 'Fill in all fields'; show(loginError); return; }
  const user = await verifyUser(email, pass);
  if (user) {
    let info = null;
    try { info = await getSessionInfo(); } catch (e) {}
    if (info && info.is_admin) {
      showDashboard((info.user && info.user.username) || email);
    } else {
      loginError.textContent = 'This account is not an admin';
      show(loginError);
    }
  } else {
    loginError.textContent = 'Invalid email or password';
    show(loginError);
  }
});

adminPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

async function logout() {
  try { await adminLogout(); } catch (e) {}
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

// Build one bucket per real calendar day, covering every day the app has
// activity: from the earliest invitation created to today (not a fixed window).
function buildDailyTrend(invites, opts = {}) {
  const maxDays = opts.maxDays || 400;
  const list = invites || [];

  let min = null;
  let max = null;
  list.forEach(inv => {
    const d = toDate(inv.createdAt);
    if (!d) return;
    d.setHours(0, 0, 0, 0);
    if (!min || d < min) min = new Date(d);
    if (!max || d > max) max = new Date(d);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (min && max) {
    if (max > today) max = new Date(today);
    if (min > max) min = new Date(max);
  } else {
    // No data yet: show the trailing 14 days so the chart is never a single bar.
    max = new Date(today);
    min = new Date(today);
    min.setDate(min.getDate() - 13);
  }

  // Hard cap so an old record set can't blow up the chart.
  const span = Math.round((max - min) / 86400000) + 1;
  if (span > maxDays) {
    min = new Date(max);
    min.setDate(min.getDate() - (maxDays - 1));
  }

  const days = [];
  const buckets = {};
  const cursor = new Date(min);
  while (cursor <= max) {
    const key = localDayKey(cursor);
    buckets[key] = 0;
    days.push({
      key,
      date: new Date(cursor),
      label: cursor.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      full: cursor.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      showLabel: false,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  list.forEach(inv => {
    const d = toDate(inv.createdAt);
    if (!d) return;
    const key = localDayKey(d);
    if (key in buckets) buckets[key]++;
  });

  // Keep the x-axis readable: at most ~14 real date labels across the range.
  const maxLabels = 14;
  const step = Math.max(1, Math.ceil(days.length / maxLabels));
  days.forEach((d, i) => {
    d.showLabel = i % step === 0 || i === days.length - 1;
  });

  return { days, buckets };
}

const TREND_BAR_AREA = 154;

function niceScale(max, targetTicks = 4) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  if (max <= targetTicks + 1) return { max: Math.max(1, max), step: 1 };
  const raw = max / targetTicks;
  const step = steps.find(s => s >= raw) || Math.ceil(raw / 1000) * 1000;
  return { max: Math.ceil(max / step) * step, step };
}

function renderTrendChart(invites) {
  const chart = $('trendChart');
  if (!chart) return;

  const { days, buckets } = buildDailyTrend(invites);
  const rawMax = Math.max(1, ...days.map(d => buckets[d.key]));
  const { max: niceMax, step } = niceScale(rawMax);
  const windowTotal = days.reduce((sum, d) => sum + buckets[d.key], 0);

  chart.innerHTML = days.map(d => {
    const count = buckets[d.key];
    const px = count > 0 ? Math.max(4, Math.round((count / niceMax) * TREND_BAR_AREA)) : 2;
    const cls = count > 0 ? 'trend-bar' : 'trend-bar trend-bar-empty';
    return `<div class="trend-col" title="${d.full}: ${count}">
        <span class="trend-count">${count > 0 ? count : ''}</span>
        <div class="${cls}" style="height:${px}px"></div>
      </div>`;
  }).join('');

  const ticks = [];
  for (let t = 0; t <= niceMax; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== niceMax) ticks.push(niceMax);

  const grid = $('trendGrid');
  if (grid) {
    grid.innerHTML = ticks.map(t => {
      const bottom = Math.round((t / niceMax) * TREND_BAR_AREA);
      const cls = t === 0 ? 'trend-gridline trend-baseline' : 'trend-gridline';
      return `<div class="${cls}" style="bottom:${bottom}px"></div>`;
    }).join('');
  }

  const yaxis = $('trendYAxis');
  if (yaxis) {
    yaxis.innerHTML = ticks.map(t => {
      const bottom = Math.round((t / niceMax) * TREND_BAR_AREA);
      const style = t === 0 ? 'bottom:0' : `bottom:${bottom}px; transform: translateY(50%)`;
      return `<span class="trend-ytick" style="${style}">${t}</span>`;
    }).join('');
  }

  const labels = $('trendLabels');
  if (labels) {
    labels.innerHTML = days.map(d =>
      `<div class="trend-label-col">${d.showLabel ? d.label : ''}</div>`
    ).join('');
  }

  const summary = $('trendSummary');
  if (summary) {
    if (days.length) {
      summary.textContent = `${windowTotal} · ${days[0].full} – ${days[days.length - 1].full}`;
    } else {
      summary.textContent = '';
    }
  }
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

    rows.push([]);
    rows.push(['Daily activity (every day)']);
    rows.push(['Date', 'Invitations']);
    const { days, buckets } = buildDailyTrend(invites);
    days.forEach(d => rows.push([d.full, buckets[d.key]]));

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
    const vc = viewCounts[inv.id] ? viewCounts[inv.id] : {};

    tr.innerHTML = `
      <td class="p-4 font-mono text-xs text-on-surface-variant">${inv.id.slice(0, 8)}</td>
      <td class="p-4 whitespace-nowrap">${dateVal}</td>
      <td class="p-4">${inv.activity || '-'}</td>
      <td class="p-4">${statusBadge(inv.status)}</td>
      <td class="p-4">${responder}</td>
      <td class="p-4 text-xs text-on-surface-variant">${inv.createdBy || '—'}</td>
      <td class="p-4 max-w-[140px] truncate" title="${inv.location || ''}">${inv.location || '-'}</td>
      <td class="p-4"><span class="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">👀 ${vc.total || 0} <span class="opacity-70">(${vc.uniques || 0})</span></span></td>
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

// --- USERS ---
async function loadUsers() {
  const users = await getUsers();
  usersTableBody.innerHTML = '';

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-on-surface-variant italic">No users yet.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#eef5f7] transition-colors';
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
          <button class="edit-user-btn text-primary hover:text-primary/70 transition-all text-sm font-medium">Edit</button>
          <button class="delete-user-btn text-red-500 hover:text-red-700 transition-all text-sm font-medium ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}">${isSelf ? 'Cannot delete' : 'Delete'}</button>
        </div>
      </td>
    `;
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
        }
      });
    }
    usersTableBody.appendChild(tr);
  });
}

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
function openEditUserModal(id, username) {
  editingUserId = id;
  editUserEmail.value = username;
  editUserPass.value = '';
  editUserMsg.classList.add('hidden');
  editUserModal.classList.remove('hidden');
  editUserModal.classList.add('flex');
}

function closeEditUserModal() {
  editUserModal.classList.add('hidden');
  editUserModal.classList.remove('flex');
  editingUserId = null;
}

editUserCancelBtn.addEventListener('click', closeEditUserModal);
editUserModal.addEventListener('click', (e) => { if (e.target === editUserModal) closeEditUserModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !editUserModal.classList.contains('hidden')) closeEditUserModal(); });

editUserSaveBtn.addEventListener('click', async () => {
  hide(editUserMsg);
  const newEmail = editUserEmail.value.trim();
  const newPass = editUserPass.value;
  if (!newEmail) {
    editUserMsg.textContent = 'Username is required';
    editUserMsg.className = 'text-sm text-red-600';
    show(editUserMsg);
    return;
  }
  try {
    await updateUser(editingUserId, newEmail, newPass);
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

