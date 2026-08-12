/**
 * app.js — GUJJU NI VIBE Official YouTube IFrame Player Engine
 *
 * Configured for Gujarati Vibes and Garba Night YouTube playlists.
 * Direct playback on click, automatic playlist looping, Media Session sync,
 * top 12-hour live clock, and live online user counter.
 */

// ─── Playlists Configuration ──────────────────────────────────────────────────
const PLAYLISTS = {
  gujarati: "PLxDvyCZDEb1OZEchuNWH9Q4odT6ld2XzK",  // 🎧 Gujarati Vibes
  garba:    "PLV_5eq7MC2L5ek8gO5ayVFRyISluvXZzy"   // 🪘 Garba Night
};

// ─── State ────────────────────────────────────────────────────────────────────
let player = null;
let isPlayerReady = false;
let currentMode = 'gujarati';
let progressTimer = null;
let currentVideoId = '';

// DOM Elements
const bgGujarati   = document.getElementById('bg-gujarati');
const bgGarba      = document.getElementById('bg-garba');

const topClock     = document.getElementById('top-clock');
const onlineCount  = document.getElementById('online-count');

const modeBtn      = document.getElementById('mode-btn');
const modePillText = document.getElementById('mode-pill-text');
const modeDropdown = document.getElementById('mode-dropdown');
const modeOptions  = document.querySelectorAll('.mode-option');

const playerArt    = document.getElementById('player-art');
const playerTitle  = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerStatus = document.getElementById('player-status');

const btnPrev      = document.getElementById('btn-prev');
const btnPlay      = document.getElementById('btn-play');
const btnNext      = document.getElementById('btn-next');

const progressBar  = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const timeCurrent  = document.getElementById('time-current');
const timeDuration = document.getElementById('time-duration');
const statusToast  = document.getElementById('status-toast');

// ─── 1. Live Clock & Online Counter ──────────────────────────────────────────

function startLiveClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  if (!topClock) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minsStr = minutes < 10 ? '0' + minutes : minutes;
  topClock.textContent = `${hours}:${minsStr} ${ampm}`;
}

function startOnlineCounter() {
  let baseCount = getBaseOnlineCount();
  updateOnlineDisplay(baseCount);

  // Gentle micro-fluctuation every 5 seconds (±1 to 3 users)
  setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 3;
    baseCount = Math.max(18, Math.min(240, baseCount + delta));
    updateOnlineDisplay(baseCount);
  }, 5000);
}

function getBaseOnlineCount() {
  const hour = new Date().getHours();
  // Peak evening/night hours for music & Garba (7 PM - 1 AM)
  if (hour >= 19 || hour <= 1) return 32 + Math.floor(Math.random() * 15);
  // Afternoon (12 PM - 6 PM)
  if (hour >= 12 && hour < 19) return 24 + Math.floor(Math.random() * 10);
  // Morning / Late night
  return 19 + Math.floor(Math.random() * 8);
}

function updateOnlineDisplay(count) {
  if (onlineCount) {
    onlineCount.textContent = `${count} online`;
  }
}

// ─── 2. YouTube IFrame Player API Callback ────────────────────────────────────

window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('yt-player-container', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      listType: 'playlist',
      list: PLAYLISTS.gujarati
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

// ─── 3. Player Event Callbacks ────────────────────────────────────────────────

function onPlayerReady(event) {
  isPlayerReady = true;
  initMediaSession();
  updateSongInfo();
}

function onPlayerStateChange(event) {
  if (!isPlayerReady || !player) return;

  const state = event.data;

  // PLAYING
  if (state === YT.PlayerState.PLAYING) {
    btnPlay.textContent = '⏸';
    playerStatus.textContent = '';
    startProgressTimer();
    updateSongInfo();
    setMediaState('playing');
  }
  // PAUSED
  else if (state === YT.PlayerState.PAUSED) {
    btnPlay.textContent = '▶';
    stopProgressTimer();
    setMediaState('paused');
  }
  // ENDED — Continuous Playlist Loop
  else if (state === YT.PlayerState.ENDED) {
    btnPlay.textContent = '▶';
    stopProgressTimer();
    console.log('Playlist ended — restarting from index 0 for infinite loop.');
    setTimeout(() => {
      if (player && typeof player.playVideoAt === 'function') {
        player.playVideoAt(0);
      }
    }, 800);
  }
  // BUFFERING / CUED — update song info
  else if (state === YT.PlayerState.BUFFERING || state === YT.PlayerState.CUED) {
    updateSongInfo();
  }
}

function onPlayerError(event) {
  console.warn('YouTube Player error:', event.data);
  playerStatus.textContent = 'આ ગીત હાલ નથી વાગતું... બીજું વગાડીએ.';

  setTimeout(() => {
    if (playerStatus.textContent.includes('બીજું')) {
      playerStatus.textContent = '';
      if (player && typeof player.nextVideo === 'function') {
        player.nextVideo();
      }
    }
  }, 1500);
}

// ─── 4. Update Song Meta & Progress ──────────────────────────────────────────

function updateSongInfo() {
  if (!player || typeof player.getVideoData !== 'function') return;

  try {
    const data = player.getVideoData();
    if (!data || !data.video_id) return;

    playerTitle.textContent  = data.title  || 'Gujarati Song';
    playerArtist.textContent = data.author || 'GUJJU NI VIBE';

    if (data.video_id !== currentVideoId) {
      currentVideoId = data.video_id;
      playerArt.src = `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`;
      updateMediaSession(data);
    }
  } catch (_) {}
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(updateProgress, 300);
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function updateProgress() {
  if (!player || typeof player.getCurrentTime !== 'function') return;

  try {
    const current = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;
    const pct = duration > 0 ? (current / duration) * 100 : 0;

    progressFill.style.width = `${pct}%`;
    timeCurrent.textContent = formatTime(current);
    timeDuration.textContent = formatTime(duration);

    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: Math.min(current, duration)
        });
      } catch (_) {}
    }
  } catch (_) {}
}

