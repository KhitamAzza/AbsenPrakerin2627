// ===== CONFIG =====
const API_URL = 'https://script.google.com/macros/s/AKfycbx5bGE6_bB2ttsYgIfK5nmEq2tDIrnLoKrRl2GgMBvC_08_6ESD6Pzaz-tLk-5TDyA39g/exec'; // GANTI INI

const TEACHERS = {
  "pembizen": "Masduki Zen, S.Kom",
  "pembiretma": "Retma Fahriza Mahrita, S. Pd., Gr",
  "pembirahmat": "Rahmat Hidayat, S.Kom",
  "pembihurin": "Hurin Vita Kurnia, S.Pd",
  "pembivisabel": "Visa Bella Valentine, S. Tr, Par",
  "pembirizky": "Rizky Andriansyah, S.Kom",
  "pembinurkhozi": "Nur Khozinatul Asroriyah, S.Kep",
  "pembianikkris": "Anik Kristyowati, S. Pd., Gr",
  "pembiavi": "Avi Lailatul Farida, S. Pd",
  "pembialvia": "Alvia Dwi Mandasari, A.Md.Kep",
  "pembiatika": "Atika Qorina, S.Pd",
  "pembideni": "M Deni Affandi, S.T",
  "pembienggar": "Enggarsari, S.Pd",
  "pembiisnaeni": "Fatimatul Isnaeni, S.Pd",
  "pembiprilda": "Prilda Bagus Pramono, S. T",
  "pembiagung": "Agung Heri Cahyono, S. Pd",
  "pembiafrina": "Afrina Risky K., S. Tr., Par",
  "pembiulfa": "Ulfa Fitria, S.Pd",
  "pembivina": "Vina Sherlyana, S.Si",
  "azkiahasna": "Chusnul Khitam Azza, S.T",
  "pembifitri": "Hj. Fitri Amaliyah, M.Pd",
  "pembiwahyu": "Wahyu Prihanto",
  "pembilaila": "Lailatul Isnaini, S. Farm",
  "pembiarif": "Moch Syamsul Arif, S. Pd., Gr",
  "panitia": "ADMIN"
};

const ADMIN_PASSWORD = "panitia";
const STATUS_OPTIONS = ["KOSONG", "ALPHA", "HADIR", "IZIN", "SAKIT", "LIBUR"];
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAY_SHORT = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

// ===== STATE =====
let currentPassword = null;
let currentTeacherName = null;
let isAdmin = false;
let students = [];
let currentIndex = 0;
let currentWeekStart = null;
let selectedDate = null;
let selectedDayNum = null;
let pendingChanges = {};
let monthData = {};
let isBatchMode = false;
let touchStartX = 0;
let isSwiping = false;
let isAnimating = false;

// ===== AUDIO =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'next') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'prev') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'save') {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2); gain2.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(523, now);
      gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(659, now + 0.05);
      gain2.gain.setValueAtTime(0.1, now + 0.05); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.05); osc2.stop(now + 0.35);
    }
  } catch (e) {}
}

// ===== LOGIN =====
function handleLogin() {
  const input = document.getElementById('passwordInput').value.trim().toLowerCase();
  const error = document.getElementById('loginError');

  if (TEACHERS[input]) {
    currentPassword = input;
    currentTeacherName = TEACHERS[input];
    isAdmin = input === ADMIN_PASSWORD;
    error.classList.remove('show');
    showLoading();
    if (isAdmin) {
      loadAdminData();
    } else {
      loadAttendanceData();
    }
  } else {
    error.classList.add('show');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
  }
}

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});
document.getElementById('passwordInput').addEventListener('input', (e) => {
  const val = e.target.value.trim().toLowerCase();
  if (TEACHERS[val]) handleLogin();
});

function showLoading() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
}

function logout() {
  location.reload();
}

