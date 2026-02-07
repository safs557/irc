// ADMIN VIDEO AND STUDENT MANAGEMENT - COMPLETE REGENERATED VERSION
// ✅ Fixed: Video filtering now works correctly
// ✅ Fixed: ID Card fetches school info properly
// ✅ Fixed: PDF export includes logo and school info
// ✅ Auto-initializes video upload UI
// ✅ Robust API shape handling

/* ===========================================================
   GLOBAL STATE & CONFIGURATION
   =========================================================== */
let adminVideosData = [];
let adminFilteredVideos = [];
let adminDisplayCount = 0;
const ADMIN_VIDEOS_PAGE_SIZE = 4;

let allStudentsGeneralData = [];

let adminFiltersApplied = false;

// School Info Module (UPDATED - more reliable)
const schoolInfo = (() => {
  let info = {
    name: "Ibadurrahman College",
    subName: "(Halqatu Ibadurrahman)",
    address: "No. 1968 A, Gwammaja Housing Estate, Audu Wawu Street, Dala L.G.A, Kano State, Nigeria.",
    phone: "08033459721, 09062171496",
    email: "info@ibadurrahman.edu.ng",
    logoSrc: "/assets/images/logo.jpeg"
  };

  return {
    get: () => ({ ...info }),
    update: (newInfo) => {
      info = { ...info, ...newInfo };
      console.log('[schoolInfo] updated:', info);
    },
    setLogoSrc: (src) => {
      info.logoSrc = src;
    }
  };
})();

let currentIDCardData = null;

let bootstrap = window.bootstrap;
let jspdf = window.jspdf;

