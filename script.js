import { addInvitation, getInvitation, getAllInvitations, deleteInvitation, updateInvitation, encodeInvite, decodeInvite, buildInviteLink, getSession, getSessionInfo, loginUser, registerUser, logoutUser, recordView, getViews, addPhoto, getPhotos, deletePhoto } from './simple-db.js?v=7';

document.addEventListener('DOMContentLoaded', () => {
  let currentInviteId = new URLSearchParams(location.search).get('i');

  // Invitation data embedded in the URL (#d=...) — works with zero backend
  const hashMatch = location.hash.match(/[#&]d=([^&]+)/);
  const sharedInvite = hashMatch ? decodeInvite(hashMatch[1]) : null;
  // A self-contained link is a receiver link even when it carries no ?i= id.
  if (!currentInviteId && sharedInvite && sharedInvite.id) currentInviteId = String(sharedInvite.id);
  const hasShareLink = !!(currentInviteId || sharedInvite);

  let currentUser = null;
  let viewerIsOwner = false; // true when the signed-in user is the creator of this invite
  let openResponseModalRef = null;
  let updateOfficialCardRef = null;
  let updateOfficialCardBlankRef = null;
  let pendingPlanModal = false;
  const accountLink = document.getElementById('accountLink');

  // Switch the page into the guest (receiver) experience
  function applyReceiverView() {
    const genBtn = document.getElementById('generate-btn');
    if (genBtn) genBtn.style.display = 'none';
    const loginBtn = document.getElementById('loginToggleBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    const createBtn = document.getElementById('createInviteTop');
    if (createBtn) createBtn.style.display = 'none';

    const titleEl = document.querySelector('.letter-title');
    const questionEl = document.querySelector('.letter-question');
    const footnoteEl = document.querySelector('.letter-footnote');
    if (titleEl) titleEl.textContent = 'Hello Beautiful,';
    if (questionEl) questionEl.innerHTML = 'Would you like to go on a date with me,<br>hang out with me,<br>spend time with me?';
    if (footnoteEl) footnoteEl.innerHTML = '🌸 (the No button has a mind of its own...)';

    // Recipient view: read-only, no editing allowed
    const creatorPanel = document.getElementById('creator-panel');
    const recipientPanel = document.getElementById('recipient-panel');
    if (creatorPanel) creatorPanel.classList.add('hidden');
    if (recipientPanel) recipientPanel.classList.remove('hidden');
  }

  // Load the PHP session, then decide whether we're the host or a guest.
  // Opening a shared link ALWAYS shows the receiver (guest) experience, no login —
  // for everyone, including the creator/admin. The host dashboard lives at the
  // plain URL (index.html) and admin.html.
  getSession().then(async (user) => {
    if (user) { currentUser = user.username; currentUserProfile = user; }
    if (hasShareLink) {
      let owner = false;
      if (user && currentInviteId) {
        try {
          const inv = await getInvitation(currentInviteId);
          owner = !!inv && String(inv.createdBy || '') === user.username;
        } catch (e) { /* treat as guest */ }
      }
      viewerIsOwner = owner;
      applyReceiverView();
      if (!owner && currentInviteId) recordView(currentInviteId);
    }
    updateLoginUI();
  }).catch(() => {});

  // ========== DARK MODE TOGGLE ==========
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  function applyThemeIcon() {
    if (!themeToggleBtn) return;
    themeToggleBtn.textContent = document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode';
  }
  applyThemeIcon();
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('amour_theme', dark ? 'dark' : 'light'); } catch (e) {}
    applyThemeIcon();
  });

  // ========== MODAL ACCESSIBILITY (Esc to close, Tab trapped inside) ==========
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const modalRegistry = [];
  function registerModal(el, closeFn) {
    if (el && !modalRegistry.find(m => m.el === el)) modalRegistry.push({ el, closeFn });
  }
  function isModalOpen(el) {
    const inline = el.style && el.style.display;
    if (inline === 'flex' || inline === 'block') return true;
    if (inline === 'none') return false;
    return !el.classList.contains('hidden');
  }
  document.addEventListener('keydown', (e) => {
    const open = modalRegistry.filter(m => isModalOpen(m.el));
    if (!open.length) return;
    const topEntry = open[open.length - 1];
    const top = topEntry.el;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      topEntry.closeFn();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(top.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!top.contains(document.activeElement)) {
        e.preventDefault(); first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  // ========== LOGIN LOGIC ==========
  const loginToggleBtn = document.getElementById('loginToggleBtn');
  const loginModal = document.getElementById('loginModal');
  const loginEmailInput = document.getElementById('loginEmailInput');
  const loginPassInput = document.getElementById('loginPassInput');
  const loginModalBtn = document.getElementById('loginModalBtn');
  const loginModalError = document.getElementById('loginModalError');
  const loginModalInfo = document.getElementById('loginModalInfo');
  const loginModalClose = document.getElementById('loginModalClose');
  const loginModalTitle = document.getElementById('loginModalTitle');
  const loginModalIcon = document.getElementById('loginModalIcon');
  const loginModeToggle = document.getElementById('loginModeToggle');
  const loginModeSwitchText = document.getElementById('loginModeSwitchText');
  const userStatus = document.getElementById('userStatus');
  const registerFields = document.getElementById('registerFields');
  const regFullNameInput = document.getElementById('regFullName');
  const regGenderInput = document.getElementById('regGender');
  const regBirthDateInput = document.getElementById('regBirthDate');
  const regAddressInput = document.getElementById('regAddress');

  let loginGateActive = false;
  let loginMode = 'login';
  let currentUserProfile = null;

  function updateLoginUI() {
    if (currentUser) {
      userStatus.textContent = currentUser;
      userStatus.classList.remove('hidden');
      loginToggleBtn.textContent = 'Logout';
    } else {
      userStatus.classList.add('hidden');
      loginToggleBtn.textContent = 'Login';
    }
    // Receivers (opened a shared link) don't get the Account link in the top bar
    if (accountLink) accountLink.classList.toggle('hidden', hasShareLink);
  }
  updateLoginUI();

  function setLoginMode(mode) {
    loginMode = mode;
    if (loginModalError) loginModalError.classList.add('hidden');
    if (loginModalInfo) loginModalInfo.classList.add('hidden');
    if (registerFields) registerFields.classList.toggle('hidden', mode !== 'register');
    if (mode === 'register') {
      if (loginModalTitle) loginModalTitle.textContent = 'Create your account';
      if (loginModalIcon) loginModalIcon.textContent = '✨';
      loginModalBtn.textContent = 'Create account';
      if (loginModeSwitchText) loginModeSwitchText.textContent = 'Already have an account?';
      if (loginModeToggle) loginModeToggle.textContent = 'Log in';
    } else {
      if (loginModalTitle) loginModalTitle.textContent = 'Login to enter';
      if (loginModalIcon) loginModalIcon.textContent = '💘';
      loginModalBtn.textContent = 'Login';
      if (loginModeSwitchText) loginModeSwitchText.textContent = 'No account yet?';
      if (loginModeToggle) loginModeToggle.textContent = 'Create one';
    }
  }

  function showLoginModal() { loginModal.classList.remove('hidden'); loginModal.classList.add('flex'); loginEmailInput.focus(); }
  function hideLoginModal() {
    if (loginGateActive) return; // cannot leave the entry gate until logged in
    loginModal.classList.add('hidden');
    loginModal.classList.remove('flex');
  }
  registerModal(loginModal, hideLoginModal);

  // Entry gate shown after the envelope / hearts animation
  function openLoginGate() {
    loginGateActive = true;
    setLoginMode('login');
    if (loginModalClose) loginModalClose.classList.add('hidden');
    loginEmailInput.value = '';
    loginPassInput.value = '';
    showLoginModal();
  }

  function closeLoginGate() {
    loginGateActive = false;
    if (loginModalClose) loginModalClose.classList.remove('hidden');
    loginModal.classList.add('hidden');
    loginModal.classList.remove('flex');
  }

  if (loginModeToggle) {
    loginModeToggle.addEventListener('click', () => setLoginMode(loginMode === 'login' ? 'register' : 'login'));
  }

  loginToggleBtn.addEventListener('click', async () => {
    if (currentUser) {
      try { await logoutUser(); } catch (e) {}
      currentUser = null;
      currentUserProfile = null;
      // Forget any receiver context so a logged-out user is never treated as a guest
      currentInviteId = null;
      viewerIsOwner = false;
      try { history.replaceState({}, '', location.pathname); } catch (e) {}
      updateLoginUI();
      // Send them back to the start (open-envelope) screen
      closeLoginGate();
      resetToEnvelope();
    } else {
      setLoginMode('login');
      showLoginModal();
    }
  });

  // Single sign-in: after authenticating, the account's role decides where to go.
  // The superadmin is sent straight to the admin panel; everyone else stays here.
  async function routeIfAdmin() {
    try {
      const info = await getSessionInfo();
      if (info && info.user && info.user.is_admin) {
        window.location.replace('admin.html');
        return true;
      }
    } catch (e) { /* stay on the public app */ }
    return false;
  }

  loginModalBtn.addEventListener('click', async () => {
    loginModalError.classList.add('hidden');
    if (loginModalInfo) loginModalInfo.classList.add('hidden');
    const email = loginEmailInput.value.trim();
    const pass = loginPassInput.value;
    if (!email || !pass) { loginModalError.textContent = 'Fill in all fields'; loginModalError.classList.remove('hidden'); return; }
    if (loginMode === 'register' && pass.length < 6) {
      loginModalError.textContent = 'Password must be at least 6 characters';
      loginModalError.classList.remove('hidden');
      return;
    }
    let profile = null;
    if (loginMode === 'register') {
      profile = {
        full_name: regFullNameInput ? regFullNameInput.value.trim() : '',
        gender: regGenderInput ? regGenderInput.value : '',
        birth_date: regBirthDateInput ? regBirthDateInput.value : '',
        address: regAddressInput ? regAddressInput.value.trim() : '',
      };
      if (!profile.full_name) {
        loginModalError.textContent = 'Please enter your full name';
        loginModalError.classList.remove('hidden');
        return;
      }
    }
    loginModalBtn.disabled = true;
    const originalLabel = loginModalBtn.textContent;
    loginModalBtn.textContent = loginMode === 'register' ? 'Creating…' : 'Signing in…';
    try {
      if (loginMode === 'register') {
        const created = await registerUser(email, pass, profile);
        await loginUser(email, pass);
        if (await routeIfAdmin()) return;
        currentUser = (created && created.username) || email;
        currentUserProfile = created || { username: email, ...profile };
        updateLoginUI();
        const newId = created && created.id != null ? created.id : '—';
        if (loginModalInfo) {
          loginModalInfo.textContent = `Account created! Your ID is #${newId}.`;
          loginModalInfo.classList.remove('hidden');
        }
        showToast(`✨ Account created — your ID is #${newId}`);
      } else {
        const user = await loginUser(email, pass);
        if (await routeIfAdmin()) return;
        currentUser = user.username;
        currentUserProfile = user;
        updateLoginUI();
      }
      loginEmailInput.value = '';
      loginPassInput.value = '';
      if (regFullNameInput) regFullNameInput.value = '';
      if (regBirthDateInput) regBirthDateInput.value = '';
      if (regAddressInput) regAddressInput.value = '';
      if (regGenderInput) regGenderInput.value = '';
      if (loginGateActive) {
        closeLoginGate();
        showLoadingAndReveal();
      } else {
        hideLoginModal();
      }
    } catch (err) {
      const msg = loginMode === 'register'
        ? (err.message || 'Could not create account')
        : 'Wrong username or password. Please try again.';
      loginModalError.textContent = msg;
      loginModalError.classList.remove('hidden');
      showToast('❌ ' + msg);
      const card = loginModal.querySelector('.glass-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
    } finally {
      loginModalBtn.disabled = false;
      loginModalBtn.textContent = loginMode === 'register' ? 'Create account' : originalLabel;
      setLoginMode(loginMode);
    }
  });

  loginModalClose.addEventListener('click', hideLoginModal);
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideLoginModal(); });

  // ========== ENVELOPE LOGIC ==========
    const envelopeOverlay = document.getElementById('envelopeOverlay');
    const closedEnvelopeDiv = document.getElementById('closedEnvelope');
    const letterCard = document.getElementById('letterContent');
    const heartOpenBtn = document.getElementById('heartToOpen');
    const mainApp = document.getElementById('mainApp');
    const yesBtn = document.getElementById('yesBtn');
    const noBtn = document.getElementById('noBtn');
    const buttonPairParent = document.getElementById('buttonPairParent');

    function openEnvelopeRomance() {
      if (!closedEnvelopeDiv || !letterCard) return;
      if (heartOpenBtn) {
        heartOpenBtn.classList.add('pulse');
        setTimeout(() => heartOpenBtn.classList.remove('pulse'), 400);
      }
      closedEnvelopeDiv.classList.add('open-animation');
      setTimeout(() => {
        closedEnvelopeDiv.style.display = 'none';
        letterCard.classList.add('show-letter');
      }, 600);
    }

    // Return to the very first screen (closed envelope) — used after logout
    function resetToEnvelope() {
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; }
      if (mainApp) { mainApp.classList.add('hidden-app'); mainApp.style.display = 'none'; }
      if (letterCard) letterCard.classList.remove('show-letter');
      if (closedEnvelopeDiv) {
        closedEnvelopeDiv.style.display = '';
        closedEnvelopeDiv.classList.remove('open-animation');
      }
      if (envelopeOverlay) {
        envelopeOverlay.style.display = 'flex';
        envelopeOverlay.style.opacity = '1';
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Fade the envelope out, run an animated loading screen, then reveal the main page
    function showLoadingAndReveal() {
      const loadingOverlay = document.getElementById('loadingOverlay');
      const loadingText = document.getElementById('loadingText');
      if (envelopeOverlay) envelopeOverlay.style.opacity = '0';
      setTimeout(() => {
        if (envelopeOverlay) envelopeOverlay.style.display = 'none';
        if (loadingOverlay) { loadingOverlay.classList.remove('hidden'); loadingOverlay.style.display = 'flex'; }
        if (loadingText) loadingText.textContent = 'Loading…';

        setTimeout(() => {
          if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; }
          if (mainApp) {
            mainApp.classList.remove('hidden-app');
            mainApp.style.display = 'block';
            initDatePlanner();
            if (typeof loadResponsesTable === 'function') loadResponsesTable();
            if (typeof loadSenderHistory === 'function') loadSenderHistory();
          }
        }, 2400);
      }, 400);
    }

    if (heartOpenBtn) {
      heartOpenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Opening a shared link always shows the receiver experience:
        // envelope -> question (Yes/No) -> Yes -> loading -> system. No login.
        if (hasShareLink) { openEnvelopeRomance(); return; }
        // No link and nobody signed in: show the creator entry gate.
        spawnHearts();
        setTimeout(() => {
          if (envelopeOverlay) { envelopeOverlay.style.opacity = '0'; envelopeOverlay.style.display = 'none'; }
          openLoginGate();
        }, 1100);
      });
    }

    // No button dodging
    function moveNoButton() {
      if (!noBtn || !buttonPairParent) return;
      const parentRect = buttonPairParent.getBoundingClientRect();
      const btnRect = noBtn.getBoundingClientRect();
      const maxShiftX = Math.min(140, parentRect.width - btnRect.width - 10);
      const maxShiftY = Math.min(70, parentRect.height - btnRect.height - 10);
      let shiftX = (Math.random() - 0.5) * maxShiftX * 1.6;
      let shiftY = (Math.random() - 0.5) * maxShiftY * 1.4;
      shiftX = Math.min(maxShiftX, Math.max(-maxShiftX, shiftX));
      shiftY = Math.min(maxShiftY, Math.max(-maxShiftY, shiftY));
      noBtn.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
      noBtn.classList.add('no-escape-btn');
    }

    if (noBtn) {
      const evade = (e) => { e.preventDefault(); moveNoButton(); return false; };
      noBtn.addEventListener('mouseenter', evade);
      noBtn.addEventListener('click', evade);
    }

    // Hearts flying animation
    function spawnHearts() {
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const heart = document.createElement('div');
          heart.classList.add('confetti');
          heart.innerHTML = '❤️';
          heart.style.position = 'fixed';
          heart.style.bottom = '0px';
          heart.style.left = Math.random() * window.innerWidth + 'px';
          heart.style.fontSize = (Math.random() * 28 + 16) + 'px';
          heart.style.opacity = '1';
          heart.style.zIndex = '2000';
          heart.style.pointerEvents = 'none';
          document.body.appendChild(heart);
          let posY = 0;
          let posX = parseFloat(heart.style.left);
          let velY = -9 - Math.random() * 8;
          let velX = (Math.random() - 0.5) * 5;
          let gravity = 0.2;
          let opacity = 1;
          function fly() {
            posY += velY;
            posX += velX;
            velY += gravity;
            opacity -= 0.012;
            heart.style.transform = `translate(${posX - parseFloat(heart.style.left)}px, ${posY}px) rotate(${posY * 2}deg)`;
            heart.style.opacity = opacity;
            if (opacity > 0 && posY < window.innerHeight + 100) requestAnimationFrame(fly);
            else heart.remove();
          }
          requestAnimationFrame(fly);
        }, i * 20);
      }
    }

    // Hearts + reveal main app on Yes
    function burstHeartsAndReveal() {
      spawnHearts();
      setTimeout(() => {
        showLoadingAndReveal();
      }, 200);
    }

    if (yesBtn) {
      yesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Receiver: let her plan the date (name, pickup, when, where, what to wear)
        // opened once the loading screen finishes and the planner is ready.
        if (!hasShareLink && !currentUser) { openLoginGate(); return; }
        if (hasShareLink) pendingPlanModal = true;
        burstHeartsAndReveal();
      });
    }

    // ========== DATE PLANNER ==========
    function initDatePlanner() {
      if (initDatePlanner._done) return;
      initDatePlanner._done = true;
      const inputDateTime = document.getElementById('input-datetime');
      const inputLocation = document.getElementById('input-location');
      const inputDress = document.getElementById('input-dress');
      const inputActivity = document.getElementById('input-activity');
      let inputSong = document.getElementById('input-song');
      const previewDate = document.getElementById('preview-date');
      const previewLocation = document.getElementById('preview-location');
      const previewDress = document.getElementById('preview-dress');
      const previewActivity = document.getElementById('preview-activity');
      const cardBg = document.getElementById('card-bg');
      const generateBtn = document.getElementById('generate-btn');
      const modalOverlay = document.getElementById('modal-overlay');
      const closeModal = document.getElementById('close-modal');
      const copyLinkBtn = document.getElementById('copyLinkBtn');
      const playPauseBtn = document.getElementById('play-pause-btn');
      const playIcon = document.getElementById('play-icon');
      const acceptBtn = document.getElementById('accept-btn');
      const declineBtn = document.getElementById('decline-btn');

      const activityImages = {
        "Candlelight Dinner": "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800",
        "Sunset Walk": "https://images.unsplash.com/photo-1510312305653-8ed496efbe75?w=800",
        "Movie Night": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
        "Surprise Adventure": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"
      };

      function updatePreview() {
        if (inputDateTime.value) {
          const d = new Date(inputDateTime.value);
          previewDate.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        previewLocation.textContent = inputLocation.value.trim() || 'The Secret Spot';
        previewDress.textContent = inputDress.value;
        previewActivity.textContent = inputActivity.value;
        if (activityImages[inputActivity.value]) cardBg.src = activityImages[inputActivity.value];
      }

      async function loadInvitationData(id) {
        let d = null;
        try {
          d = await getInvitation(id);
        } catch (err) {
          console.warn('Database unreachable, falling back to data embedded in the link.', err);
        }
        if (!d && sharedInvite && (!sharedInvite.id || sharedInvite.id === id)) d = sharedInvite;
        if (d) {
          if (d.date) inputDateTime.value = d.date;
          if (d.location) inputLocation.value = d.location;
          if (d.dressCode) inputDress.value = d.dressCode;
          if (d.activity) inputActivity.value = d.activity;
          if (d.songUrl && inputSong) { inputSong.value = d.songUrl; loadSong(d.songUrl); }
          updatePreview();

          // Read-only recipient details: "from" + formatted date
          const fromEl = document.getElementById('preview-from');
          const rdFrom = document.getElementById('rd-from');
          const sender = (d.creatorName && String(d.creatorName)) || (d.createdBy ? String(d.createdBy).split('@')[0] : 'someone special');
          if (fromEl) fromEl.textContent = sender;
          if (rdFrom) rdFrom.textContent = sender;
          if (d.date) {
            const dt = new Date(d.date);
            const rdDate = document.getElementById('rd-date');
            if (rdDate && !isNaN(dt)) rdDate.textContent = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          const rdLoc = document.getElementById('rd-location');
          const rdDress = document.getElementById('rd-dress');
          const rdAct = document.getElementById('rd-activity');
          const rdPickup = document.getElementById('rd-pickup');
          if (rdLoc) rdLoc.textContent = d.location || '—';
          if (rdDress) rdDress.textContent = d.dressCode || '—';
          if (rdAct) rdAct.textContent = d.activity || '—';
          if (rdPickup) rdPickup.textContent = d.pickupLocation || '—';

          // Prefill the planning form with whatever is already known
          if (planPickup && d.pickupLocation) planPickup.value = d.pickupLocation;
          if (planPlace && d.location) planPlace.value = d.location;
          if (planActivity && d.activity) planActivity.value = d.activity;
          if (planDress && d.dressCode) planDress.value = d.dressCode;
          if (planDatetime && d.date) planDatetime.value = String(d.date).replace(' ', 'T').slice(0, 16);

          // Already responded earlier? Show it and lock the buttons
          if ((d.status === 'accepted' || d.status === 'declined') && acceptBtn && declineBtn && !acceptBtn.disabled) {
            if (d.status === 'accepted') {
              acceptBtn.textContent = d.acceptedBy ? `Accepted by ${d.acceptedBy} 💖` : 'Accepted 💖';
              acceptBtn.classList.remove('bg-white', 'text-primary');
              acceptBtn.classList.add('bg-secondary-container', 'text-on-secondary-container');
            } else {
              declineBtn.textContent = d.declinedBy ? `Declined by ${d.declinedBy} 🍃` : 'Declined 🍃';
            }
            acceptBtn.disabled = true;
            declineBtn.disabled = true;
            acceptBtn.classList.add('opacity-70', 'cursor-not-allowed');
            declineBtn.classList.add('opacity-70', 'cursor-not-allowed');
          }
        }
      }
      if (currentInviteId) loadInvitationData(currentInviteId);

      [inputDateTime, inputLocation, inputDress, inputActivity].forEach(el => el.addEventListener('input', updatePreview));
      const now = new Date(); now.setHours(19,0,0,0);
      if (inputDateTime) { inputDateTime.value = now.toISOString().slice(0,16); updatePreview(); }

      // ========== COUNTDOWN TIMER ==========
      const countdownBox = document.getElementById('countdown-box');
      const cdEls = {
        days: document.getElementById('cd-days'),
        hours: document.getElementById('cd-hours'),
        mins: document.getElementById('cd-mins'),
        secs: document.getElementById('cd-secs')
      };
      const countdownLabel = document.getElementById('countdown-label');
      // Countdown only runs when the card holds a confirmed (accepted) plan.
      let officialCardActive = true;

      function updateCountdown() {
        if (!officialCardActive) { if (countdownBox) countdownBox.classList.add('hidden'); return; }
        if (!countdownBox || !inputDateTime.value) { if (countdownBox) countdownBox.classList.add('hidden'); return; }
        const target = new Date(inputDateTime.value).getTime();
        if (isNaN(target)) { countdownBox.classList.add('hidden'); return; }
        countdownBox.classList.remove('hidden');
        const diff = target - Date.now();
        if (diff <= 0) {
          countdownLabel.textContent = "It's happening now 💕";
          cdEls.days.textContent = cdEls.hours.textContent = cdEls.mins.textContent = cdEls.secs.textContent = '0';
          return;
        }
        countdownLabel.textContent = 'Counting down to our date';
        const s = Math.floor(diff / 1000);
        cdEls.days.textContent = Math.floor(s / 86400);
        cdEls.hours.textContent = Math.floor((s % 86400) / 3600);
        cdEls.mins.textContent = Math.floor((s % 3600) / 60);
        cdEls.secs.textContent = s % 60;
      }
      updateCountdown();
      setInterval(updateCountdown, 1000);
      inputDateTime.addEventListener('input', updateCountdown);

      // Blank the "Official Request" card (no confirmed plan yet)
      function blankOfficialCard() {
        officialCardActive = false;
        if (previewDate) previewDate.textContent = '—';
        if (previewLocation) previewLocation.textContent = '—';
        if (previewDress) previewDress.textContent = '—';
        if (previewActivity) previewActivity.textContent = '—';
        const fromEl = document.getElementById('preview-from');
        if (fromEl) fromEl.textContent = '—';
        if (countdownBox) countdownBox.classList.add('hidden');
        if (calendarBtn) calendarBtn.style.display = 'none';
      }
      updateOfficialCardBlankRef = blankOfficialCard;

      // Show a chosen invitation's answer inside the "Official Request" card.
      // Details show for any answered link; the calendar button only appears when accepted.
      updateOfficialCardRef = function (d) {
        if (!d) { blankOfficialCard(); return; }
        const accepted = d.status === 'accepted';
        officialCardActive = accepted;
        if (d.date && inputDateTime) inputDateTime.value = String(d.date).replace(' ', 'T').slice(0, 16);
        if (d.location && inputLocation) inputLocation.value = d.location;
        if (d.dressCode && inputDress) inputDress.value = d.dressCode;
        if (d.activity && inputActivity) inputActivity.value = d.activity;
        updatePreview();
        if (countdownBox) {
          if (accepted) { countdownBox.classList.remove('hidden'); updateCountdown(); }
          else { countdownBox.classList.add('hidden'); }
        }
        const fromEl = document.getElementById('preview-from');
        const who = d.acceptedBy || d.declinedBy || d.createdBy;
        if (fromEl && who) fromEl.textContent = String(who).split('@')[0];
        if (calendarBtn) calendarBtn.style.display = accepted ? '' : 'none';
      };



      if (generateBtn) generateBtn.addEventListener('click', async () => {
        if (!currentUser) { openLoginGate(); return; }
        try {
          const data = {
            date: inputDateTime.value,
            location: inputLocation.value.trim() || "Secret Spot",
            dressCode: inputDress.value,
            activity: inputActivity.value,
            songUrl: inputSong ? inputSong.value.trim() : '',
            status: "pending",
            createdAt: new Date().toISOString()
          };
          if (currentUser) data.createdBy = currentUser;
          const creatorName = (currentUserProfile && currentUserProfile.full_name) || currentUser || '';
          if (creatorName) data.creatorName = creatorName;
          const newId = await addInvitation(data);
          currentInviteId = newId;
          viewerIsOwner = true;
          const link = buildInviteLink(newId, data);
          // The creator stays on their own (host) URL — never rewrite it into a receiver link.
          try { history.replaceState({}, '', location.pathname); } catch (e) {}
          document.getElementById('mock-link').textContent = link;
          lastKnownStatus = null;
          checkRSVP();
          loadSenderHistory();
          const shareBtn = document.getElementById('shareLinkBtn');
          if (shareBtn) shareBtn.hidden = !(navigator.share && navigator.canShare);
          if (modalOverlay) modalOverlay.style.display = 'flex';
        } catch (err) { console.error(err); }
      });
      if (closeModal) closeModal.addEventListener('click', () => { if (modalOverlay) modalOverlay.style.display = 'none'; });
      registerModal(modalOverlay, () => { modalOverlay.style.display = 'none'; });
      if (copyLinkBtn) copyLinkBtn.addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('mock-link')?.textContent || '').then(() => alert('✨ Invitation link copied!')); });
      const shareLinkBtn = document.getElementById('shareLinkBtn');
      if (shareLinkBtn) shareLinkBtn.addEventListener('click', () => {
        const link = document.getElementById('mock-link')?.textContent || '';
        navigator.share({ title: 'You are invited 💕', text: 'Open your invitation...', url: link })
          .catch(() => {});
      });
      if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

      // ========== REAL MUSIC PLAYER ==========
      const audio = document.getElementById('songAudio');
      inputSong = document.getElementById('input-song');
      const songTitleEl = document.getElementById('song-title');
      const songTrack = document.getElementById('song-track');
      const songCur = document.getElementById('song-cur');
      const songDur = document.getElementById('song-dur');
      const progressBar = document.getElementById('progress-bar');

      function fmtTime(t) {
        if (!isFinite(t) || t < 0) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      }

      function loadSong(url) {
        if (!audio) return;
        if (!url) {
          audio.removeAttribute('src');
          if (songTitleEl) songTitleEl.textContent = 'Add a song to this date';
          return;
        }
        audio.src = url;
        if (songTitleEl) {
          const name = decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/\.(mp3|m4a|wav|ogg|aac)$/i, '');
          songTitleEl.textContent = name || 'Our Song';
        }
      }

      if (inputSong) inputSong.addEventListener('input', () => loadSong(inputSong.value.trim()));

      if (playPauseBtn && playIcon) {
        playPauseBtn.addEventListener('click', async () => {
          if (!audio.src) {
            if (inputSong) { inputSong.focus(); inputSong.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            return;
          }
          if (audio.paused) {
            try { await audio.play(); } catch { if (songTitleEl) songTitleEl.textContent = "Couldn't play that link 😢"; }
          } else {
            audio.pause();
          }
        });
      }
      if (audio) {
        audio.addEventListener('play', () => { playIcon.textContent = 'pause'; });
        audio.addEventListener('pause', () => { playIcon.textContent = 'play_arrow'; });
        audio.addEventListener('loadedmetadata', () => { songDur.textContent = fmtTime(audio.duration); });
        audio.addEventListener('timeupdate', () => {
          const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          if (progressBar) progressBar.style.width = p + '%';
          if (songCur) songCur.textContent = fmtTime(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
          playIcon.textContent = 'play_arrow';
          if (progressBar) progressBar.style.width = '0%';
          audio.currentTime = 0;
        });
      }
      if (songTrack && audio) {
        songTrack.addEventListener('click', (e) => {
          if (!audio.duration) return;
          const r = songTrack.getBoundingClientRect();
          audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration;
        });
      }

      function createHeart(x, y) {
        const heart = document.createElement('div');
        heart.classList.add('confetti');
        heart.innerHTML = '❤️';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        heart.style.fontSize = Math.random() * 20 + 14 + 'px';
        document.body.appendChild(heart);
        let vx = (Math.random() - 0.5) * 8;
        let vy = (Math.random() - 1) * 12;
        let px = x, py = y, g = 0.5, op = 1;
        function anim() {
          px += vx; py += vy + g; g += 0.1; op -= 0.015;
          heart.style.left = px + 'px'; heart.style.top = py + 'px'; heart.style.opacity = op;
          if (op > 0) requestAnimationFrame(anim); else heart.remove();
        }
        requestAnimationFrame(anim);
      }

      const acceptNameModal = document.getElementById('acceptNameModal');
      const acceptNameInput = document.getElementById('acceptNameInput');
      const acceptMessageInput = document.getElementById('acceptMessageInput');
      const acceptNameError = document.getElementById('acceptNameError');
      const confirmAcceptBtn = document.getElementById('confirmAcceptBtn');
      const acceptNameClose = document.getElementById('acceptNameClose');

      function hideAcceptNameModal() { acceptNameModal.classList.add('hidden'); acceptNameModal.classList.remove('flex'); acceptNameInput.value = ''; if (acceptMessageInput) acceptMessageInput.value = ''; acceptNameError.classList.add('hidden'); }
      registerModal(acceptNameModal, hideAcceptNameModal);

      acceptNameClose.addEventListener('click', hideAcceptNameModal);
      acceptNameModal.addEventListener('click', (e) => { if (e.target === acceptNameModal) hideAcceptNameModal(); });

      let respondMode = 'accept';
      const acceptModalTitle = document.getElementById('acceptModalTitle');
      const acceptModalDesc = document.getElementById('acceptModalDesc');
      const planFields = document.getElementById('planFields');
      const planPickup = document.getElementById('planPickup');
      const planDatetime = document.getElementById('planDatetime');
      const planPlace = document.getElementById('planPlace');
      const planDress = document.getElementById('planDress');
      const planActivity = document.getElementById('planActivity');

      function openResponseModal(mode) {
        respondMode = mode;
        if (planDatetime && !planDatetime.value) {
          const n = new Date(); n.setHours(19, 0, 0, 0);
          planDatetime.value = n.toISOString().slice(0, 16);
        }
        if (acceptModalTitle) acceptModalTitle.textContent = mode === 'accept' ? "Let's plan our date" : "You're Declining";
        if (acceptModalDesc) acceptModalDesc.textContent = mode === 'accept'
          ? "Tell me your name and how you'd like our date to be."
          : 'Enter your name so the host knows — honesty is a gift too';
        if (planFields) planFields.style.display = mode === 'accept' ? '' : 'none';
        const emoji = acceptNameModal.querySelector('.text-4xl');
        if (emoji) emoji.textContent = mode === 'accept' ? '💕' : '🍃';
        if (confirmAcceptBtn) confirmAcceptBtn.textContent = mode === 'accept' ? 'Send my answer 💌' : 'Yes, Decline';
        acceptNameModal.classList.remove('hidden');
        acceptNameModal.classList.add('flex');
        acceptNameInput.focus();
      }
      openResponseModalRef = openResponseModal;

      if (pendingPlanModal && currentInviteId) {
        pendingPlanModal = false;
        (async () => {
          let existing = null;
          try { existing = await getInvitation(currentInviteId); } catch {}
          const answered = existing && (existing.status === 'accepted' || existing.status === 'declined');
          if (answered) {
            await loadInvitationData(currentInviteId);
            showToast('💕 You already answered — here is your answer');
            return;
          }
          setTimeout(() => openResponseModal('accept'), 500);
        })();
      }

      async function submitResponse(mode, name, message, plan = {}) {
        const now = new Date().toISOString();
        const patch = mode === 'accept'
          ? { status: 'accepted', acceptedBy: name, message: message || '', respondedAt: now,
              pickupLocation: plan.pickupLocation || '', date: plan.date || '',
              location: plan.location || '', dressCode: plan.dressCode || '', activity: plan.activity || '' }
          : { status: 'declined', declinedBy: name, message: message || '', respondedAt: now };

        if (currentInviteId) {
          try {
            await updateInvitation(currentInviteId, patch);
          } catch (err) {
            console.error(err);
            try { localStorage.setItem(`amour_rsvp_${currentInviteId}`, JSON.stringify({ ...patch, at: now })); } catch {}
          }
        }

        if (mode === 'accept') {
          const rect = acceptBtn.getBoundingClientRect();
          for (let i = 0; i < 35; i++) setTimeout(() => createHeart(rect.left + rect.width / 2, rect.top + rect.height / 2), i * 20);
          acceptBtn.textContent = "See You There! 💖";
          acceptBtn.classList.remove('bg-white', 'text-primary');
          acceptBtn.classList.add('bg-secondary-container', 'text-on-secondary-container');
        } else {
          declineBtn.textContent = "Maybe next time 🍃";
        }
        acceptBtn.disabled = true;
        declineBtn.disabled = true;
        acceptBtn.classList.add('opacity-70', 'cursor-not-allowed');
        declineBtn.classList.add('opacity-70', 'cursor-not-allowed');
      }

      confirmAcceptBtn.addEventListener('click', () => {
        const name = acceptNameInput.value.trim();
        if (!name) { acceptNameError.classList.remove('hidden'); return; }
        acceptNameError.classList.add('hidden');
        const message = acceptMessageInput ? acceptMessageInput.value.trim() : '';
        const plan = respondMode === 'accept' ? {
          pickupLocation: planPickup ? planPickup.value.trim() : '',
          date: planDatetime ? planDatetime.value : '',
          location: planPlace ? planPlace.value.trim() : '',
          dressCode: planDress ? planDress.value : '',
          activity: planActivity ? planActivity.value.trim() : '',
        } : {};
        hideAcceptNameModal();
        submitResponse(respondMode, name, message, plan);
        if (respondMode === 'accept' && currentInviteId) loadInvitationData(currentInviteId);
      });

      acceptNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmAcceptBtn.click(); });

      if (acceptBtn) acceptBtn.addEventListener('click', (e) => { e.preventDefault(); openResponseModal('accept'); });
      if (declineBtn) declineBtn.addEventListener('click', (e) => { e.preventDefault(); openResponseModal('decline'); });

      // ========== ADD TO CALENDAR (.ics) ==========
      const calendarBtn = document.getElementById('calendar-btn');

      function icsEscape(str) {
        return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
      }
      function icsDate(d) {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      }

      function downloadICS() {
        if (!inputDateTime.value) { alert('Please set a date & time first 💛'); return; }
        const start = new Date(inputDateTime.value);
        if (isNaN(start)) { alert('Please set a valid date & time 💛'); return; }
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const title = inputActivity.value.trim() || 'Date Night';
        const location = inputLocation.value.trim() || 'Secret Spot';
        const description = icsEscape(`Activity: ${title}\nDress code: ${inputDress.value}\n\nYou're invited via Amour 💕`);

        const lines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Amour//Date Planner//EN',
          'CALSCALE:GREGORIAN',
          'BEGIN:VEVENT',
          `UID:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@amour`,
          `DTSTAMP:${icsDate(new Date())}`,
          `DTSTART:${icsDate(start)}`,
          `DTEND:${icsDate(end)}`,
          `SUMMARY:${icsEscape('💕 ' + title)}`,
          `LOCATION:${icsEscape(location)}`,
          `DESCRIPTION:${description}`,
          'BEGIN:VALARM',
          'TRIGGER:-PT1H',
          'ACTION:DISPLAY',
          'DESCRIPTION:Getting ready for our date!',
          'END:VALARM',
          'END:VEVENT',
          'END:VCALENDAR'
        ];
        const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'our-date.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }

      if (calendarBtn) calendarBtn.addEventListener('click', downloadICS);

      // ========== SENDER VIEW: no accept/decline, calendar only when accepted ==========
      const creatorPanelEl = document.getElementById('creator-panel');
      const isSenderView = !creatorPanelEl || !creatorPanelEl.classList.contains('hidden');
      if (isSenderView) {
        const rsvpActions = document.getElementById('rsvp-actions');
        if (rsvpActions) rsvpActions.style.display = 'none';
        blankOfficialCard();
      }
    }

    // ========== GALLERY WITH LIGHTBOX ==========
    const galleryImages = [
      "#sunset #sea #sunsetbythesea #aegeansea  #закат….jpg", "774124931406624.jpg", "5488830793224187.jpg",
      "6262886978247687.jpg", "7881368095830997.jpg", "10133167903531125.jpg", "13933080093253646.jpg",
      "20618110786503345.jpg", "26317979067827494.jpg", "30117891252944204.jpg", "59461657573070796.jpg",
      "96334879501388241.jpg", "110760472081083210.jpg", "140033869658741338.jpg", "172473860724782734.jpg",
      "211458145000130723.jpg", "248190629462222965.jpg", "292100725854868704.jpg", "301107925079947004.jpg",
      "403142604170315654.jpg", "434597432815604233 (1).jpg", "434597432815604233.jpg", "525584219034708490.jpg",
      "577868195980577409.jpg", "645562927882615761.jpg", "715087247118907984.jpg", "818810776042479679.jpg",
      "1146095805185048707.jpg", "beach sunset view.jpg", "Guide Lunaire 2026 - Par Michèle Jalbert ✨….jpg",
      "I just got result 'Moon!' on quiz 'What kind of….jpg", "Leo Full Moon today __Keywords ___Taking chances….jpg",
      "Pin by Zack Brite on Paisagem in 2022 _ Sunset….jpg", "Pin on Wanderlust.jpg", "Red-Sea-Sunset-iPhone-6-wallpaper.jpg",
      "This is made with AI🩷.jpg", "Where the sun melts into the sea, time slows down….jpg"
    ];

    const romanticMessages = [
      "Every sunset is a promise of a new dawn with you.",
      "You make my world brighter.",
      "Lost in your eyes, found in your heart.",
      "A moment like this is forever.",
      "Love is the closest thing we have to magic.",
      "You are my sunshine after the rain.",
      "Together is my favorite place to be.",
      "Every love story is beautiful, but ours is my favorite.",
      "You stole my heart, but I'll let you keep it.",
      "Romance is the music of the soul.",
      "With you, every moment is a fairytale.",
      "Your love is the poetry my heart always wanted to write."
    ];

    function getRandomMessage() {
      return romanticMessages[Math.floor(Math.random() * romanticMessages.length)];
    }

    function createLightbox() {
      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox-overlay';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <img src="" alt="Romantic view">
          <div class="lightbox-caption"></div>
          <div class="close-lightbox">✕</div>
          <div class="lightbox-love-message">❤️ Falling in love... ❤️</div>
        </div>
      `;
      document.body.appendChild(lightbox);
      return lightbox;
    }

    const lightbox = createLightbox();
    const lightboxImg = lightbox.querySelector('img');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');
    const closeLightbox = lightbox.querySelector('.close-lightbox');

    function createFloatingHearts(x, y, count = 12) {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const heart = document.createElement('div');
          heart.innerHTML = ['❤️', '💖', '💗', '💓', '💕'][Math.floor(Math.random() * 5)];
          heart.style.position = 'fixed';
          heart.style.left = x + (Math.random() - 0.5) * 60 + 'px';
          heart.style.top = y + (Math.random() - 0.5) * 40 + 'px';
          heart.style.fontSize = Math.random() * 24 + 16 + 'px';
          heart.style.pointerEvents = 'none';
          heart.style.zIndex = '2001';
          heart.style.opacity = '1';
          document.body.appendChild(heart);
          let posY = 0;
          let velY = -5 - Math.random() * 8;
          let opacity = 1;
          function floatUp() {
            posY += velY;
            velY += 0.2;
            opacity -= 0.02;
            heart.style.transform = `translateY(${posY}px) rotate(${posY * 2}deg)`;
            heart.style.opacity = opacity;
            if (opacity > 0) requestAnimationFrame(floatUp);
            else heart.remove();
          }
          requestAnimationFrame(floatUp);
        }, i * 30);
      }
    }

    function buildGallery() {
      const grid = document.getElementById('galleryGrid');
      if (!grid) return;
      grid.innerHTML = '';
      galleryImages.forEach((name) => {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item rounded-xl overflow-hidden shadow-lg bg-white/50 border border-white/30';
        const img = document.createElement('img');
        img.className = 'w-full h-44 object-cover';
        img.src = `Gallery/${encodeURIComponent(name).replace(/%2F/g, '/')}`;
        img.alt = name;
        img.loading = 'lazy';
        figure.appendChild(img);
        figure.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = figure.getBoundingClientRect();
          createFloatingHearts(rect.left + rect.width/2, rect.top + rect.height/2, 15);
          lightboxImg.src = img.src;
          lightboxCaption.textContent = getRandomMessage();
          lightbox.classList.add('active');
        });
        grid.appendChild(figure);
      });
    }

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === closeLightbox) {
        lightbox.classList.remove('active');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        lightbox.classList.remove('active');
      }
    });

    buildGallery();

    // ========== SHARED ALBUM: "OUR MOMENTS" ==========
    const momentsSection = document.getElementById('moments');
    const albumGrid = document.getElementById('albumGrid');
    const albumMsg = document.getElementById('albumMsg');
    const photoInput = document.getElementById('photoInput');
    const MAX_PHOTOS = 8;

    function showAlbumMsg(text, isError = false) {
      if (!albumMsg) return;
      albumMsg.textContent = text;
      albumMsg.classList.remove('hidden');
      albumMsg.style.color = isError ? '#ba1a1a' : '';
      if (!isError) setTimeout(() => albumMsg.classList.add('hidden'), 4000);
    }

    function mapPhoto(p) {
      return { id: p.id, data: p.data, by: p.uploaded_by, at: p.created_at };
    }

    async function getAlbum() {
      try {
        return (await getPhotos(currentInviteId)).map(mapPhoto);
      } catch (e) {
        console.warn('Could not load the shared album.', e);
        return [];
      }
    }

    function compressImage(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          const max = 900;
          let w = img.width, h = img.height;
          if (w > max || h > max) {
            const r = Math.min(max / w, max / h);
            w = Math.round(w * r); h = Math.round(h * r);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(objUrl);
          resolve(canvas.toDataURL('image/jpeg', 0.55));
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('Could not read that image')); };
        img.src = objUrl;
      });
    }

    async function renderAlbum() {
      if (!albumGrid || !currentInviteId) return;
      const photos = await getAlbum();
      albumGrid.innerHTML = '';
      if (photos.length === 0) {
        albumGrid.innerHTML = `<p class="col-span-full text-on-surface-variant italic text-sm py-6 text-center">No moments yet — be the first to add one 📸</p>`;
        return;
      }
      photos.forEach((photo, idx) => {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item rounded-xl overflow-hidden shadow-lg bg-white/50 border border-white/30 relative';
        const img = document.createElement('img');
        img.className = 'w-full h-44 object-cover';
        img.src = photo.data;
        img.alt = `Photo by ${photo.by || 'someone'}`;
        img.loading = 'lazy';
        figure.appendChild(img);

        const caption = document.createElement('figcaption');
        caption.className = 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1';
        caption.textContent = `${photo.by || 'Anonymous'} · ${new Date(photo.at).toLocaleDateString()}`;
        figure.appendChild(caption);

        const delBtn = document.createElement('button');
        delBtn.className = 'absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors';
        delBtn.setAttribute('aria-label', 'Delete photo');
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Delete this photo?')) return;
          try {
            await deletePhoto(photo.id);
          } catch (err) {
            showAlbumMsg(err.message || 'Could not delete that photo', true);
            return;
          }
          renderAlbum();
        });
        figure.appendChild(delBtn);

        figure.addEventListener('click', (e) => {
          if (e.target === delBtn) return;
          const rect = figure.getBoundingClientRect();
          createFloatingHearts(rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
          lightboxImg.src = photo.data;
          lightboxCaption.textContent = getRandomMessage();
          lightbox.classList.add('active');
        });
        albumGrid.appendChild(figure);
      });
    }

    if (currentInviteId && momentsSection) {
      momentsSection.classList.remove('hidden');
      renderAlbum();
    }

    if (photoInput) {
      photoInput.addEventListener('change', async () => {
        const files = Array.from(photoInput.files || []);
        if (!files.length || !currentInviteId) return;
        photoInput.value = '';
        const existing = await getAlbum();
        const room = MAX_PHOTOS - existing.length;
        if (room <= 0) { showAlbumMsg(`Album is full (${MAX_PHOTOS} photos). Delete one to add another.`, true); return; }
        const toAdd = files.slice(0, room);
        if (files.length > room) showAlbumMsg(`Album holds ${MAX_PHOTOS} photos — only the first ${toAdd.length} were added.`, true);
        showAlbumMsg('Adding photo(s)...');
        let added = 0;
        for (const file of toAdd) {
          try {
            const data = await compressImage(file);
            await addPhoto(currentInviteId, data, currentUser || 'Anonymous');
            added++;
          } catch (err) {
            showAlbumMsg(err.message || 'Could not add that photo', true);
          }
        }
        await renderAlbum();
        if (added > 0) showAlbumMsg('Photo added — it\'s live for both of you ✨');
      });
    }

    setInterval(() => {
      if (currentInviteId && momentsSection && !momentsSection.classList.contains('hidden')) renderAlbum();
    }, 10000);

    // ========== SENDER: LIVE RSVP STATUS ==========
    const rsvpStatusBox = document.getElementById('rsvp-status');
    const rsvpStatusText = document.getElementById('rsvp-status-text');
    const rsvpStatusDetail = document.getElementById('rsvp-status-detail');
    const rsvpPlanEl = document.getElementById('rsvp-plan');
    let lastKnownStatus = null;

    function showToast(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#3a6660;color:#fff;padding:12px 22px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.25);z-index:3000;opacity:0;transition:opacity .3s;pointer-events:none;max-width:90vw;text-align:center;';
      document.body.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
      }, 4500);
    }

    async function checkRSVP() {
      if (!rsvpStatusBox) return;
      const creatorPanel = document.getElementById('creator-panel');
      const senderView = currentInviteId && creatorPanel && !creatorPanel.classList.contains('hidden');
      if (!senderView) { rsvpStatusBox.classList.add('hidden'); return; }
      rsvpStatusBox.classList.remove('hidden');

      let d = null;
      try {
        d = await getInvitation(currentInviteId);
      } catch {
        rsvpStatusText.textContent = '⚠️ Status unavailable offline';
        rsvpStatusDetail.textContent = 'Reconnect and this will refresh automatically.';
        return;
      }
      if (!d) return;

      const status = d.status || 'pending';
      const when = d.respondedAt ? new Date(d.respondedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

      if (status === 'accepted') {
        rsvpStatusText.textContent = '💕 She accepted!';
        rsvpStatusDetail.textContent = `${d.acceptedBy ? d.acceptedBy + ' said yes' : 'She said yes'}${when ? ' · ' + when : ''}${d.message ? ` — "${d.message}"` : ''}`;
        if (rsvpPlanEl) {
          const dt = d.date ? new Date(String(d.date).replace(' ', 'T')) : null;
          const whenStr = dt && !isNaN(dt) ? dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const rows = [
            ['📅 When', whenStr],
            ['🚗 Pick up', d.pickupLocation || '—'],
            ['📍 Where', d.location || '—'],
            ['👗 Wear', d.dressCode || '—'],
            ['🎭 Activity', d.activity || '—'],
          ];
          rsvpPlanEl.innerHTML = rows.map(([k, v]) => `<div><span class="text-primary font-semibold">${k}:</span> ${v}</div>`).join('');
          rsvpPlanEl.classList.remove('hidden');
        }
      } else if (status === 'declined') {
        rsvpStatusText.textContent = '🍃 She declined';
        rsvpStatusDetail.textContent = `${d.declinedBy ? d.declinedBy + ' responded' : 'A response arrived'}${when ? ' · ' + when : ''}${d.message ? ` — "${d.message}"` : ''}`;
        if (rsvpPlanEl) rsvpPlanEl.classList.add('hidden');
      } else {
        rsvpStatusText.textContent = '⏳ Waiting for her answer…';
        rsvpStatusDetail.textContent = 'Share the link — her reply will appear here instantly.';
        if (rsvpPlanEl) rsvpPlanEl.classList.add('hidden');
      }

      // Sync the "Official Request" card: show the answered link's details,
      // but only show the calendar button when she accepted.
      if (status === 'accepted' || status === 'declined') {
        if (updateOfficialCardRef) updateOfficialCardRef(d);
      } else if (updateOfficialCardBlankRef) {
        updateOfficialCardBlankRef();
      }

      if (lastKnownStatus !== null && lastKnownStatus !== 'accepted' && status === 'accepted' && rsvpStatusBox.offsetParent !== null) {
        const rect = rsvpStatusBox.getBoundingClientRect();
        createFloatingHearts(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
        showToast('💕 She accepted your invitation!');
      } else if (lastKnownStatus !== null && lastKnownStatus === 'pending' && status === 'declined') {
        showToast('An answer arrived — see RSVP Status.');
      }
      lastKnownStatus = status;
    }
    setInterval(checkRSVP, 8000);
    checkRSVP();

    // ========== SENDER: INVITATION HISTORY ==========
    const sentHistory = document.getElementById('sent-history');
    const sentHistoryBody = document.getElementById('sent-history-body');
    const invEmpty = document.getElementById('inv-empty');
    const histAccepted = document.getElementById('hist-accepted');
    const histDeclined = document.getElementById('hist-declined');
    const histPending = document.getElementById('hist-pending');
    const historyToggle = document.getElementById('history-toggle');

    if (historyToggle && sentHistory) {
      historyToggle.addEventListener('click', () => sentHistory.classList.toggle('hidden'));
    }

    let historyAutoSelected = false;

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function loadSenderHistory() {
      if (!sentHistoryBody) return;
      const creatorPanel = document.getElementById('creator-panel');
      if (!creatorPanel || creatorPanel.classList.contains('hidden')) return;

      let list = [];
      try { list = await getAllInvitations(); } catch { return; }

      let acc = 0, dec = 0, pend = 0;
      list.forEach((i) => {
        const s = i.status || 'pending';
        if (s === 'accepted') acc++; else if (s === 'declined') dec++; else pend++;
      });
      if (histAccepted) histAccepted.textContent = acc;
      if (histDeclined) histDeclined.textContent = dec;
      if (histPending) histPending.textContent = pend;

      if (!list.length) {
        sentHistoryBody.innerHTML = '';
        if (invEmpty) invEmpty.classList.remove('hidden');
        return;
      }
      if (invEmpty) invEmpty.classList.add('hidden');

      sentHistoryBody.innerHTML = list.map((i) => {
        const s = i.status || 'pending';
        const badge = s === 'accepted'
          ? '<span class="text-green-600 font-semibold">💕 Accepted</span>'
          : s === 'declined'
            ? '<span class="text-yellow-600 font-semibold">🍃 Declined</span>'
            : '<span class="text-primary font-semibold">⏳ Pending</span>';
        const dt = i.date ? new Date(String(i.date).replace(' ', 'T')) : null;
        const when = dt && !isNaN(dt)
          ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—';
        const name = i.acceptedBy || i.declinedBy || '—';
        const link = buildInviteLink(i.id, {
          date: i.date, location: i.location, dressCode: i.dressCode,
          activity: i.activity, songUrl: i.songUrl, status: i.status,
          createdBy: i.createdBy, creatorName: i.creatorName, createdAt: i.createdAt,
        });
        return `<tr class="border-b border-outline-variant/30 cursor-pointer hover:bg-white/40" data-id="${escapeHtml(i.id)}">
          <td class="py-2 pr-3 whitespace-nowrap">${badge}</td>
          <td class="py-2 pr-3">${escapeHtml(name)}</td>
          <td class="py-2 pr-3 whitespace-nowrap">${escapeHtml(when)}</td>
          <td class="py-2 pr-3">${escapeHtml(i.pickupLocation || '—')}</td>
          <td class="py-2 pr-3">${escapeHtml(i.location || '—')}</td>
          <td class="py-2 pr-3">${escapeHtml(i.dressCode || '—')}</td>
          <td class="py-2 pr-3 text-right">
            <button class="copy-invite text-primary hover:opacity-70 active:scale-95 transition-all" data-link="${escapeHtml(link)}" title="Copy this invitation link" aria-label="Copy invitation link">
              <span class="material-symbols-outlined text-lg align-middle">content_copy</span>
            </button>
          </td>
          <td class="py-2 pr-3 text-right">
            <button class="delete-invite text-error/70 hover:text-error transition-colors" data-id="${escapeHtml(i.id)}" title="Delete this link" aria-label="Delete link">
              <span class="material-symbols-outlined text-lg align-middle">delete</span>
            </button>
          </td>
        </tr>`;
      }).join('');

      if (!historyAutoSelected && !currentInviteId && list[0]) {
        historyAutoSelected = true;
        selectInvitation(list[0].id);
      }
    }

    if (sentHistoryBody) {
      sentHistoryBody.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.copy-invite');
        if (copyBtn) {
          const link = copyBtn.getAttribute('data-link') || '';
          try { await navigator.clipboard.writeText(link); showToast('✨ Invitation link copied!'); }
          catch { window.prompt('Copy your invitation link:', link); }
          return;
        }
        const btn = e.target.closest('.delete-invite');
        if (!btn) {
          const row = e.target.closest('tr[data-id]');
          if (row) selectInvitation(row.getAttribute('data-id'));
          return;
        }
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('Delete this invitation link? Her answer and views will be removed.')) return;
        btn.disabled = true;
        try {
          await deleteInvitation(id);
          if (currentInviteId === id) {
            currentInviteId = null;
            lastKnownStatus = null;
            history.replaceState({}, '', location.pathname);
            if (rsvpStatusBox) rsvpStatusBox.classList.add('hidden');
            const viewsBox = document.getElementById('views-status');
            if (viewsBox) viewsBox.classList.add('hidden');
          }
          showToast('🗑️ Link deleted');
          loadSenderHistory();
        } catch (err) {
          btn.disabled = false;
          showToast('❌ ' + (err.message || 'Could not delete link'));
        }
      });
    }

    setInterval(loadSenderHistory, 8000);
    loadSenderHistory();

    // ========== SENDER: ALL ANSWERS (newest first) ==========
    const rsvpResponses = document.getElementById('rsvp-responses');
    const rsvpResponsesBody = document.getElementById('rsvp-responses-body');

    async function selectInvitation(id) {
      if (!id) return;
      currentInviteId = id;
      lastKnownStatus = null;
      let d = null;
      try { d = await getInvitation(id); } catch {}
      if (d && updateOfficialCardRef) updateOfficialCardRef(d);
      await checkRSVP();
      if (typeof updateViews === 'function') updateViews();
      loadResponsesTable();
      if (momentsSection) {
        momentsSection.classList.remove('hidden');
        renderAlbum();
      }
    }

    let responsesAutoSelected = false;
    async function loadResponsesTable() {
      if (!rsvpResponses || !rsvpResponsesBody) return;
      const creatorPanel = document.getElementById('creator-panel');
      if (!creatorPanel || creatorPanel.classList.contains('hidden')) { rsvpResponses.classList.add('hidden'); return; }

      let list = [];
      try { list = await getAllInvitations(); } catch { return; }

      const answered = list
        .filter((i) => i.status === 'accepted' || i.status === 'declined')
        .sort((a, b) => new Date(String(b.respondedAt || b.createdAt || 0).replace(' ', 'T')) - new Date(String(a.respondedAt || a.createdAt || 0).replace(' ', 'T')));

      if (!answered.length) {
        rsvpResponsesBody.innerHTML = '';
        rsvpResponses.classList.add('hidden');
        return;
      }

      rsvpResponsesBody.innerHTML = answered.map((i) => {
        const s = i.status;
        const badge = s === 'accepted'
          ? '<span class="text-green-600 font-semibold">💕 Accepted</span>'
          : '<span class="text-yellow-600 font-semibold">🍃 Rejected</span>';
        const dt = i.date ? new Date(String(i.date).replace(' ', 'T')) : null;
        const when = dt && !isNaN(dt)
          ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—';
        const active = currentInviteId === i.id ? 'bg-primary/10' : '';
        return `<tr class="cursor-pointer hover:bg-primary/5 ${active}" data-id="${escapeHtml(i.id)}" title="Show in Official Request box">
          <td class="py-1 pr-2 whitespace-nowrap">${badge}</td>
          <td class="py-1 pr-2">${escapeHtml(i.acceptedBy || i.declinedBy || '—')}</td>
          <td class="py-1 pr-2 whitespace-nowrap">${escapeHtml(when)}</td>
          <td class="py-1 pr-2">${escapeHtml(i.location || '—')}</td>
        </tr>`;
      }).join('');
      rsvpResponses.classList.remove('hidden');

      // Show the newest answer in the Official Request box on first load
      if (!responsesAutoSelected && !currentInviteId && answered[0] && updateOfficialCardRef) {
        responsesAutoSelected = true;
        updateOfficialCardRef(answered[0]);
      }
    }

    if (rsvpResponsesBody) {
      rsvpResponsesBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        selectInvitation(row.getAttribute('data-id'));
      });
    }

    setInterval(loadResponsesTable, 8000);
    loadResponsesTable();

    // ========== SENDER: WHO VIEWED THE LINK ==========
    const viewsBox = document.getElementById('views-status');
    const viewsTotalEl = document.getElementById('views-total');
    const viewsUniqueEl = document.getElementById('views-unique');
    const viewsListEl = document.getElementById('views-list');
    let lastViewCount = null;

    async function updateViews() {
      if (!viewsBox) return;
      const creatorPanel = document.getElementById('creator-panel');
      const senderView = currentInviteId && creatorPanel && !creatorPanel.classList.contains('hidden');
      if (!senderView) { viewsBox.classList.add('hidden'); return; }
      viewsBox.classList.remove('hidden');
      try {
        const res = await getViews(currentInviteId);
        viewsTotalEl.textContent = res.total;
        viewsUniqueEl.textContent = res.unique;
        viewsListEl.innerHTML = '';
        if (!res.views.length) {
          viewsListEl.innerHTML = '<li class="text-on-surface-variant italic text-xs">No views yet — share your link 💌</li>';
        } else {
          res.views.slice(0, 30).forEach(v => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between gap-2 border-b border-outline-variant/30 pb-1';
            const when = v.viewed_at ? new Date(v.viewed_at.replace(' ', 'T')).toLocaleString() : '';
            li.innerHTML = `<span>👤 <strong>#${(v.viewer || v.ip).slice(0, 6)}</strong> · ${v.device || ''} ${v.browser || ''}</span><span class="text-on-surface-variant text-xs">${when}</span>`;
            viewsListEl.appendChild(li);
          });
        }
        if (lastViewCount !== null && res.total > lastViewCount) {
          showToast('👀 Someone just opened your invitation!');
        }
        lastViewCount = res.total;
      } catch (e) { /* ignore */ }
    }
    setInterval(updateViews, 8000);
    updateViews();

    const createInviteTop = document.getElementById('createInviteTop');
    if (createInviteTop) {
      createInviteTop.addEventListener('click', () => {
        document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Creator (no invitation link): opening the envelope skips the question (see heartToOpen
    // handler) and goes straight to loading → create-link page.
    // Only the receiver (opened a ?i= link) sees the "may I take you out" question.

    if (mainApp && !mainApp.classList.contains('hidden-app')) {
      initDatePlanner();
    }
  });
