const BIN_ID = '6a45456ef5f4af5e294eb342';
const API_KEY = '$2a$10$olmUUG8ePRafuWbVgn.F/ubzifzJ0yrsdYY18vILEN3JTORPbYt8W';
const BASE = 'https://api.jsonbin.io/v3/b';

async function getBin() {
  const res = await fetch(`${BASE}/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': API_KEY }
  });
  const data = await res.json();
  return data.record;
}

async function saveBin(record) {
  await fetch(`${BASE}/${BIN_ID}`, {
    method: 'PUT',
    headers: {
      'X-Master-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(record)
  });
}

export async function getAllInvitations() {
  const bin = await getBin();
  return bin.invitations || [];
}

export async function getInvitation(id) {
  const invites = await getAllInvitations();
  return invites.find(i => i.id === id) || null;
}

export async function addInvitation(data) {
  const bin = await getBin();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  data.id = id;
  if (!bin.invitations) bin.invitations = [];
  bin.invitations.push(data);
  await saveBin(bin);
  return id;
}

export async function updateInvitation(id, updates) {
  const bin = await getBin();
  if (!bin.invitations) return;
  const idx = bin.invitations.findIndex(i => i.id === id);
  if (idx !== -1) {
    bin.invitations[idx] = { ...bin.invitations[idx], ...updates };
    await saveBin(bin);
  }
}

export async function deleteInvitation(id) {
  const bin = await getBin();
  if (!bin.invitations) return;
  bin.invitations = bin.invitations.filter(i => i.id !== id);
  await saveBin(bin);
}

export async function getUsers() {
  const bin = await getBin();
  return bin.users || [];
}

export async function addUser(email, password) {
  const bin = await getBin();
  if (!bin.users) bin.users = [];
  if (bin.users.find(u => u.email === email)) {
    throw new Error('User already exists');
  }
  bin.users.push({ email, password });
  await saveBin(bin);
}

export async function deleteUser(email) {
  const bin = await getBin();
  if (!bin.users) return;
  bin.users = bin.users.filter(u => u.email !== email);
  await saveBin(bin);
}

export async function updateUser(oldEmail, newEmail, password) {
  const bin = await getBin();
  if (!bin.users) return;
  const idx = bin.users.findIndex(u => u.email === oldEmail);
  if (idx === -1) throw new Error('User not found');
  if (newEmail !== oldEmail && bin.users.find(u => u.email === newEmail)) {
    throw new Error('Email already in use');
  }
  bin.users[idx] = { email: newEmail, password };
  await saveBin(bin);
}

export async function verifyUser(email, password) {
  const users = await getUsers();
  return users.find(u => u.email === email && u.password === password) || null;
}

// ========== SELF-CONTAINED INVITE LINKS ==========
// Encodes the invitation data directly into the URL so the link
// works even when the database is unreachable (offline, rate-limited...).
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