/* ===========================================================
   UTILITY FUNCTIONS
   =========================================================== */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProp(obj, ...keys) {
  for (const k of keys) {
    if (obj == null) continue;
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function _scoped(selector) {
  const container = document.getElementById('video-management-view');
  return (container && container.querySelector(selector)) || document.querySelector(selector);
}

function _get(id) {
  return document.getElementById(id);
}

function _attachHandler(el, eventName, key, handler) {
  if (!el) return;
  el._adminHandlers = el._adminHandlers || {};
  const prev = el._adminHandlers[key];
  if (prev) el.removeEventListener(eventName, prev);
  el._adminHandlers[key] = handler;
  el.addEventListener(eventName, handler);
}

/* ===========================================================
   ADMIN VIDEO CLASSES & SESSIONS LOADING
   =========================================================== */
async function loadAdminVideoClasses() {
  try {
    const resp = await fetch('/api/admin-classes', { credentials: 'include' });
    const json = await resp.json().catch(() => null);
    if (!json || !json.success || !Array.isArray(json.data)) {
      console.warn('[admin-video] /api/admin-classes returned invalid data');
      return;
    }
    const list = json.data;

    const sel = _scoped('#adminVideoClassSelect');
    const filterSel = _scoped('#videoFilterClass');

    if (!sel) return;
    sel.innerHTML = '<option value="">Select Class</option>';
    if (filterSel) filterSel.innerHTML = '<option value="">All Classes</option>';

    list.forEach(cls => {
      const section_id = cls.section_id ?? cls.sectionId ?? 1;
      const class_id = cls.class_id ?? cls.classId ?? cls.value;
      const class_name = cls.class_name ?? cls.className ?? cls.name ?? 'Unnamed Class';
      const section_name = cls.section_name ?? (section_id === 1 ? 'Tahfiz' : 'Western');

      if (class_id == null) return;
      const val = `${section_id}:${class_id}`;
      const text = `${class_name} (${section_name})`;

      const option1 = document.createElement('option');
      option1.value = val;
      option1.textContent = text;
      sel.appendChild(option1);

      if (filterSel) {
        const option2 = document.createElement('option');
        option2.value = val;
        option2.textContent = text;
        filterSel.appendChild(option2);
      }
    });
  } catch (err) {
    console.error('[admin-video] load classes error', err);
  }
}

async function loadAdminVideoSessions() {
  try {
    const resp = await fetch('/api/sessions', { credentials: 'include' });
    const json = await resp.json().catch(() => null);
    if (!json || !json.success || !Array.isArray(json.data)) {
      console.warn('[admin-video] /api/sessions invalid');
      return;
    }
    const list = json.data;

    const sel = _scoped('#adminVideoSessionSelect');
    const filterSel = _scoped('#videoFilterSession');

    if (!sel) return;
    sel.innerHTML = '<option value="">Select Session</option>';
    if (filterSel) filterSel.innerHTML = '<option value="">All Sessions</option>';

    list.forEach(s => {
      const session = (typeof s === 'string') ? s : (s.session_year ?? s.sessionYear ?? s.session);
      if (!session) return;
      const opt1 = document.createElement('option');
      opt1.value = session;
      opt1.textContent = session;
      sel.appendChild(opt1);
      if (filterSel) {
        const opt2 = document.createElement('option');
        opt2.value = session;
        opt2.textContent = session;
        filterSel.appendChild(opt2);
      }
    });
  } catch (err) {
    console.error('[admin-video] load sessions error', err);
  }
}

/* ===========================================================
   ADMIN VIDEO UPLOAD HANDLERS
   =========================================================== */
async function adminDayChangeHandler() {
  const classVal = _get('adminVideoClassSelect')?.value || '';
  const session = _get('adminVideoSessionSelect')?.value || '';
  const term = _get('adminVideoTermSelect')?.value || '';
  const week = _get('adminVideoWeekSelect')?.value || '';
  const day = _get('adminVideoDaySelect')?.value || '';

  const ayatSectionEl = _get('adminVideoAyatRangeSection');
  const ayatDisplayEl = _get('adminVideoAyatRangeDisplay');
  const fromHidden = _get('adminFromAyah');
  const toHidden = _get('adminToAyah');

  if (!classVal || !session || !term || !week || !day) {
    if (ayatSectionEl) ayatSectionEl.style.display = 'none';
    return;
  }

  const parts = classVal.split(':').map(s => s.trim());
  const sectionId = parts[0] || '';
  const classId = parts[1] || '';

  if (!classId) {
    if (ayatSectionEl) ayatSectionEl.style.display = 'none';
    return;
  }

  try {
    const resp = await fetch(
      `/api/staff-memorization-schemes?class_id=${encodeURIComponent(classId)}&term=${encodeURIComponent(term)}&week=${encodeURIComponent(week)}&day=${encodeURIComponent(day)}&session=${encodeURIComponent(session)}`,
      { credentials: 'include' }
    );

    if (!resp.ok) {
      console.warn('[admin-video] schemes fetch failed', resp.status);
      if (ayatDisplayEl) ayatDisplayEl.textContent = 'Failed to load ayat range';
      if (ayatSectionEl) ayatSectionEl.style.display = 'block';
      if (fromHidden) fromHidden.value = '';
      if (toHidden) toHidden.value = '';
      return;
    }

    const data = await resp.json().catch(() => null);

    if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
      const s = data.data[0];
      const fromAyah = s.from_ayah ?? s.from_surah_ayah ?? s.fromAyah ?? s.from_ayah_number ?? '';
      const toAyah = s.to_ayah ?? s.to_surah_ayah ?? s.toAyah ?? s.to_ayah_number ?? '';

      if (ayatDisplayEl) ayatDisplayEl.textContent = `Week ${s.week} – ${s.day}: ${fromAyah} → ${toAyah}`;
      if (fromHidden) fromHidden.value = fromAyah;
      if (toHidden) toHidden.value = toAyah;
      if (ayatSectionEl) ayatSectionEl.style.display = 'block';
    } else {
      console.warn('[admin-video] No scheme returned');
      if (ayatDisplayEl) ayatDisplayEl.textContent = 'No ayat range found for this selection';
      if (fromHidden) fromHidden.value = '';
      if (toHidden) toHidden.value = '';
      if (ayatSectionEl) ayatSectionEl.style.display = 'block';
    }
  } catch (e) {
    console.error('[admin-video] Error loading ayat range:', e);
    if (ayatDisplayEl) ayatDisplayEl.textContent = 'Error loading ayat range';
    if (ayatSectionEl) ayatSectionEl.style.display = 'block';
    if (fromHidden) fromHidden.value = '';
    if (toHidden) toHidden.value = '';
  }
}

async function handleAdminVideoUpload(e) {
  e.preventDefault();

  const classValue = _get('adminVideoClassSelect')?.value || '';
  const session = _get('adminVideoSessionSelect')?.value || '';
  const term = _get('adminVideoTermSelect')?.value || '';
  const week = _get('adminVideoWeekSelect')?.value || '';
  const day = _get('adminVideoDaySelect')?.value || '';
  const fromAyah = _get('adminFromAyah')?.value || '';
  const toAyah = _get('adminToAyah')?.value || '';
  const videoFile = _get('adminVideoFile')?.files?.[0];

  if (!classValue || !session || !term || !week || !day || !fromAyah || !toAyah || !videoFile) {
    alert('Please fill all required fields before uploading.');
    return;
  }

  const [sectionId, classId] = classValue.split(':').map(s => s.trim());

  const fd = new FormData();
  fd.append('class_id', classId);
  fd.append('section_id', sectionId);
  fd.append('session', session);
  fd.append('term', term);
  fd.append('week', week);
  fd.append('day', day);
  fd.append('from_ayah', fromAyah);
  fd.append('to_ayah', toAyah);
  fd.append('video', videoFile);

  const btn = document.querySelector('#adminVideoUploadForm button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
  }

  try {
    const res = await fetch('/api/admin/upload-memorization-video', {
      method: 'POST',
      body: fd,
      credentials: 'include'
    });
    const json = await res.json().catch(() => ({ success: false, message: 'Invalid JSON' }));
    if (json.success) {
      alert('Video uploaded successfully');
      _get('adminVideoUploadForm')?.reset();
      const ayatSection = _get('adminVideoAyatRangeSection');
      if (ayatSection) ayatSection.style.display = 'none';
      if (typeof loadAdminVideoSessions === 'function') await loadAdminVideoSessions();
      if (typeof loadAdminVideoClasses === 'function') await loadAdminVideoClasses();
      if (typeof loadAdminVideos === 'function') await loadAdminVideos();
    } else {
      alert('Upload failed: ' + (json.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('[admin-video] upload error', err);
    alert('Error uploading video: ' + (err?.message || String(err)));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.orig || 'Upload Video';
    }
  }
}

function initializeAdminVideoUpload() {
  const form = _get('adminVideoUploadForm');
  if (!form) return;

  _attachHandler(form, 'submit', 'upload', handleAdminVideoUpload);

  const weekSelect = _get('adminVideoWeekSelect');
  const daySelect = _get('adminVideoDaySelect');
  const ayatSection = _get('adminVideoAyatRangeSection');

  const adminWeekChangeHandler = function (ev) {
    const val = ev?.target?.value ?? (this && this.value) ?? '';
    if (!daySelect || !ayatSection) return;
    if (val) {
      daySelect.style.display = 'block';
      daySelect.value = '';
      ayatSection.style.display = 'none';
    } else {
      daySelect.style.display = 'none';
      ayatSection.style.display = 'none';
    }
  };

  _attachHandler(weekSelect, 'change', 'week', adminWeekChangeHandler);
  _attachHandler(daySelect, 'change', 'day', adminDayChangeHandler);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdminVideoUpload);
} else {
  initializeAdminVideoUpload();
}

/* ===========================================================
   ADMIN VIDEO LOADING & FILTERING - COMPLETELY FIXED
   =========================================================== */
async function loadAdminVideos() {
  try {
    const resp = await fetch('/api/memorization-videos', { credentials: 'include' });
    const json = await resp.json().catch(() => null);

    if (!json || !json.success || !Array.isArray(json.data)) {
      console.warn('[admin-video] Invalid response from /api/memorization-videos');
      adminVideosData = [];
    } else {
      adminVideosData = json.data;
      console.log('[admin-video] Loaded', adminVideosData.length, 'videos');

      // Normalize properties for filtering
      adminVideosData = adminVideosData.map(v => ({
        ...v,
        session: v.session ?? v.session_year ?? v.sessionYear ?? "",
        term: String(v.term ?? ""),
        week: String(v.week ?? ""),
        section_id: String(v.section_id ?? v.sectionId ?? v.section ?? ""),
        class_id: String(v.class_id ?? v.classId ?? v.class ?? ""),
        class_name: v.class_name ?? v.className ?? v.class ?? "N/A"
      }));

      // Populate filter dropdowns
      populateFilterDropdowns();
    }

    // Reset filters
    adminFilteredVideos = [...adminVideosData];
    adminDisplayCount = 0;
    renderAdminVideos();

  } catch (err) {
    console.error('[admin-video] load videos error', err);
    adminVideosData = [];
    adminFilteredVideos = [];
    adminDisplayCount = 0;
    renderAdminVideos();
  }
}

// Populate filter dropdowns dynamically
function populateFilterDropdowns() {
  // Sessions
  const sessionDropdown = document.getElementById("videoFilterSession");
  const sessions = [...new Set(adminVideosData.map(v => v.session))].sort();
  if (sessionDropdown) {
    sessionDropdown.innerHTML = '<option value="">All Sessions</option>' +
      sessions.map(s => `<option value="${s}">${s}</option>`).join('');
  }

  // Classes
  const classDropdown = document.getElementById("videoFilterClass");
  const classes = [...new Set(adminVideosData.map(v => `${v.section_id}:${v.class_id}`))];
  if (classDropdown) {
    classDropdown.innerHTML = '<option value="">All Classes</option>' +
      classes.map(c => {
      const [section, cls] = c.split(":");
      return `<option value="${c}">Section ${section} - Class ${cls}</option>`;
    }).join('');
  }
}

const _videoApplyFilterBtn = document.getElementById("videoApplyFilterBtn");
if (_videoApplyFilterBtn) {
  _videoApplyFilterBtn.addEventListener("click", () => {
    applyAdminFilters();
  });
}

// ✅ FIXED: Robust filter function that handles all edge cases
function applyAdminFilters() {
  adminFiltersApplied = true;

  const sessionF = document.getElementById("videoFilterSession")?.value || "";
  const termF = document.getElementById("videoFilterTerm")?.value || "";
  const weekF = document.getElementById("videoFilterWeek")?.value || "";
  const classF = document.getElementById("videoFilterClass")?.value || "";

  // DEBUG: See what you are actually filtering for
  console.log('Filtering for:', { sessionF, termF, weekF, classF });
  console.log('Original Data Sample:', adminVideosData[0]);

  adminFilteredVideos = adminVideosData.filter(v => {
    // Check session
    if (sessionF && v.session?.toString() !== sessionF) return false;
    // Check term
    if (termF && v.term?.toString() !== termF) return false;
    // Check week
    if (weekF && v.week?.toString() !== weekF) return false;
    
    // Check class
    if (classF) {
      const [sid, cid] = classF.split(":");
      if (v.section_id?.toString() !== sid || v.class_id?.toString() !== cid) return false;
    }
    
    return true;
  });

  console.log('[admin-video] Filtered to', adminFilteredVideos.length, 'videos');
  adminDisplayCount = 0;
  renderAdminVideos();
}

function renderAdminVideos() {
  const grid = document.getElementById('adminVideoGrid');
  const loadMoreBtn = document.getElementById('adminLoadMoreBtn');

  if (!grid) return;

  if (adminDisplayCount === 0) grid.innerHTML = '';

  if (!adminFilteredVideos || adminFilteredVideos.length === 0) {
    grid.innerHTML = '<div class="col-12 text-center text-muted py-10">No videos found.</div>';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  const start = adminDisplayCount;
  const end = Math.min(start + ADMIN_VIDEOS_PAGE_SIZE, adminFilteredVideos.length);

  for (let i = start; i < end; i++) {
    const video = adminFilteredVideos[i];
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg overflow-hidden border border-emerald-100';
    const className = video.class_name ?? video.className ?? video.class ?? 'N/A';
    const videoUrl = video.video_url ?? video.videoUrl ?? '';
    
    card.innerHTML = `
      <div class="relative">
        <video class="w-full h-40 object-cover bg-black" preload="metadata" controls>
          <source src="${escapeHtml(videoUrl)}" type="video/mp4">
        </video>
        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer" data-video-id="${video.id}">
          <i class="fas fa-play-circle text-white text-5xl opacity-80 hover:opacity-100"></i>
        </div>
      </div>
      <div class="p-4">
        <p class="text-sm text-gray-600"><strong>Class:</strong> ${escapeHtml(className)}</p>
        <p class="text-sm text-gray-600"><strong>Session:</strong> ${escapeHtml(video.session || '')}</p>
        <p class="text-sm text-gray-600"><strong>Term:</strong> ${escapeHtml(video.term || '')} | <strong>Week:</strong> ${escapeHtml(video.week || '')}</p>
        <p class="text-sm text-gray-600"><strong>Day:</strong> ${escapeHtml(video.day || '')}</p>
        <p class="text-emerald-700 font-bold text-sm mt-2">Ayat: ${escapeHtml(String(video.from_ayah ?? video.fromAyah ?? ''))} - ${escapeHtml(String(video.to_ayah ?? video.toAyah ?? ''))}</p>
        <div class="mt-3 flex gap-2">
          <button class="btn btn-sm btn-primary flex-1 play-btn" data-id="${video.id}"><i class="fas fa-play me-1"></i>Play</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${video.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  adminDisplayCount = end;
  if (loadMoreBtn) {
    loadMoreBtn.style.display = adminDisplayCount >= adminFilteredVideos.length ? 'none' : 'inline-block';
  }

  // Attach handlers
  grid.querySelectorAll('.play-btn').forEach(btn => {
    btn.removeEventListener('click', adminPlayHandler);
    btn.addEventListener('click', adminPlayHandler);
  });
  grid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.removeEventListener('click', adminDeleteHandler);
    btn.addEventListener('click', adminDeleteHandler);
  });

  function adminPlayHandler(e) {
    const id = this.dataset.id;
    playAdminVideo(id);
  }

  function adminDeleteHandler(e) {
    const id = this.dataset.id;
    deleteAdminVideo(id);
  }
}

/* ===========================================================
   VIDEO PLAYER WITH CONTROLS
   =========================================================== */
function playAdminVideo(videoId) {
  const video = (adminVideosData || []).find(v => String(v.id) === String(videoId));
  if (!video) return;

  const modalEl = document.getElementById('adminVideoModal');
  const videoPlayer = document.getElementById('adminModalVideoPlayer');

  if (!videoPlayer) {
    console.warn('Missing #adminModalVideoPlayer in DOM');
    return;
  }

  let source = videoPlayer.querySelector('source');
  if (!source) {
    source = document.createElement('source');
    videoPlayer.appendChild(source);
  }

  source.src = video.video_url || '';
  videoPlayer.pause();
  videoPlayer.load();

  const setText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setText('adminVideoSessionInfo', video.session || '');
  setText('adminVideoTermInfo', 'Term ' + (video.term || ''));
  setText('adminVideoWeekInfo', 'Week ' + (video.week || ''));
  setText('adminVideoClassInfo', video.class_name || 'N/A');
  setText('adminVideoAyatInfo', `Ayat Range: ${video.from_ayah || '-'} - ${video.to_ayah || '-'}`);

  let controls = document.getElementById('adminModalVideoControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'adminModalVideoControls';
    controls.className = 'd-flex align-items-center gap-2 mt-2 flex-wrap';
    videoPlayer.insertAdjacentElement('afterend', controls);
  }
  controls.innerHTML = `
    <button id="adminPrevVideoBtn" class="btn btn-sm btn-outline-secondary"><i class="fas fa-backward"></i></button>
    <button id="adminPlayPauseBtn" class="btn btn-sm btn-outline-primary"><i class="fas fa-play"></i> Play</button>
    <button id="adminStopBtn" class="btn btn-sm btn-outline-danger"><i class="fas fa-stop"></i> Stop</button>
    <div class="flex-grow-1 d-flex align-items-center gap-2" style="min-width: 200px;">
      <input id="adminSeekBar" type="range" min="0" max="100" value="0" class="form-range" style="flex:1">
      <small id="adminCurrentTime" style="min-width:48px">00:00</small>
      <small>/</small>
      <small id="adminDuration" style="min-width:48px">00:00</small>
    </div>
    <button id="adminNextVideoBtn" class="btn btn-sm btn-outline-secondary"><i class="fas fa-forward"></i></button>
  `;

  const deleteBtn = document.getElementById('adminDeleteVideoBtn');
  if (deleteBtn) {
    deleteBtn.onclick = function () {
      if (confirm('Delete this video?')) {
        deleteAdminVideo(videoId);
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
    };
  }

  const fmt = (sec) => {
    if (!isFinite(sec) || sec <= 0) return '00:00';
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  modalEl._videoHandlers = modalEl._videoHandlers || {};
  const handlers = modalEl._videoHandlers;

  function onTimeUpdate() {
    const cur = videoPlayer.currentTime || 0;
    const dur = videoPlayer.duration || 0;
    const percent = dur ? (cur / dur) * 100 : 0;
    const seek = document.getElementById('adminSeekBar');
    if (seek && document.activeElement !== seek) seek.value = String(percent);
    const curEl = document.getElementById('adminCurrentTime');
    const durEl = document.getElementById('adminDuration');
    if (curEl) curEl.textContent = fmt(cur);
    if (durEl) durEl.textContent = fmt(dur);
  }

  function onLoadedMetadata() {
    const durEl = document.getElementById('adminDuration');
    if (durEl) durEl.textContent = fmt(videoPlayer.duration || 0);
  }

  function onEnded() {
    const idx = adminVideosData.findIndex(v => String(v.id) === String(videoId));
    const next = adminVideosData[idx + 1];
    if (next) {
      playAdminVideo(next.id);
    } else {
      videoPlayer.currentTime = 0;
      videoPlayer.pause();
      const playBtn = document.getElementById('adminPlayPauseBtn');
      if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
  }

  if (handlers.onTimeUpdate) videoPlayer.removeEventListener('timeupdate', handlers.onTimeUpdate);
  if (handlers.onLoadedMetadata) videoPlayer.removeEventListener('loadedmetadata', handlers.onLoadedMetadata);
  if (handlers.onEnded) videoPlayer.removeEventListener('ended', handlers.onEnded);

  handlers.onTimeUpdate = onTimeUpdate;
  handlers.onLoadedMetadata = onLoadedMetadata;
  handlers.onEnded = onEnded;

  videoPlayer.addEventListener('timeupdate', onTimeUpdate);
  videoPlayer.addEventListener('loadedmetadata', onLoadedMetadata);
  videoPlayer.addEventListener('ended', onEnded);

  const playPauseBtn = document.getElementById('adminPlayPauseBtn');
  if (handlers.playPauseHandler) playPauseBtn.removeEventListener('click', handlers.playPauseHandler);
  handlers.playPauseHandler = function () {
    if (videoPlayer.paused) {
      videoPlayer.play();
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    } else {
      videoPlayer.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
  };
  playPauseBtn.addEventListener('click', handlers.playPauseHandler);

  const stopBtn = document.getElementById('adminStopBtn');
  if (handlers.stopHandler) stopBtn.removeEventListener('click', handlers.stopHandler);
  handlers.stopHandler = function () {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
  };
  stopBtn.addEventListener('click', handlers.stopHandler);

  const seekBar = document.getElementById('adminSeekBar');
  if (handlers.seekInputHandler) seekBar.removeEventListener('input', handlers.seekInputHandler);
  if (handlers.seekChangeHandler) seekBar.removeEventListener('change', handlers.seekChangeHandler);

  handlers.seekInputHandler = function (ev) {
    const percent = parseFloat(ev.target.value || 0);
    const dur = videoPlayer.duration || 0;
    const newTime = (percent / 100) * dur;
    const curEl = document.getElementById('adminCurrentTime');
    if (curEl) curEl.textContent = fmt(newTime);
  };
  handlers.seekChangeHandler = function (ev) {
    const percent = parseFloat(ev.target.value || 0);
    const dur = videoPlayer.duration || 0;
    videoPlayer.currentTime = (percent / 100) * dur;
  };
  seekBar.addEventListener('input', handlers.seekInputHandler);
  seekBar.addEventListener('change', handlers.seekChangeHandler);

  const prevBtn = document.getElementById('adminPrevVideoBtn');
  const nextBtn = document.getElementById('adminNextVideoBtn');

  if (handlers.prevHandler) prevBtn.removeEventListener('click', handlers.prevHandler);
  handlers.prevHandler = function () {
    const idx = adminVideosData.findIndex(v => String(v.id) === String(videoId));
    const prev = adminVideosData[idx - 1];
    if (prev) playAdminVideo(prev.id);
  };
  prevBtn.addEventListener('click', handlers.prevHandler);

  if (handlers.nextHandler) nextBtn.removeEventListener('click', handlers.nextHandler);
  handlers.nextHandler = function () {
    const idx = adminVideosData.findIndex(v => String(v.id) === String(videoId));
    const next = adminVideosData[idx + 1];
    if (next) playAdminVideo(next.id);
  };
  nextBtn.addEventListener('click', handlers.nextHandler);

  if (handlers.onModalHide) modalEl.removeEventListener('hidden.bs.modal', handlers.onModalHide);
  handlers.onModalHide = function () {
    try {
      videoPlayer.pause();
      videoPlayer.removeEventListener('timeupdate', handlers.onTimeUpdate);
      videoPlayer.removeEventListener('loadedmetadata', handlers.onLoadedMetadata);
      videoPlayer.removeEventListener('ended', handlers.onEnded);
      playPauseBtn.removeEventListener('click', handlers.playPauseHandler);
      stopBtn.removeEventListener('click', handlers.stopHandler);
      seekBar.removeEventListener('input', handlers.seekInputHandler);
      seekBar.removeEventListener('change', handlers.seekChangeHandler);
      prevBtn.removeEventListener('click', handlers.prevHandler);
      nextBtn.removeEventListener('click', handlers.nextHandler);
    } catch (e) {
      // ignore cleanup errors
    }
  };
  modalEl.addEventListener('hidden.bs.modal', handlers.onModalHide);

  new bootstrap.Modal(modalEl).show();
  setTimeout(() => {
    const pp = document.getElementById('adminPlayPauseBtn');
    if (videoPlayer.paused && pp) pp.innerHTML = '<i class="fas fa-play"></i> Play';
    else if (!videoPlayer.paused && pp) pp.innerHTML = '<i class="fas fa-pause"></i> Pause';
  }, 120);
}

async function deleteAdminVideo(videoId) {
  if (!confirm('Are you sure you want to delete this video?')) return;
  try {
    const res = await fetch(`/api/admin/delete-memorization-video/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const json = await res.json().catch(() => ({ success: false, message: 'Invalid JSON' }));
    if (json.success) {
      alert('Video deleted');
      await loadAdminVideos();
    } else {
      alert('Delete failed: ' + (json.message || 'Unknown'));
    }
  } catch (err) {
    console.error('[admin-video] delete error', err);
    alert('Error deleting video');
  }
}

/* ===========================================================
   UI WIRING - FILTER & LOAD MORE
   =========================================================== */
function wireAdminVideoUI() {
  const videoApplyBtn = document.getElementById('videoApplyFilterBtn');
  if (videoApplyBtn) {
    videoApplyBtn.removeEventListener('click', applyAdminFilters);
    videoApplyBtn.addEventListener('click', applyAdminFilters);
  }

  const loadMoreBtn = document.getElementById('adminLoadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.removeEventListener('click', displayAdminVideos);
    loadMoreBtn.addEventListener('click', displayAdminVideos);
  }
}

function displayAdminVideos() {
  renderAdminVideos();
}

function populateFilterWeekOptions() {
  // Populate if needed dynamically
}

async function initAdminVideosModule() {
  await loadAdminVideoClasses().catch(e => console.error(e));
  await loadAdminVideoSessions().catch(e => console.error(e));
  initializeAdminVideoUpload();
  wireAdminVideoUI();
  await loadAdminVideos().catch(e => console.error(e));
}

/* ===========================================================
   STUDENT GENERAL LIST MANAGEMENT
   =========================================================== */
async function loadStudentGeneralList() {
  try {
    const resp = await fetch('/api/students-general-list', { credentials: 'include' });
    const json = await resp.json().catch(() => ({ success: false, message: 'Invalid response' }));
    if (json.success) {
      allStudentsGeneralData = json.data || [];
      displayStudentGeneralList(allStudentsGeneralData);
    } else {
      const tbody = document.getElementById('studentGeneralTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${escapeHtml(json.message || 'Failed')}</td></tr>`;
    }
  } catch (err) {
    console.error('[students] load error:', err);
    const tbody = document.getElementById('studentGeneralTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading students</td></tr>';
  }
}

function displayStudentGeneralList(students) {
  const tbody = document.getElementById('studentGeneralTableBody');
  if (!tbody) return;
  if (!students || students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students found.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  students.forEach(student => {
    const tr = document.createElement('tr');
    const statusBadge = student.status === 'Active' ? '<span class="badge bg-success">Active</span>' :
                        student.status === 'Graduated' ? '<span class="badge bg-primary">Graduated</span>' :
                        student.status === 'Left' ? '<span class="badge bg-warning text-dark">Left School</span>' :
                        `<span class="badge bg-secondary">${escapeHtml(student.status || 'N/A')}</span>`;
    const yearDisplay = (student.status === 'Graduated' || student.status === 'Left') && student.graduation_year ? escapeHtml(String(student.graduation_year)) : '-';
    tr.innerHTML = `
      <td>${escapeHtml(student.student_id || 'N/A')}</td>
      <td>${escapeHtml(student.student_name || 'N/A')}</td>
      <td>${statusBadge}</td>
      <td>${yearDisplay}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" onclick="editStudentGeneral(${Number(student.id)})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudentGeneral(${Number(student.id)})"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===========================================================
   ID CARD GENERATION - COMPLETELY FIXED
   =========================================================== */
function viewStudentIDCard(id, name, studentId, picture) {
  currentIDCardData = { type: 'student', id, name, entityId: studentId, picture };
  generateAndShowIDCard(currentIDCardData);
}

function viewStaffIDCard(id, name, staffId, picture) {
  currentIDCardData = { type: 'staff', id, name, entityId: staffId, picture };
  generateAndShowIDCard(currentIDCardData);
}

function generateAndShowIDCard(data) {
  const preview = document.getElementById('idCardPreview');
  if (!preview) return;

  const today = new Date().toLocaleDateString('en-GB');
  const pictureSrc = data.picture ? '/' + data.picture : '/Uploads/default.jpg';
  
  // Get school info (FIXED)
  const school = schoolInfo.get();
  const themeColor = data.type === 'student' ? '#065f46' : '#1e3a8a';

  preview.innerHTML = `
    <div id="idCardCanvas" style="width: 250px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: flex; flex-direction: column; gap: 20px;">
      <div style="width: 250px; height: 380px; background: #ffffff; border-radius: 15px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid #e5e7eb;">
        <div style="background: ${themeColor}; width: 100%; height: 90px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
          <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <img src="${school.logoSrc}" alt="Logo" style="width: 55px; height: 55px; border-radius: 50%; border: 3px solid white; background: white; z-index: 2; margin-bottom: 5px; object-fit: contain;" onerror="this.src='/Uploads/default.jpg'">
        </div>

        <div style="text-align: center; margin-top: 10px; padding: 0 10px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: ${themeColor}; letter-spacing: 0.5px; text-transform: uppercase;">${escapeHtml(school.name)}</h3>
          <p style="margin: 0; font-size: 10px; font-weight: 600; color: #6b7280;">${escapeHtml(school.subName)}</p>
        </div>

        <div style="margin-top: 15px; position: relative;">
          <div style="width: 100px; height: 100px; border-radius: 50%; padding: 3px; background: linear-gradient(to bottom, ${themeColor}, #e5e7eb); display: flex; align-items: center; justify-content: center;">
            <img src="${pictureSrc}" alt="Photo" style="width: 94px; height: 94px; border-radius: 50%; object-fit: cover; background: white;" onerror="this.src='/Uploads/default.jpg'">
          </div>
        </div>

        <div style="text-align: center; margin-top: 12px; width: 100%; padding: 0 15px;">
          <h4 style="margin: 0; font-size: 15px; color: #111827; font-weight: 700; border-bottom: 2px solid #f3f4f6; display: inline-block; padding-bottom: 2px;">${escapeHtml(String(data.name || '').toUpperCase())}</h4>
          <p style="margin: 5px 0; font-size: 11px; font-weight: 700; color: ${themeColor}; letter-spacing: 2px;">${escapeHtml(String(data.type || '').toUpperCase())}</p>
          
          <div style="margin-top: 10px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; border-radius: 8px;">
            <span style="font-size: 9px; color: #9ca3af; display: block; font-weight: 600;">ID NUMBER</span>
            <strong style="font-size: 13px; color: #111827;">${escapeHtml(String(data.entityId ?? ''))}</strong>
          </div>
        </div>

        <div style="position: absolute; bottom: 0; width: 100%; height: 8px; background: ${themeColor};"></div>
      </div>

      <div style="width: 250px; height: 380px; background: #fefefe; border-radius: 15px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden;">
        <div style="background: #374151; padding: 12px; color: white; text-align: center;">
          <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px;">INFORMATION & POLICY</span>
        </div>
        
        <div style="padding: 20px 15px; flex-grow: 1; display: flex; flex-direction: column; text-align: center; background-image: radial-gradient(#e5e7eb 0.5px, transparent 0.5px); background-size: 10px 10px;">
          
          <div style="font-size: 9px; color: #4b5563; line-height: 1.6; text-align: justify; margin-bottom: 15px;">
            This card is an official document of <strong>${escapeHtml(school.name)}</strong>. The holder is entitled to all privileges associated with their role. Loss of this card must be reported immediately.
          </div>

          <div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 8px; margin-bottom: 15px;">
            <p style="font-size: 9px; font-weight: 700; color: #9f1239; margin: 0;">RETURN POLICY:</p>
            <p style="font-size: 8.5px; color: #be123c; margin: 2px 0 0;">Must be returned to administration upon graduation or termination of service.</p>
          </div>

          <div style="margin-top: auto;">
            <p style="font-size: 9px; color: #374151; font-weight: 600;">${escapeHtml(school.address)}</p>
            <p style="font-size: 9px; color: ${themeColor}; font-weight: 700; margin: 4px 0;">${escapeHtml(school.phone)}</p>
            
            <div style="margin-top: 20px; display: flex; flex-direction: column; align-items: center;">
              <div style="width: 120px; border-top: 1px solid #111827; margin-bottom: 4px;"></div>
              <p style="font-size: 9px; font-weight: 700; color: #111827;">Authorized Signature</p>
              <p style="font-size: 8px; color: #6b7280;">Issued: ${today}</p>
            </div>
          </div>
        </div>

        <div style="background: #f3f4f6; padding: 6px; text-align: center; border-top: 1px solid #e5e7eb;">
          <small style="font-size: 8px; color: #9ca3af; font-weight: 600;">www.ibadurrahman.edu.ng</small>
        </div>
      </div>
    </div>
  `;

  const modalElement = document.getElementById('idCardModal');
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
  }
}

function downloadIDCard() {
  const cardElement = document.getElementById('idCardCanvas');
  if (!cardElement) {
    alert('No ID card preview available to download.');
    return;
  }
  if (!currentIDCardData) {
    alert('No ID card data available.');
    return;
  }

  const html2canvasFn = window.html2canvas;
  if (!html2canvasFn) {
    alert('html2canvas library not loaded. Please make sure it is included in your HTML.');
    return;
  }

  html2canvasFn(cardElement, {
    scale: 5,
    useCORS: true,
    backgroundColor: null,
    logging: false
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `ID_Card_${encodeURIComponent(String(currentIDCardData.entityId || 'card'))}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error('[idcard] html2canvas error', err);
    alert('Failed to generate image. See console for details.');
  });
}

/* ===========================================================
   SEARCH & FILTER HELPERS
   =========================================================== */
function filterStudentGeneralList() {
  const search = document.getElementById('studentGeneralSearch')?.value?.toLowerCase() || '';
  const statusFilter = document.getElementById('studentGeneralStatusFilter')?.value || '';

  const filtered = allStudentsGeneralData.filter(student => {
    const matchesSearch = !search ||
      (student.student_name && student.student_name.toLowerCase().includes(search)) ||
      (student.student_id && student.student_id.toLowerCase().includes(search));
    const matchesStatus = !statusFilter || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  displayStudentGeneralList(filtered);
}

/* ===========================================================
   STUDENT GENERAL CRUD FUNCTIONS
   =========================================================== */
function addNewStudentGeneral() {
  try {
    document.getElementById('studentGeneralModalTitle').textContent = 'Add New Student';
    document.getElementById('studentGeneralId').value = '';
    document.getElementById('studentIdInput').value = '';
    document.getElementById('studentNameInput').value = '';

    const statusSelect = document.getElementById('studentStatusInput');
    const gradYearGroup = document.getElementById('graduationYearGroup');
    const gradYearInput = document.getElementById('graduationYearInput');
    const gradYearLabel = document.getElementById('graduationYearLabel');

    statusSelect.value = 'Active';
    gradYearInput.value = '';
    gradYearGroup.style.display = 'none';
    gradYearLabel.textContent = 'Graduation Year';

    statusSelect.onchange = function () {
      if (this.value === 'Graduated' || this.value === 'Left') {
        gradYearGroup.style.display = 'block';
        gradYearLabel.textContent = this.value === 'Graduated' ? 'Graduation Year' : 'Year Left';
      } else {
        gradYearGroup.style.display = 'none';
        gradYearInput.value = '';
      }
    };

    new bootstrap.Modal(document.getElementById('studentGeneralModal')).show();
  } catch (err) {
    console.error('[students] addNewStudentGeneral error', err);
  }
}

async function editStudentGeneral(id) {
  try {
    const student = allStudentsGeneralData.find(s => s.id === id);
    if (!student) {
      alert('Student not found');
      return;
    }
    document.getElementById('studentGeneralModalTitle').textContent = 'Edit Student';
    document.getElementById('studentGeneralId').value = student.id;
    document.getElementById('studentIdInput').value = student.student_id || '';
    document.getElementById('studentNameInput').value = student.student_name || '';
    document.getElementById('studentStatusInput').value = student.status || 'Active';
    const gradYearGroup = document.getElementById('graduationYearGroup');
    const gradYearInput = document.getElementById('graduationYearInput');
    const gradYearLabel = document.getElementById('graduationYearLabel');
    if (student.status === 'Graduated' || student.status === 'Left') {
      gradYearGroup.style.display = 'block';
      gradYearLabel.textContent = student.status === 'Graduated' ? 'Graduation Year' : 'Year Left';
      gradYearInput.value = student.graduation_year || '';
    } else {
      gradYearGroup.style.display = 'none';
      gradYearInput.value = '';
    }
    new bootstrap.Modal(document.getElementById('studentGeneralModal')).show();
  } catch (err) {
    console.error('[students] editStudentGeneral error', err);
  }
}

async function saveStudentGeneral() {
  try {
    const id = document.getElementById('studentGeneralId').value;
    const studentId = document.getElementById('studentIdInput').value.trim();
    const studentName = document.getElementById('studentNameInput').value.trim();
    const status = document.getElementById('studentStatusInput').value;
    const graduationYear = document.getElementById('graduationYearInput').value;
    if (!studentId || !studentName) {
      alert('Student ID and Name are required');
      return;
    }
    let response;
    if (id) {
      response = await fetch(`/api/student-update-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, graduation_year: graduationYear }),
        credentials: 'include'
      });
    } else {
      response = await fetch('/api/student-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, student_name: studentName, status, graduation_year: graduationYear }),
        credentials: 'include'
      });
    }
    const data = await response.json().catch(() => ({ success: false, message: 'Invalid response' }));
    if (data.success) {
      alert(id ? 'Student updated!' : 'Student added!');
      bootstrap.Modal.getInstance(document.getElementById('studentGeneralModal'))?.hide();
      loadStudentGeneralList();
    } else {
      alert('Error: ' + (data.message || 'Failed'));
    }
  } catch (err) {
    console.error('[students] save error', err);
    alert('Error saving student');
  }
}

async function deleteStudentGeneral(id) {
  try {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const res = await fetch(`/api/student-delete/${id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json().catch(() => ({ success: false }));
    if (json.success) {
      alert('Deleted');
      loadStudentGeneralList();
    } else {
      alert('Error: ' + (json.message || 'Failed'));
    }
  } catch (err) {
    console.error('[students] delete error', err);
    alert('Error deleting student');
  }
}

/* ===========================================================
   PDF EXPORT FOR STUDENT GENERAL LIST - COMPLETELY FIXED
   =========================================================== */
function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => reject(new Error('Image failed to load: ' + url));
    img.src = url;
  });
}

const exportStudentGeneralListPDF = async () => {
  try {
    if (typeof jspdf === 'undefined' || !window.jspdf) {
      alert('jspdf library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Get school info (FIXED)
    const school = schoolInfo.get();
    console.log('[PDF] School info:', school);

    // Add logo if available
    if (school.logoSrc) {
      try {
        const img = await loadImageAsDataURL(school.logoSrc);
        const imgWidth = 30;
        const imgHeight = 30;
        const imgX = (pageWidth - imgWidth) / 2;
        doc.addImage(img, "JPEG", imgX, y, imgWidth, imgHeight);
        y += imgHeight + 5;
      } catch (e) {
        console.warn("[PDF] School logo failed to load", e);
      }
    }

    // Add school info
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    if (school.name) {
      doc.text(escapeHtml(school.name), pageWidth / 2, y, { align: "center" });
      y += 7;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    if (school.subName) {
      doc.text(escapeHtml(school.subName), pageWidth / 2, y, { align: "center" });
      y += 5;
    }

    doc.setFontSize(9);
    if (school.address) {
      const addressLines = doc.splitTextToSize(escapeHtml(school.address), pageWidth - 20);
      doc.text(addressLines, pageWidth / 2, y, { align: "center" });
      y += addressLines.length * 4 + 2;
    }

    if (school.phone) {
      doc.text(`Phone: ${escapeHtml(school.phone)}`, pageWidth / 2, y, { align: "center" });
      y += 5;
    }

    if (school.email) {
      doc.text(`Email: ${escapeHtml(school.email)}`, pageWidth / 2, y, { align: "center" });
      y += 5;
    }

    y += 3;

    // Title
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text("STUDENT GENERAL LIST", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Get filtered students
    const search = document.getElementById('studentGeneralSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('studentGeneralStatusFilter')?.value || '';

    const filteredStudents = allStudentsGeneralData.filter(student => {
      const matchesSearch = !search ||
        (student.student_name && student.student_name.toLowerCase().includes(search)) ||
        (student.student_id && student.student_id.toLowerCase().includes(search));
      const matchesStatus = !statusFilter || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filteredStudents.length === 0) {
      alert('No students to export.');
      return;
    }

    // Prepare table data
    const headers = ['Student ID', 'Name', 'Status', 'Year'];
    const body = filteredStudents.map(student => [
      student.student_id || 'N/A',
      student.student_name || 'N/A',
      student.status || 'N/A',
      (student.status === 'Graduated' || student.status === 'Left') && student.graduation_year
        ? String(student.graduation_year)
        : '-'
    ]);

    // Generate table
    doc.autoTable({
      head: [headers],
      body: body,
      startY: y,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0] },
      margin: { left: 10, right: 10 },
      didDrawPage: function (data) {
        // Footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const footerY = pageHeight - 10;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 10, footerY);
        doc.text(`Page ${data.pageCount}`, pageSize.getWidth() - 20, footerY);
      }
    });

    // Save PDF
    doc.save(`student_general_list_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log('[PDF] Export successful');

  } catch (err) {
    console.error('[Students] PDF export error:', err);
    alert('Failed to export PDF. Check console for details.');
  }
};

/* ===========================================================
   DOM READY - MAIN INITIALIZATION
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[admin-video] admin_video_and_students.js loaded');

  // Initialize admin videos module
  initAdminVideosModule().catch(err => console.error('[video] init error', err));

  // Load student general list
  loadStudentGeneralList().catch(() => {});

  // Wire up video filter button
  const videoApplyFilterBtn = document.getElementById('videoApplyFilterBtn');
  if (videoApplyFilterBtn) {
    videoApplyFilterBtn.removeEventListener('click', applyAdminFilters);
    videoApplyFilterBtn.addEventListener('click', applyAdminFilters);
  }

  // Wire up Load More button
  const loadMoreBtn = document.getElementById('adminLoadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.removeEventListener('click', displayAdminVideos);
    loadMoreBtn.addEventListener('click', displayAdminVideos);
  }

  // Wire up Download ID Card button
  const downloadBtn = document.getElementById('downloadIDCardBtn');
  if (downloadBtn) {
    downloadBtn.removeEventListener('click', downloadIDCard);
    downloadBtn.addEventListener('click', downloadIDCard);
  }

  // Wire up Add New Student button
  const addStudentBtn = document.getElementById('addNewStudentBtn');
  if (addStudentBtn) {
    addStudentBtn.removeEventListener('click', addNewStudentGeneral);
    addStudentBtn.addEventListener('click', addNewStudentGeneral);
  }

  // Wire up Save Student button
  const saveStudentBtn = document.getElementById('saveStudentBtn');
  if (saveStudentBtn) {
    saveStudentBtn.removeEventListener('click', saveStudentGeneral);
    saveStudentBtn.addEventListener('click', saveStudentGeneral);
  }

  // Wire up Student search and filter
  const searchInput = document.getElementById('studentGeneralSearch');
  if (searchInput) {
    searchInput.removeEventListener('input', filterStudentGeneralList);
    searchInput.addEventListener('input', filterStudentGeneralList);
  }

  const statusFilter = document.getElementById('studentGeneralStatusFilter');
  if (statusFilter) {
    statusFilter.removeEventListener('change', filterStudentGeneralList);
    statusFilter.addEventListener('change', filterStudentGeneralList);
  }

  // Wire up Export PDF button
  const exportPdfBtn = document.getElementById('exportStudentGeneralPDFBtn')
    || document.getElementById('exportStudentGeneralPdfBtn')
    || document.getElementById('exportStudentGeneralListPDFBtn');
  if (exportPdfBtn) {
    exportPdfBtn.removeEventListener('click', exportStudentGeneralListPDF);
    exportPdfBtn.addEventListener('click', exportStudentGeneralListPDF);
  }

  // ID Card click delegation
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-id-card-btn');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const entityId = btn.getAttribute('data-studentid') || btn.getAttribute('data-staffid');
      const picture = btn.getAttribute('data-picture');
      const type = btn.getAttribute('data-type');

      if (type === 'student') viewStudentIDCard(id, name, entityId, picture);
      if (type === 'staff') viewStaffIDCard(id, name, entityId, picture);
    }
  });

  console.log('[admin-video] Initialization complete');
});

/* ===========================================================
   EXPORT FUNCTIONS TO GLOBAL WINDOW FOR COMPATIBILITY
   =========================================================== */
window.loadAdminVideoClasses = loadAdminVideoClasses;
window.loadAdminVideoSessions = loadAdminVideoSessions;
window.initializeAdminVideoUpload = initializeAdminVideoUpload;
window.loadAdminVideos = loadAdminVideos;
window.displayAdminVideos = displayAdminVideos;
window.applyAdminFilters = applyAdminFilters;
window.renderAdminVideos = renderAdminVideos;
window.playAdminVideo = playAdminVideo;
window.deleteAdminVideo = deleteAdminVideo;

window.loadStudentGeneralList = loadStudentGeneralList;
window.displayStudentGeneralList = displayStudentGeneralList;
window.filterStudentGeneralList = filterStudentGeneralList;
window.addNewStudentGeneral = addNewStudentGeneral;
window.editStudentGeneral = editStudentGeneral;
window.saveStudentGeneral = saveStudentGeneral;
window.deleteStudentGeneral = deleteStudentGeneral;
window.exportStudentGeneralListPDF = exportStudentGeneralListPDF;

window.viewStudentIDCard = viewStudentIDCard;
window.viewStaffIDCard = viewStaffIDCard;
window.generateAndShowIDCard = generateAndShowIDCard;
window.downloadIDCard = downloadIDCard;

window.schoolInfo = schoolInfo;