// ===== DATE HELPERS =====
function getSunday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}
function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
function getMonthSheetName(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}
function formatDateLabel(start, end) {
  const s = `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  return `${s} – ${e}`;
}

// ===== PHOTO URL HELPER =====
function convertDriveUrl(url) {
  if (!url) return '';
  url = url.trim();

  // Already a direct URL (lh3.googleusercontent.com)
  if (url.includes('googleusercontent.com')) {
    return url;
  }

  // Google Drive /file/d/FILE_ID format
  // e.g., https://drive.google.com/file/d/1ABC123/view?usp=sharing
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }

  // Google Drive open?id=FILE_ID format
  // e.g., https://drive.google.com/open?id=1ABC123
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  }

  // Google Drive uc?id=FILE_ID format (already direct-ish, but ensure lh3 format)
  const ucMatch = url.match(/uc\?.*?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  }

  // If it's already a valid image URL (not drive), return as-is
  if (url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
    return url;
  }

  return url;
}

// ===== LOAD DATA =====
async function loadAttendanceData() {
  try {
    document.getElementById('teacherDisplay').textContent = currentTeacherName;

    const resStudents = await fetch(`${API_URL}?action=students&teacher=${encodeURIComponent(currentTeacherName)}`);
    const dataStudents = await resStudents.json();

    if (dataStudents.status !== 'ok') {
      throw new Error(dataStudents.message || 'Gagal memuat siswa');
    }

    students = dataStudents.students;
    if (students.length === 0) {
      showToast('Tidak ada siswa untuk pembimbing ini', 'error');
      setTimeout(() => location.reload(), 2000);
      return;
    }

    const now = new Date();
    const monthName = getMonthSheetName(now);
    const resAtt = await fetch(`${API_URL}?action=attendance&month=${encodeURIComponent(monthName)}`);
    const dataAtt = await resAtt.json();

    if (dataAtt.status === 'ok' && dataAtt.data) {
      monthData = dataAtt.data;
    }

    currentWeekStart = getSunday(now);
    selectedDate = new Date(now);
    selectedDayNum = now.getDate().toString();

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('attendanceScreen').style.display = 'block';

    renderWeekLabel();
    renderWeekStats();
    renderWeekChips();
    renderStudentCard();
    showToast(`Selamat datang, ${currentTeacherName}! ${students.length} siswa ditemukan`, 'success');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    console.error(err);
  }
}

// ===== WEEK LABEL =====
function renderWeekLabel() {
  const label = document.getElementById('weekLabel');
  const endOfWeek = new Date(currentWeekStart);
  endOfWeek.setDate(currentWeekStart.getDate() + 6);
  label.textContent = formatDateLabel(currentWeekStart, endOfWeek);
}

// ===== WEEK STATS =====
function renderWeekStats() {
  const statsEl = document.getElementById('weekStats');
  if (!students[currentIndex]) {
    statsEl.textContent = '';
    return;
  }

  const nama = students[currentIndex].nama;
  const today = new Date();
  const weekStart = getSunday(today);
  const dayOfWeek = today.getDay();
  const daysPassed = dayOfWeek;

  const counts = { HADIR: 0, IZIN: 0, SAKIT: 0, LIBUR: 0, ALPHA: 0, KOSONG: 0 };
  let filled = 0;

  for (let w = 0; w <= daysPassed; w++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + w);
    const dayStr = d.getDate().toString();
    const pendingKey = `${nama}|${dayStr}`;
    const pendingStatus = pendingChanges[pendingKey];
    const savedStatus = monthData[nama] ? monthData[nama][dayStr] : null;

    let effectiveStatus;
    if (pendingStatus !== undefined) {
      effectiveStatus = pendingStatus;
    } else if (savedStatus === undefined || savedStatus === null || savedStatus === "") {
      effectiveStatus = 'KOSONG';
    } else {
      effectiveStatus = savedStatus;
    }

    counts[effectiveStatus] = (counts[effectiveStatus] || 0) + 1;
    if (effectiveStatus !== 'KOSONG') filled++;
  }

  const parts = [];
  if (counts.HADIR > 0) parts.push(`<span style="color:var(--hadir)">${counts.HADIR} HADIR</span>`);
  if (counts.IZIN > 0) parts.push(`<span style="color:var(--izin)">${counts.IZIN} IZIN</span>`);
  if (counts.SAKIT > 0) parts.push(`<span style="color:var(--sakit)">${counts.SAKIT} SAKIT</span>`);
  if (counts.LIBUR > 0) parts.push(`<span style="color:var(--libur)">${counts.LIBUR} LIBUR</span>`);
  if (counts.ALPHA > 0) parts.push(`<span style="color:var(--alpha)">${counts.ALPHA} ALPHA</span>`);
  if (counts.KOSONG > 0) parts.push(`<span style="color:var(--gray-400)">${counts.KOSONG} KOSONG</span>`);

  const summary = parts.length > 0 ? parts.join(' • ') : 'Belum ada data';
  const totalDays = daysPassed + 1;
  statsEl.innerHTML = `<span style="color:var(--gray-500)">Minggu ini: ${filled}/${totalDays} hari terisi</span> &nbsp;|&nbsp; ${summary}`;
}
// ===== WEEK CHIPS (VISUAL ONLY) =====
function renderWeekChips() {
  const container = document.getElementById('weekChips');
  if (!container) return;
  const today = new Date();
  const endOfWeek = new Date(currentWeekStart);
  endOfWeek.setDate(currentWeekStart.getDate() + 6);

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    const dayNum = d.getDate().toString();
    const isToday = isSameDay(d, today);
    const isFuture = d > today;

    let dotClass = 'kosong';
    let dotTitle = 'KOSONG';
    if (students[currentIndex]) {
      const nama = students[currentIndex].nama;
      const pendingKey = `${nama}|${dayNum}`;
      const pendingStatus = pendingChanges[pendingKey];
      const savedStatus = monthData[nama] ? monthData[nama][dayNum] : null;

      let effectiveStatus;
      if (pendingStatus !== undefined) {
        effectiveStatus = pendingStatus;
      } else if (savedStatus === undefined || savedStatus === null || savedStatus === "") {
        effectiveStatus = 'KOSONG';
      } else {
        effectiveStatus = savedStatus;
      }

      dotTitle = effectiveStatus;
      if (effectiveStatus === 'KOSONG') dotClass = 'kosong';
      else if (effectiveStatus === 'ALPHA') dotClass = 'alpha';
      else if (effectiveStatus === 'HADIR') dotClass = 'hadir';
      else if (effectiveStatus === 'IZIN') dotClass = 'izin';
      else if (effectiveStatus === 'SAKIT') dotClass = 'sakit';
      else if (effectiveStatus === 'LIBUR') dotClass = 'libur';
    }

    const chipClass = [
      'day-chip',
      'readonly',
      isToday ? 'today' : '',
      isFuture ? 'future' : ''
    ].filter(Boolean).join(' ');

    html += `
      <div class="${chipClass}" title="${dotTitle}">
        <div class="day-name">${DAY_SHORT[i]}</div>
        <div class="day-num">${d.getDate()}</div>
        <div class="day-dot ${dotClass}"></div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// ===== STUDENT CARD =====
function renderStudentCard() {
  if (students.length === 0) return;
  const s = students[currentIndex];
  const card = document.getElementById('studentCard');

  const wrapper = document.getElementById('photoWrapper');
  const directUrl = convertDriveUrl(s.photoUrl);
  if (directUrl) {
    wrapper.innerHTML = `<img class="student-photo" src="${directUrl}" alt="${s.nama}" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\'photo-placeholder\'>👤</div>'">`;
  } else {
    wrapper.innerHTML = `<div class="photo-placeholder">👤</div>`;
  }

  document.getElementById('studentNama').textContent = s.nama;
  document.getElementById('studentKelas').textContent = s.kelas || '-';
  document.getElementById('studentDudi').textContent = s.dudi ? `DUDI: ${s.dudi}` : '';
  document.getElementById('studentPembimbing').textContent = s.pembimbing ? `Pembimbing: ${s.pembimbing}` : '';
  document.getElementById('studentCounter').textContent = `${currentIndex + 1} / ${students.length}`;

  updateStatusSelect();
  renderWeekStats();
}

function updateStatusSelect() {
  if (!students[currentIndex]) return;
  const nama = students[currentIndex].nama;
  const pendingKey = `${nama}|${selectedDayNum}`;
  const pendingStatus = pendingChanges[pendingKey];
  const savedStatus = monthData[nama] ? monthData[nama][selectedDayNum] : null;

  let effectiveStatus;
  if (pendingStatus !== undefined) {
    effectiveStatus = pendingStatus;
  } else if (savedStatus === undefined || savedStatus === null || savedStatus === "") {
    effectiveStatus = 'KOSONG';
  } else {
    effectiveStatus = savedStatus;
  }

  const select = document.getElementById('statusSelect');
  select.value = effectiveStatus;
  updateSelectColor(select);
}

function updateSelectColor(select) {
  select.className = 'status-select';
  if (select.value === 'HADIR') select.classList.add('status-hadir');
  else if (select.value === 'IZIN') select.classList.add('status-izin');
  else if (select.value === 'SAKIT') select.classList.add('status-sakit');
  else if (select.value === 'LIBUR') select.classList.add('status-libur');
  else if (select.value === 'ALPHA') select.classList.add('status-alpha');
  else select.classList.add('status-kosong');
}

function handleStatusChange(value) {
  if (!students[currentIndex]) return;
  const nama = students[currentIndex].nama;
  const key = `${nama}|${selectedDayNum}`;
  const savedStatus = monthData[nama] ? monthData[nama][selectedDayNum] : null;
  const normalizedSaved = (savedStatus === undefined || savedStatus === null || savedStatus === "") ? 'KOSONG' : savedStatus;

  if (value === normalizedSaved) {
    delete pendingChanges[key];
  } else {
    pendingChanges[key] = value;
  }

  updateSelectColor(document.getElementById('statusSelect'));
  updatePendingCount();
  renderWeekStats();
  renderWeekChips();
}

function updatePendingCount() {
  const count = Object.keys(pendingChanges).length;
  const badge = document.getElementById('pendingCount');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ===== SWIPE =====
const cardContainer = document.getElementById('cardContainer');
cardContainer.addEventListener('touchstart', (e) => {
  if (isBatchMode || isAnimating) return;
  touchStartX = e.touches[0].clientX;
  isSwiping = true;
}, { passive: true });

cardContainer.addEventListener('touchmove', (e) => {
  if (!isSwiping || isBatchMode || isAnimating) return;
  const diff = touchStartX - e.touches[0].clientX;
  const card = document.getElementById('studentCard');
  if (Math.abs(diff) > 10) {
    card.style.transform = `translateX(${-diff * 0.3}px)`;
  }
}, { passive: true });

cardContainer.addEventListener('touchend', (e) => {
  if (!isSwiping || isBatchMode) return;
  isSwiping = false;
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  const threshold = 50;
  const card = document.getElementById('studentCard');
  card.style.transform = '';

  if (Math.abs(diff) > threshold) {
    if (diff > 0) goNext();
    else goPrev();
  }
}, { passive: true });

document.addEventListener('keydown', (e) => {
  if (document.getElementById('attendanceScreen').style.display !== 'block') return;
  if (isBatchMode) return;
  if (isAnimating) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
});

function goNext() {
  if (isBatchMode) {
    showToast('Tutup panel Isi Minggu Ini terlebih dahulu', 'warning');
    return;
  }
  if (currentIndex >= students.length - 1) {
    showToast('Ini siswa terakhir', 'warning');
    return;
  }
  if (isAnimating) return;
  isAnimating = true;
  playSound('next');

  const card = document.getElementById('studentCard');
  card.classList.add('swipe-left');

  setTimeout(() => {
    currentIndex++;
    card.classList.remove('swipe-left');
    card.classList.add('slide-in-left');
    renderStudentCard();
    setTimeout(() => {
      card.classList.remove('slide-in-left');
      isAnimating = false;
    }, 300);
  }, 300);
}

function goPrev() {
  if (isBatchMode) {
    showToast('Tutup panel Isi Minggu Ini terlebih dahulu', 'warning');
    return;
  }
  if (currentIndex <= 0) {
    showToast('Ini siswa pertama', 'warning');
    return;
  }
  if (isAnimating) return;
  isAnimating = true;
  playSound('prev');

  const card = document.getElementById('studentCard');
  card.classList.add('swipe-right');

  setTimeout(() => {
    currentIndex--;
    card.classList.remove('swipe-right');
    card.classList.add('slide-in-right');
    renderStudentCard();
    setTimeout(() => {
      card.classList.remove('slide-in-right');
      isAnimating = false;
    }, 300);
  }, 300);
}

// ===== BATCH MODE =====
function toggleBatchMode() {
  isBatchMode = !isBatchMode;
  const btn = document.getElementById('batchToggle');
  const panel = document.getElementById('batchPanel');

  if (isBatchMode) {
    btn.classList.add('active');
    btn.textContent = 'Tutup';
    panel.classList.add('show');
    renderBatchPanel();
  } else {
    btn.classList.remove('active');
    btn.textContent = 'Tanggal Lain';
    panel.classList.remove('show');
  }
}

function renderBatchPanel() {
  const container = document.getElementById('batchRows');
  if (!students[currentIndex]) return;
  const nama = students[currentIndex].nama;
  const today = new Date();
  let html = '';

  const weekStart = getSunday(today);
  const dayOfWeek = today.getDay();
  const daysPassed = dayOfWeek;

  for (let w = 0; w <= daysPassed; w++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + w);
    const dayStr = d.getDate().toString();
    const pendingKey = `${nama}|${dayStr}`;
    const pendingStatus = pendingChanges[pendingKey];
    const savedStatus = monthData[nama] ? monthData[nama][dayStr] : null;

    let effectiveStatus;
    if (pendingStatus !== undefined) {
      effectiveStatus = pendingStatus;
    } else if (savedStatus === undefined || savedStatus === null || savedStatus === "") {
      effectiveStatus = 'KOSONG';
    } else {
      effectiveStatus = savedStatus;
    }

    const dayName = DAY_SHORT[w];

    html += `
      <div class="batch-row">
        <div class="batch-date">${dayName}, ${d.getDate()}</div>
        <select class="batch-select" onchange="updateBatchStatus('${dayStr}', this.value)">
          <option value="KOSONG" ${effectiveStatus === 'KOSONG' ? 'selected' : ''}>KOSONG</option>
          <option value="ALPHA" ${effectiveStatus === 'ALPHA' ? 'selected' : ''}>ALPHA</option>
          <option value="HADIR" ${effectiveStatus === 'HADIR' ? 'selected' : ''}>HADIR</option>
          <option value="IZIN" ${effectiveStatus === 'IZIN' ? 'selected' : ''}>IZIN</option>
          <option value="SAKIT" ${effectiveStatus === 'SAKIT' ? 'selected' : ''}>SAKIT</option>
          <option value="LIBUR" ${effectiveStatus === 'LIBUR' ? 'selected' : ''}>LIBUR</option>
        </select>
      </div>
    `;
  }
  container.innerHTML = html;
}

function updateBatchStatus(day, value) {
  if (!students[currentIndex]) return;
  const nama = students[currentIndex].nama;
  const key = `${nama}|${day}`;
  const savedStatus = monthData[nama] ? monthData[nama][day] : null;
  const normalizedSaved = (savedStatus === undefined || savedStatus === null || savedStatus === "") ? 'KOSONG' : savedStatus;

  if (value === normalizedSaved) {
    delete pendingChanges[key];
  } else {
    pendingChanges[key] = value;
  }

  updatePendingCount();
  renderWeekStats();
  renderWeekChips();
}

// ===== SAVE =====
async function saveAttendance() {
  const keys = Object.keys(pendingChanges);
  if (keys.length === 0) {
    showToast('Tidak ada perubahan untuk disimpan', 'warning');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const monthName = getMonthSheetName(selectedDate || new Date());
  const attendance = [];

  for (const key of keys) {
    const [nama, day] = key.split('|');
    attendance.push({ nama, day, status: pendingChanges[key] });
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveAttendance', month: monthName, attendance: attendance })
    });

    const result = await response.json();

    if (result.status === 'ok') {
      playSound('save');
      showToast(`✅ ${result.message}`, 'success');

      for (const entry of attendance) {
        if (!monthData[entry.nama]) monthData[entry.nama] = {};
        monthData[entry.nama][entry.day] = entry.status === 'KOSONG' ? '' : entry.status;
      }

      pendingChanges = {};
      updatePendingCount();
      renderWeekStats();
      renderWeekChips();
      updateStatusSelect();
      if (isBatchMode) renderBatchPanel();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast('❌ Gagal menyimpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

// ===== ADMIN =====
async function loadAdminData() {
  try {
    const now = new Date();
    const monthName = getMonthSheetName(now);
    const res = await fetch(`${API_URL}?action=admin&month=${encodeURIComponent(monthName)}`);
    const data = await res.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Gagal memuat data admin');
    }

    renderAdminDashboard(data);

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
    showToast('Dashboard Admin dimuat', 'success');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    console.error(err);
  }
}

function renderAdminDashboard(data) {
  window.lastAdminData = data;
  const teacherList = document.getElementById('teacherStatusList');
  let teacherHtml = '';
  let filledTeachers = 0;
  let totalTeachers = 0;

  for (const [password, name] of Object.entries(TEACHERS)) {
    if (password === ADMIN_PASSWORD) continue;
    const status = data.teacherStatus[name];
    if (!status) continue;

    totalTeachers++;
    const pct = Math.round((status.filledDays / status.totalDays) * 100);
    let badgeClass = 'badge-empty';
    let badgeText = 'Belum';
    if (pct === 100) {
      badgeClass = 'badge-complete';
      badgeText = 'Lengkap';
      filledTeachers++;
    }
    else if (pct > 0) { badgeClass = 'badge-partial'; badgeText = `${pct}%`; }

    teacherHtml += `
      <div class="teacher-row">
        <div class="teacher-info">
          <div class="teacher-name-admin">${name}</div>
          <div class="teacher-meta">${status.totalStudents} siswa &bull; Minggu ini: ${status.filledDays}/${status.totalDays} hari</div>
          <div class="progress-mini">
            <div class="progress-mini-fill" style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="teacher-status">
          <div class="status-badge ${badgeClass}">${badgeText}</div>
        </div>
      </div>
    `;
  }

  const summaryHtml = `<div style="font-size:13px;color:var(--gray-500);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--gray-100);">
    ${filledTeachers} dari ${totalTeachers} pembimbing sudah mengisi minggu ini
  </div>`;
  teacherList.innerHTML = summaryHtml + (teacherHtml || '<div style="color:var(--gray-400);font-size:13px;text-align:center;">Belum ada data</div>');

  const alphaList = document.getElementById('alphaAlertList');
  let alphaHtml = '';

  if (data.alphaAlerts && data.alphaAlerts.length > 0) {
    for (const alert of data.alphaAlerts) {
      const kosongText = alert.kosongCount > 0 ? `<span style="color:var(--gray-400)"> +${alert.kosongCount} kosong</span>` : '';
      alphaHtml += `
        <div class="alpha-row">
          <img class="alpha-photo" src="${convertDriveUrl(alert.photo) || ''}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="alpha-info">
            <div class="alpha-name">${alert.nama}</div>
            <div class="alpha-teacher">${alert.teacher}</div>
          </div>
          <div style="text-align:right">
            <div class="alpha-count">${alert.alphaCount}</div>
            <div class="alpha-label">ALPHA${kosongText}</div>
          </div>
        </div>
      `;
    }
  } else {
    alphaHtml = '<div style="color:var(--gray-400);font-size:13px;text-align:center;">Tidak ada siswa dengan status ALPHA eksplisit</div>';
  }
  alphaList.innerHTML = alphaHtml;
}

// ===== ADMIN FAB =====
let isAdminFabOpen = false;

function toggleAdminFab() {
  isAdminFabOpen = !isAdminFabOpen;
  const menu = document.getElementById('adminFabMenu');
  const mainBtn = document.getElementById('adminFabMain');
  if (isAdminFabOpen) {
    menu.classList.add('show');
    mainBtn.classList.add('active');
  } else {
    menu.classList.remove('show');
    mainBtn.classList.remove('active');
  }
}
// ===== MONTHLY SUMMARY MODAL =====
// ===== MONTHLY SUMMARY MODAL =====
let summaryCurrentMonth = new Date();

function toggleSummaryModal() {
  const modal = document.getElementById('summaryModal');
  if (modal.classList.contains('show')) {
    closeSummaryModal();
  } else {
    summaryCurrentMonth = new Date();
    renderSummaryModal();
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSummaryModal(e) {
  if (e && e.target !== e.currentTarget) return;
  
  const modal = document.getElementById('summaryModal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function changeSummaryMonth(delta) {
  summaryCurrentMonth.setMonth(summaryCurrentMonth.getMonth() + delta);
  // Re-enable arrows before fetching
  document.querySelectorAll('.month-arrow').forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
  });
  renderSummaryModal();
}

function isMonthSameOrAfter(a, b) {
  return a.getFullYear() > b.getFullYear() || 
    (a.getFullYear() === b.getFullYear() && a.getMonth() >= b.getMonth());
}

async function renderSummaryModal() {
  const body = document.getElementById('summaryModalBody');
  const monthLabel = document.getElementById('summaryMonthLabel');
  const monthName = getMonthSheetName(summaryCurrentMonth);
  const now = new Date();
  const isCurrentOrFuture = isMonthSameOrAfter(summaryCurrentMonth, now);
  
  monthLabel.textContent = monthName;
  
  // Reset arrows
  const arrows = document.querySelectorAll('.month-arrow');
  arrows.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
  });

  body.innerHTML = `
    <div class="summary-loading">
      <div class="spinner"></div>
      <div class="summary-loading-text">Memuat data ${monthName}...</div>
    </div>
  `;

  try {
    const res = await fetch(`${API_URL}?action=admin&month=${encodeURIComponent(monthName)}`);
    const data = await res.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Gagal memuat data');
    }

    // No sheet for this month
    if (data.noSheet) {
      body.innerHTML = `
        <div class="summary-empty-state">
          <div style="font-size:32px;margin-bottom:8px">📭</div>
          <div>Tidak ada data di bulan ini</div>
        </div>
      `;
      // Block next month arrow if this is current or future month
      if (isCurrentOrFuture && arrows[1]) {
        arrows[1].disabled = true;
        arrows[1].style.opacity = '0.3';
      }
      return;
    }

    const teacherMonthlyStatus = data.teacherMonthlyStatus || {};
    
    const teachers = Object.entries(TEACHERS)
      .filter(([pw]) => pw !== ADMIN_PASSWORD)
      .map(([pw, name]) => ({ name, status: teacherMonthlyStatus[name] }))
      .filter(t => t.status);

    const filledCount = teachers.filter(t => t.status.isComplete).length;
    const totalCount = teachers.length;
    const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    let listHtml = '';
    for (const t of teachers) {
      const isDone = t.status.isComplete;
      const badgeClass = isDone ? 'summary-status-done' : 'summary-status-pending';
      const badgeText = isDone ? 'Lengkap' : `${t.status.filledDays} hari terisi`;
      listHtml += `
        <div class="summary-teacher-item">
          <span class="summary-teacher-name">${t.name}</span>
          <span class="summary-teacher-status ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }

    body.innerHTML = `
      <div class="summary-month-label">${monthName}</div>
      <div class="summary-big-number">${filledCount}<span style="font-size:20px;color:var(--gray-400);font-weight:500">/${totalCount}</span></div>
      <div class="summary-big-label">pembimbing sudah mengisi penuh</div>
      
      <div class="summary-progress-wrap">
        <div class="summary-progress-bar">
          <div class="summary-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="summary-progress-text">
          <span>Progress</span>
          <span style="font-weight:600">${pct}%</span>
        </div>
      </div>

      <div class="summary-teacher-list">
        ${listHtml}
      </div>
    `;

  } catch (err) {
    body.innerHTML = `
      <div class="summary-empty-state">
        <div style="font-size:32px;margin-bottom:8px">⚠️</div>
        <div>Gagal memuat data</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:4px">${err.message}</div>
      </div>
    `;
  }
}

function sendTeacherReminder() {
  if (!window.lastAdminData || !window.lastAdminData.teacherStatus) {
    showToast('Data admin belum dimuat', 'error');
    return;
  }

  const teacherStatus = window.lastAdminData.teacherStatus;
  const lines = ['*Guru belum menyelesaikan absensi minggu ini*', ''];
  let hasIncomplete = false;

  for (const [name, status] of Object.entries(teacherStatus)) {
    if (status.filledDays < status.totalDays) {
      const remaining = status.totalDays - status.filledDays;
      lines.push(`${name} - ${remaining} Hari`);
      hasIncomplete = true;
    }
  }

  if (!hasIncomplete) {
    showToast('Semua guru sudah mengisi!', 'success');
    return;
  }

  const message = lines.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
  toggleAdminFab();
}

function sendAlphaAlert() {
  if (!window.lastAdminData || !window.lastAdminData.alphaAlerts) {
    showToast('Data admin belum dimuat', 'error');
    return;
  }

  const alphaAlerts = window.lastAdminData.alphaAlerts;
  if (alphaAlerts.length === 0) {
    showToast('Tidak ada siswa dengan status ALPHA', 'warning');
    return;
  }

  const lines = ['*Siswa dengan alpha*', ''];
  for (const alert of alphaAlerts) {
    lines.push(`${alert.nama} - ${alert.kelas || '-'} - ${alert.alphaCount} ALPHA`);
  }

  const message = lines.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
  toggleAdminFab();
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}
