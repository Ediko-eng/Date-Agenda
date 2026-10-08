import { addInvitation, getInvitation, updateInvitation, verifyUser, encodeInvite, decodeInvite, buildInviteLink } from './simple-db.js';

document.addEventListener('DOMContentLoaded', () => {
  let currentInviteId = new URLSearchParams(location.search).get('i');

  // Invitation data embedded in the URL (#d=...) — works with zero backend
  const hashMatch = location.hash.match(/[#&]d=([^&]+)/);
  const sharedInvite = hashMatch ? decodeInvite(hashMatch[1]) : null;

  if (currentInviteId) {
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
    if (questionEl) questionEl.innerHTML = 'Would you go on a date with me,<br>hang out with me,<br>spend time with me?';
    if (footnoteEl) footnoteEl.innerHTML = '🌸 (the No button has a mind of its own...)';

    // Recipient view: read-only, no editing allowed
    const creatorPanel = document.getElementById('creator-panel');
    const recipientPanel = document.getElementById('recipient-panel');
    if (creatorPanel) creatorPanel.classList.add('hidden');
    if (recipientPanel) recipientPanel.classList.remove('hidden');
  }

  let currentUser = sessionStorage.getItem('currentUser') || null;

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
  const loginModalClose = document.getElementById('loginModalClose');
  const userStatus = document.getElementById('userStatus');

  function updateLoginUI() {
    if (currentUser) {
      userStatus.textContent = currentUser;
      userStatus.classList.remove('hidden');
      loginToggleBtn.textContent = 'Logout';
    } else {
      userStatus.classList.add('hidden');
      loginToggleBtn.textContent = 'Login';
    }
  }
  updateLoginUI();

  function showLoginModal() { loginModal.classList.remove('hidden'); loginModal.classList.add('flex'); loginEmailInput.focus(); }
  function hideLoginModal() { loginModal.classList.add('hidden'); loginModal.classList.remove('flex'); }
  registerModal(loginModal, hideLoginModal);

  loginToggleBtn.addEventListener('click', () => {
    if (currentUser) {
      currentUser = null;
      sessionStorage.removeItem('currentUser');
      updateLoginUI();
    } else {
      showLoginModal();
    }
  });

  loginModalBtn.addEventListener('click', async () => {
    loginModalError.classList.add('hidden');
    const email = loginEmailInput.value.trim();
    const pass = loginPassInput.value;
    if (!email || !pass) { loginModalError.textContent = 'Fill in all fields'; loginModalError.classList.remove('hidden'); return; }
    const user = await verifyUser(email, pass);
    if (user) {
      currentUser = email;
      sessionStorage.setItem('currentUser', email);
      updateLoginUI();
      hideLoginModal();
      loginEmailInput.value = '';
      loginPassInput.value = '';
    } else {
      loginModalError.textContent = 'Invalid email or password';
      loginModalError.classList.remove('hidden');
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

    if (heartOpenBtn) {
      heartOpenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openEnvelopeRomance();
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

    // Heart burst and reveal main app on Yes
    function burstHeartsAndReveal() {
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
      setTimeout(() => {
        if (envelopeOverlay) {
          envelopeOverlay.style.opacity = '0';
          setTimeout(() => {
            envelopeOverlay.style.display = 'none';
            if (mainApp) {
              mainApp.classList.remove('hidden-app');
              mainApp.style.display = 'block';
              initDatePlanner();
            }
          }, 400);
        }
      }, 200);
    }

    if (yesBtn) {
      yesBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (currentInviteId) {
          try {
            await updateInvitation(currentInviteId, {
              status: 'accepted',
              respondedAt: new Date().toISOString(),
              acceptedAt: new Date().toISOString()
            });
          } catch (err) { console.error(err); }
        }
        burstHeartsAndReveal();
      });
    }

    // ========== DATE PLANNER ==========
    function initDatePlanner() {
      const inputDateTime = document.getElementById('input-datetime');
      const inputLocation = document.getElementById('input-location');
      const inputDress = document.getElementById('input-dress');
      const inputActivity = document.getElementById('input-activity');
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
          const sender = d.createdBy ? String(d.createdBy).split('@')[0] : 'someone special';
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
          if (rdLoc) rdLoc.textContent = d.location || '—';
          if (rdDress) rdDress.textContent = d.dressCode || '—';
          if (rdAct) rdAct.textContent = d.activity || '—';

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

      function updateCountdown() {
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



      if (generateBtn) generateBtn.addEventListener('click', async () => {
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
          const newId = await addInvitation(data);
          currentInviteId = newId;
          const link = buildInviteLink(newId, data);
          history.replaceState({}, '', `?i=${newId}#d=${encodeInvite({ ...data, id: newId })}`);
          document.getElementById('mock-link').textContent = link;
          lastKnownStatus = null;
          checkRSVP();
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
      const inputSong = document.getElementById('input-song');
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

      function openResponseModal(mode) {
        respondMode = mode;
        if (acceptModalTitle) acceptModalTitle.textContent = mode === 'accept' ? "You're Accepting!" : "You're Declining";
        if (acceptModalDesc) acceptModalDesc.textContent = mode === 'accept'
          ? 'Enter your name so the host knows who accepted'
          : 'Enter your name so the host knows — honesty is a gift too';
        const emoji = acceptNameModal.querySelector('.text-4xl');
        if (emoji) emoji.textContent = mode === 'accept' ? '💕' : '🍃';
        if (confirmAcceptBtn) confirmAcceptBtn.textContent = mode === 'accept' ? 'Confirm' : 'Yes, Decline';
        acceptNameModal.classList.remove('hidden');
        acceptNameModal.classList.add('flex');
        acceptNameInput.focus();
      }

      async function submitResponse(mode, name, message) {
        const now = new Date().toISOString();
        const patch = mode === 'accept'
          ? { status: 'accepted', acceptedBy: name, message: message || '', respondedAt: now, acceptedAt: now }
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
        hideAcceptNameModal();
        submitResponse(respondMode, name, message);
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

    async function getAlbum() {
      try {
        const inv = await getInvitation(currentInviteId);
        if (inv && Array.isArray(inv.photos)) return inv.photos;
      } catch {}
      try {
        const raw = localStorage.getItem(`amour_album_${currentInviteId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }

    async function setAlbum(photos) {
      try { localStorage.setItem(`amour_album_${currentInviteId}`, JSON.stringify(photos)); } catch {}
      try {
        await updateInvitation(currentInviteId, { photos });
        return true;
      } catch (e) {
        console.warn('Album saved on this device only (database unreachable).', e);
        return false;
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
          const updated = (await getAlbum()).filter((_, i) => i !== idx);
          await setAlbum(updated);
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
        let photos = await getAlbum();
        const room = MAX_PHOTOS - photos.length;
        if (room <= 0) { showAlbumMsg(`Album is full (${MAX_PHOTOS} photos). Delete one to add another.`, true); return; }
        const toAdd = files.slice(0, room);
        if (files.length > room) showAlbumMsg(`Album holds ${MAX_PHOTOS} photos — only the first ${toAdd.length} were added.`, true);
        showAlbumMsg('Adding photo(s)...');
        try {
          for (const file of toAdd) {
            const data = await compressImage(file);
            photos.push({ data, by: currentUser || 'Anonymous', at: new Date().toISOString() });
          }
          const synced = await setAlbum(photos);
          await renderAlbum();
          showAlbumMsg(synced ? 'Photo added — it\'s live for both of you ✨' : 'Saved on this device (will sync when online)', !synced);
        } catch (err) {
          showAlbumMsg(err.message || 'Could not add that photo', true);
        }
      });
    }

    // ========== SENDER: LIVE RSVP STATUS ==========
    const rsvpStatusBox = document.getElementById('rsvp-status');
    const rsvpStatusText = document.getElementById('rsvp-status-text');
    const rsvpStatusDetail = document.getElementById('rsvp-status-detail');
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
      } else if (status === 'declined') {
        rsvpStatusText.textContent = '🍃 She declined';
        rsvpStatusDetail.textContent = `${d.declinedBy ? d.declinedBy + ' responded' : 'A response arrived'}${when ? ' · ' + when : ''}${d.message ? ` — "${d.message}"` : ''}`;
      } else {
        rsvpStatusText.textContent = '⏳ Waiting for her answer…';
        rsvpStatusDetail.textContent = 'Share the link — her reply will appear here instantly.';
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

    const createInviteTop = document.getElementById('createInviteTop');
    if (createInviteTop) {
      createInviteTop.addEventListener('click', () => {
        document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (mainApp && !mainApp.classList.contains('hidden-app')) {
      initDatePlanner();
    }
  });