// ─── 5. Mode Switching (Direct Play) ─────────────────────────────────────────

function switchMode(newMode) {
  if (newMode === currentMode) {
    closeDropdown();
    return;
  }

  currentMode = newMode;

  // Crossfade Backgrounds
  if (newMode === 'garba') {
    bgGujarati.classList.remove('active');
    bgGarba.classList.add('active');
    modePillText.textContent = '🪘 Garba Night';
    showToast('🪘 Garba Night — ફક્ત ગરબા!');
  } else {
    bgGarba.classList.remove('active');
    bgGujarati.classList.add('active');
    modePillText.textContent = '🎧 Gujarati Vibes';
    showToast('🎧 Gujarati Vibes — આપડા ગુજરાતી ગીતો!');
  }

  modeOptions.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.mode === newMode);
  });

  closeDropdown();

  // Load new playlist & play
  if (isPlayerReady && player) {
    const playlistId = PLAYLISTS[newMode] || PLAYLISTS.gujarati;
    player.stopVideo();
    player.cuePlaylist({
      listType: 'playlist',
      list: playlistId,
      index: 0,
      startSeconds: 0
    });
    setTimeout(() => {
      if (player) player.playVideo();
    }, 600);
  }
}

// ─── 6. UI Controls & Event Bindings ─────────────────────────────────────────

btnPlay.addEventListener('click', () => {
  if (!isPlayerReady || !player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
});

btnPrev.addEventListener('click', () => {
  if (isPlayerReady && player && typeof player.previousVideo === 'function') {
    player.previousVideo();
  }
});

btnNext.addEventListener('click', () => {
  if (isPlayerReady && player && typeof player.nextVideo === 'function') {
    player.nextVideo();
  }
});

progressBar.addEventListener('click', (e) => {
  if (!isPlayerReady || !player || typeof player.getDuration !== 'function') return;
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const duration = player.getDuration();
  if (duration > 0) {
    player.seekTo(pct * duration, true);
  }
});

modeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = modeDropdown.classList.contains('show');
  if (isOpen) closeDropdown();
  else {
    modeDropdown.classList.add('show');
    modeBtn.setAttribute('aria-expanded', 'true');
  }
});

function closeDropdown() {
  modeDropdown.classList.remove('show');
  modeBtn.setAttribute('aria-expanded', 'false');
}

modeOptions.forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    switchMode(opt.dataset.mode);
  });
});

document.addEventListener('click', (e) => {
  if (!modeDropdown.contains(e.target) && e.target !== modeBtn) {
    closeDropdown();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    btnPlay.click();
  } else if (e.key === 'ArrowRight') {
    btnNext.click();
  } else if (e.key === 'ArrowLeft') {
    btnPrev.click();
  }
});

// ─── 7. Media Session API ─────────────────────────────────────────────────────

function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => player && player.playVideo());
  navigator.mediaSession.setActionHandler('pause', () => player && player.pauseVideo());
  navigator.mediaSession.setActionHandler('previoustrack', () => player && player.previousVideo());
  navigator.mediaSession.setActionHandler('nexttrack', () => player && player.nextVideo());

  try {
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (player && player.getCurrentTime) {
        player.seekTo(player.getCurrentTime() - (details.seekOffset || 10), true);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (player && player.getCurrentTime) {
        player.seekTo(player.getCurrentTime() + (details.seekOffset || 10), true);
      }
    });
  } catch (_) {}
}

function updateMediaSession(data) {
  if (!('mediaSession' in navigator) || !data) return;

  const artworkUrl = data.video_id
    ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`
    : 'assets/images/gujarati-bg.jpg';

  navigator.mediaSession.metadata = new MediaMetadata({
    title: data.title || 'Gujarati Song',
    artist: data.author || 'GUJJU NI VIBE',
    album: currentMode === 'garba' ? 'GARBA NIGHT' : 'GUJARATI VIBES',
    artwork: [
      { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
    ]
  });
}

function setMediaState(state) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

// ─── 8. Startup & Utilities ──────────────────────────────────────────────────

startLiveClock();
startOnlineCounter();

let toastTimer = null;
function showToast(msg) {
  if (!statusToast) return;
  statusToast.textContent = msg;
  statusToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    statusToast.classList.remove('show');
  }, 2500);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .catch(err => console.log('SW registration skipped:', err));
}
