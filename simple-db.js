// PHP/MySQL backend client for Date Agenda.
// Talks to the split backends (user.php / admin.php). Keeps the same function names the app already uses.

// Route to the split backends: the admin panel talks to admin.php,
// every other page (index, account) talks to user.php.
const PAGE = (window.location.pathname.split('/').pop() || '').toLowerCase();
const API = PAGE === 'admin.html' ? 'admin.php' : 'user.php';

async function call(action, payload = {}, method = 'POST') {
  const opts = { credentials: 'same-origin', headers: {} };
  let url = `${API}?action=${encodeURIComponent(action)}`;
  if (method === 'POST') {
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload);
  } else {
    for (const [k, v] of Object.entries(payload)) {
      url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Server did not return JSON. Is PHP running?'); }
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ========== AUTH ==========
export async function registerUser(username, password, profile = {}) {
  const r = await call('register', { username, password, ...profile });
  return r.user;
}

export async function loginUser(username, password) {
  const r = await call('login', { username, password });
  return r.user;
}

export async function logoutUser() {
  return call('logout');
}

export async function getSession() {
  const r = await call('session', {}, 'GET');
  return r.user;
}

export async function getSessionInfo() {
  return call('session', {}, 'GET');
}

export async function adminLogout() {
  return call('admin_logout');
}

export async function updateAccount(currentPassword, username, newPassword, profile = {}) {
  const r = await call('account_update', { current_password: currentPassword, username, new_password: newPassword, ...profile });
  return r.user;
}

// ========== INVITATIONS ==========
export async function getAllInvitations(scopeAll = false) {
  const r = await call('invitations_list', scopeAll ? { scope: 'all' } : {}, 'GET');
  return r.invitations || [];
}

export async function getInvitation(id) {
  const r = await call('invitation_get', { id });
  return r.invitation || null;
}

export async function addInvitation(data) {
  const r = await call('invitation_add', { data });
  return r.id;
}

export async function updateInvitation(id, updates) {
  await call('invitation_update', { id, patch: updates });
}

export async function deleteInvitation(id) {
  await call('invitation_delete', { id });
}

// ========== PHOTOS (shared album) ==========
export async function addPhoto(invitationId, data, by = '') {
  const r = await call('photo_add', { id: invitationId, data, by });
  return r.id;
}

export async function getPhotos(invitationId) {
  const r = await call('photos_list', { id: invitationId });
  return r.photos || [];
}

export async function deletePhoto(photoId) {
  await call('photo_delete', { id: photoId });
}

// ========== VIEW TRACKING ==========
export async function recordView(id) {
  try { await call('view_record', { id }); } catch (e) { /* never block the UI */ }
}

export async function getViews(id) {
  return call('views_list', { id });
}

export async function getAllViewCounts() {
  const r = await call('views_all', {}, 'GET');
  return r.counts || {};
}

// ========== USERS (admin) ==========
export async function getUsers() {
  const r = await call('users_list', {}, 'GET');
  return r.users || [];
}

export async function addUser(username, password) {
  await call('user_add', { username, password });
}

export async function deleteUser(id) {
  await call('user_delete', { id });
}

export async function updateUser(id, username, password) {
  await call('user_update', { id, username, password });
}

export async function getUserDetail(id) {
  return call('user_detail', { id });
}

export async function getLogins(limit = 200, userId = null) {
  const r = await call('logins_list', userId ? { limit, user_id: userId } : { limit }, 'GET');
  return r.logins || [];
}

export async function deleteLogin(id) {
  await call('login_delete', { id });
}

export async function clearLogins() {
  await call('login_clear');
}

export async function verifyUser(username, password) {
  try {
    return await loginUser(username, password);
  } catch {
    return null;
  }
}

// ========== SELF-CONTAINED INVITE LINKS ==========
// The invitation data is still embedded in the URL so a link keeps working
// even if the backend is unreachable (offline, server down...).
export function encodeInvite(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvite(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function buildInviteLink(id, data) {
  const base = `${window.location.origin}${window.location.pathname.replace(/admin\.html$/, '')}`;
  const payload = encodeInvite({ ...data, id });
  return `${base}?i=${id}#d=${payload}`;
}
