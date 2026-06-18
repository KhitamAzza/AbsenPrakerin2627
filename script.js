    // ===== CONFIG =====
    const API_URL = 'https://script.google.com/macros/s/AKfycbx5bGE6_bB2ttsYgIfK5nmEq2tDIrnLoKrRl2GgMBvC_08_6ESD6Pzaz-tLk-5TDyA39g/exec'; // GANTI INI

    const TEACHERS = {
      "pembizen": "Masduki Zen, S.Kom",
      "pembiretma": "Retma Fahriza Mahrita, S. Pd., Gr",
      "pembirahmat": "Rahmat Hidayat, S.Kom",
      "pembihurin": "Hurin Vita Kurnia, S.Pd",
      "pembivisabel": "Visa Bella Valentine, A.Md, Par",
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
      "panitiaprakerin2627": "ADMIN"
    };

    const ADMIN_PASSWORD = "panitiaprakerin2627";
    const STATUS_OPTIONS = ["ALPHA", "HADIR", "IZIN", "SAKIT", "LIBUR"];
    const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const DAY_SHORT = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];

    // ===== STATE =====
    let currentPassword = null;
    let currentTeacherName = null;
    let isAdmin = false;
    let students = [];
    let currentIndex = 0;
    let currentWeekStart = null;
    let selectedDate = null; // Date object
    let selectedDayNum = null; // string "1", "2", etc.
    let pendingChanges = {}; // key: "nama|day" -> status
    let monthData = {}; // key: nama -> { day: status }
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
    function getMonday(d) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

    // ===== LOAD DATA =====
    async function loadAttendanceData() {
      try {
        document.getElementById('teacherDisplay').textContent = currentTeacherName;

        // Load students
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

        // Load attendance for current month
        const now = new Date();
        const monthName = getMonthSheetName(now);
        const resAtt = await fetch(`${API_URL}?action=attendance&month=${encodeURIComponent(monthName)}`);
        const dataAtt = await resAtt.json();

        if (dataAtt.status === 'ok' && dataAtt.data) {
          monthData = dataAtt.data;
        }

        // Init week
        currentWeekStart = getMonday(now);
        selectedDate = new Date(now);
        selectedDayNum = now.getDate().toString();

        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('attendanceScreen').style.display = 'block';

        renderWeekChips();
        renderStudentCard();
        showToast(`Selamat datang, ${currentTeacherName}! ${students.length} siswa ditemukan`, 'success');

      } catch (err) {
        showToast('Error: ' + err.message, 'error');
        console.error(err);
      }
    }

    // ===== WEEK CHIPS =====
    function renderWeekChips() {
      const container = document.getElementById('weekChips');
      const label = document.getElementById('weekLabel');
      const today = new Date();
      const endOfWeek = new Date(currentWeekStart);
      endOfWeek.setDate(currentWeekStart.getDate() + 6);

      label.textContent = formatDateLabel(currentWeekStart, endOfWeek);

      // Disable next week if it's in the future
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);
      document.getElementById('nextWeek').disabled = nextWeekStart > today;

      let html = '';
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        const dayNum = d.getDate().toString();
        const isToday = isSameDay(d, today);
        const isFuture = d > today;
        const isSelected = isSameDay(d, selectedDate);

        // Check status for current student
        let dotClass = '';
        let dotTitle = '';
        if (students[currentIndex]) {
          const nama = students[currentIndex].nama;
          const pendingKey = `${nama}|${dayNum}`;
          const pendingStatus = pendingChanges[pendingKey];
          const savedStatus = monthData[nama] ? monthData[nama][dayNum] : null;
          const effectiveStatus = pendingStatus !== undefined ? pendingStatus : savedStatus;

          if (effectiveStatus && effectiveStatus !== 'ALPHA') {
            dotClass = 'filled';
            dotTitle = effectiveStatus;
          } else if (effectiveStatus === 'ALPHA' && savedStatus === 'ALPHA') {
            dotClass = 'pending'; // Explicitly marked ALPHA
            dotTitle = 'ALPHA';
          }
        }

        const chipClass = [
          'day-chip',
          isToday ? 'today' : '',
          isSelected ? 'selected' : '',
          isFuture ? 'future' : ''
        ].filter(Boolean).join(' ');

        html += `
          <div class="${chipClass}" onclick="selectDate(${i})" title="${dotTitle}">
            <div class="day-name">${DAY_SHORT[i]}</div>
            <div class="day-num">${d.getDate()}</div>
            <div class="day-dot ${dotClass}"></div>
          </div>
        `;
      }
      container.innerHTML = html;
    }

    function selectDate(index) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + index);
      const today = new Date();

      if (d > today) {
        showToast('Tidak bisa mengisi tanggal mendatang', 'warning');
        return;
      }

      selectedDate = d;
      selectedDayNum = d.getDate().toString();
      renderWeekChips();
      updateStatusSelect();
    }

    function changeWeek(dir) {
      const today = new Date();
      const newStart = new Date(currentWeekStart);
      newStart.setDate(currentWeekStart.getDate() + (dir * 7));

      // Don't allow future weeks
      if (dir > 0) {
        const nextWeekEnd = new Date(newStart);
        nextWeekEnd.setDate(newStart.getDate() + 6);
        if (newStart > today) return;
      }

      currentWeekStart = newStart;

      // If selected date is outside new week, select today or last available
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      if (selectedDate < currentWeekStart || selectedDate > weekEnd) {
        if (today >= currentWeekStart && today <= weekEnd) {
          selectedDate = new Date(today);
        } else {
          selectedDate = new Date(weekEnd);
        }
        selectedDayNum = selectedDate.getDate().toString();
      }

      renderWeekChips();
      updateStatusSelect();
    }

    // ===== STUDENT CARD =====
    function renderStudentCard() {
      if (students.length === 0) return;
      const s = students[currentIndex];
      const card = document.getElementById('studentCard');

      // Photo
      const wrapper = document.getElementById('photoWrapper');
      if (s.photoUrl) {
        wrapper.innerHTML = `<img class="student-photo" src="${s.photoUrl}" alt="${s.nama}" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\'photo-placeholder\'>👤</div>'">`;
      } else {
        wrapper.innerHTML = `<div class="photo-placeholder">👤</div>`;
      }

      document.getElementById('studentNama').textContent = s.nama;
      document.getElementById('studentKelas').textContent = s.kelas || '-';
      document.getElementById('studentDudi').textContent = s.dudi ? `DUDI: ${s.dudi}` : '';
      document.getElementById('studentPembimbing').textContent = s.pembimbing ? `Pembimbing: ${s.pembimbing}` : '';
      document.getElementById('studentCounter').textContent = `${currentIndex + 1} / ${students.length}`;

      updateStatusSelect();
      renderWeekChips(); // Update dots
    }

    function updateStatusSelect() {
      if (!students[currentIndex]) return;
      const nama = students[currentIndex].nama;
      const pendingKey = `${nama}|${selectedDayNum}`;
      const pendingStatus = pendingChanges[pendingKey];
      const savedStatus = monthData[nama] ? monthData[nama][selectedDayNum] : null;
      // Empty/undefined savedStatus = never filled, display as ALPHA
      const effectiveStatus = pendingStatus !== undefined ? pendingStatus : (savedStatus || 'ALPHA');

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
      else select.classList.add('status-alpha');
    }

    function handleStatusChange(value) {
      if (!students[currentIndex]) return;
      const nama = students[currentIndex].nama;
      const key = `${nama}|${selectedDayNum}`;
      const savedStatus = monthData[nama] ? monthData[nama][selectedDayNum] : null;

      // Always write explicit value, even ALPHA
      // This distinguishes "never filled" (empty) from "explicitly marked ALPHA"
      if (value === savedStatus) {
        delete pendingChanges[key]; // No change needed
      } else {
        pendingChanges[key] = value;
      }

      updateSelectColor(document.getElementById('statusSelect'));
      updatePendingCount();
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
      if (isAnimating) return;
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });

    cardContainer.addEventListener('touchmove', (e) => {
      if (!isSwiping || isAnimating) return;
      const diff = touchStartX - e.touches[0].clientX;
      const card = document.getElementById('studentCard');
      if (Math.abs(diff) > 10) {
        card.style.transform = `translateX(${-diff * 0.3}px)`;
      }
    }, { passive: true });

    cardContainer.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
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
      if (isAnimating) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    });

    function goNext() {
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
        card.classList.add('slide-in');
        renderStudentCard();
        setTimeout(() => {
          card.classList.remove('slide-in');
          isAnimating = false;
        }, 300);
      }, 300);
    }

    function goPrev() {
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
        card.classList.add('slide-in');
        renderStudentCard();
        setTimeout(() => {
          card.classList.remove('slide-in');
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

      // Only show CURRENT WEEK (Monday to Sunday), up to today
      const weekStart = getMonday(today);
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const daysPassed = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Tue=1, ..., Sun=6

      for (let w = 0; w <= daysPassed; w++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + w);
        const dayStr = d.getDate().toString();
        const pendingKey = `${nama}|${dayStr}`;
        const pendingStatus = pendingChanges[pendingKey];
        const savedStatus = monthData[nama] ? monthData[nama][dayStr] : null;
        // Empty/undefined = never filled, display as ALPHA
        const effectiveStatus = pendingStatus !== undefined ? pendingStatus : (savedStatus || 'ALPHA');

        const dayName = DAY_SHORT[w]; // w=0 is Monday, w=1 is Tuesday, etc.

        html += `
          <div class="batch-row">
            <div class="batch-date">${dayName}, ${d.getDate()}</div>
            <select class="batch-select" onchange="updateBatchStatus('${dayStr}', this.value)">
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

      if (value === savedStatus) {
        delete pendingChanges[key];
      } else {
        pendingChanges[key] = value;
      }

      updatePendingCount();
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

          // Update local monthData
          for (const entry of attendance) {
            if (!monthData[entry.nama]) monthData[entry.nama] = {};
            monthData[entry.nama][entry.day] = entry.status;
          }

          pendingChanges = {};
          updatePendingCount();
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
      // Teacher status - CURRENT WEEK
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

      // Add summary header
      const summaryHtml = `<div style="font-size:13px;color:var(--gray-500);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--gray-100);">
        ${filledTeachers} dari ${totalTeachers} pembimbing sudah mengisi minggu ini
      </div>`;
      teacherList.innerHTML = summaryHtml + (teacherHtml || '<div style="color:var(--gray-400);font-size:13px;text-align:center;">Belum ada data</div>');

      // ALPHA alert - only EXPLICIT ALPHA (not KOSONG)
      const alphaList = document.getElementById('alphaAlertList');
      let alphaHtml = '';

      if (data.alphaAlerts && data.alphaAlerts.length > 0) {
        for (const alert of data.alphaAlerts) {
          const kosongText = alert.kosongCount > 0 ? `<span style="color:var(--gray-400)"> +${alert.kosongCount} kosong</span>` : '';
          alphaHtml += `
            <div class="alpha-row">
              <img class="alpha-photo" src="${alert.photo || ''}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
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
        alphaHtml = '<div style="color:var(--gray-400);font-size:13px;text-align:center;">Tidak ada siswa dengan status ALPHA</div>';
      }
      alphaList.innerHTML = alphaHtml;
    }

    // ===== TOAST =====
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
