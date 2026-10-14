import { getSession, loginUser, registerUser, logoutUser, updateAccount } from './simple-db.js?v=8';

const $ = id => document.getElementById(id);

const authCard = $('authCard');
const idCard = $('idCard');
const accountCard = $('accountCard');
const loginPane = $('loginPane');
const registerPane = $('registerPane');

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function msg(el, text, ok = false) {
  el.textContent = text;
  el.className = 'text-sm ' + (ok ? 'text-primary' : 'text-error');
  show(el);
}

// --- tabs ---
$('authTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  const tab = btn.dataset.tab;
  document.querySelectorAll('#authTabs button').forEach(b => {
    b.classList.toggle('bg-white', b === btn);
    b.classList.toggle('shadow', b === btn);
    b.classList.toggle('text-primary', b === btn);
    b.classList.toggle('text-on-surface-variant', b !== btn);
  });
  tab === 'login' ? (show(loginPane), hide(registerPane)) : (hide(loginPane), show(registerPane));
});

// --- login ---
$('loginBtn').addEventListener('click', async () => {
  const err = $('loginError'); hide(err);
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  if (!username || !password) return msg(err, 'Fill in all fields');
  try {
    await loginUser(username, password);
    await loadAccount();
  } catch (e) {
    msg(err, e.message);
  }
});
$('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginBtn').click(); });

// --- register ---
$('registerBtn').addEventListener('click', async () => {
  const err = $('regError'); hide(err);
  const username = $('regUser').value.trim();
  const p1 = $('regPass').value;
  const p2 = $('regPass2').value;
  if (!username || !p1 || !p2) return msg(err, 'Fill in all fields');
  if (p1 !== p2) return msg(err, 'Passwords do not match');
  if (p1.length < 6) return msg(err, 'Password must be at least 6 characters');
  const profile = {
    full_name: $('regFullName').value.trim(),
    gender: $('regGender').value,
    birth_date: $('regBirthDate').value,
    address: $('regAddress').value.trim(),
  };
  if (!profile.full_name) return msg(err, 'Enter your full name');
  try {
    const user = await registerUser(username, p1, profile);
    hide(authCard);
    $('newId').textContent = user.id;
    $('newUsername').textContent = user.username;
    show(idCard);
  } catch (e) {
    msg(err, e.message);
  }
});
$('regPass2').addEventListener('keydown', e => { if (e.key === 'Enter') $('registerBtn').click(); });

// --- account panel ---
async function loadAccount() {
  const user = await getSession();
  if (!user) { show(authCard); hide(accountCard); return; }
  hide(authCard);
  $('acctId').textContent = user.id;
  $('acctUser').value = user.username;
  $('acctFullName').value = user.full_name || '';
  $('acctGender').value = user.gender || '';
  $('acctBirthDate').value = user.birth_date ? String(user.birth_date).slice(0, 10) : '';
  $('acctAddress').value = user.address || '';
  show(accountCard);
}

$('saveBtn').addEventListener('click', async () => {
  const out = $('acctMsg'); hide(out);
  const current = $('acctCurrent').value;
  const username = $('acctUser').value.trim();
  const newPass = $('acctNew').value;
  if (!current) return msg(out, 'Enter your current password to save changes');
  if (newPass && newPass.length < 6) return msg(out, 'New password must be at least 6 characters');
  const profile = {
    full_name: $('acctFullName').value.trim(),
    gender: $('acctGender').value,
    birth_date: $('acctBirthDate').value,
    address: $('acctAddress').value.trim(),
  };
  try {
    const user = await updateAccount(current, username, newPass, profile);
    $('acctUser').value = user.username;
    $('acctFullName').value = user.full_name || '';
    $('acctGender').value = user.gender || '';
    $('acctBirthDate').value = user.birth_date ? String(user.birth_date).slice(0, 10) : '';
    $('acctAddress').value = user.address || '';
    $('acctCurrent').value = '';
    $('acctNew').value = '';
    msg(out, 'Saved ✓', true);
  } catch (e) {
    msg(out, e.message);
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await logoutUser();
  show(authCard);
  hide(accountCard);
  hide(idCard);
});

loadAccount();
