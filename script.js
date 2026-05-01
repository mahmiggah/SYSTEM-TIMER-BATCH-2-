// ---------- DOM elements ----------
const timerHoursSpan = document.querySelector('.timer-hours');
const timerMinutesSpan = document.querySelector('.timer-minutes');
const timerSecondsSpan = document.querySelector('.timer-seconds');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const setTimeBtn = document.getElementById('setTimeBtn');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const setMarkerBtn = document.getElementById('setMarkerBtn');
const clearMarkersBtn = document.getElementById('clearMarkersBtn');
const timelineCanvas = document.getElementById('timelineCanvas');

// Modals
const timeModal = document.getElementById('timeModal');
const modalHours = document.getElementById('modalHours');
const modalMinutes = document.getElementById('modalMinutes');
const modalSeconds = document.getElementById('modalSeconds');
const modalConfirm = document.getElementById('modalConfirmBtn');
const modalCancel = document.getElementById('modalCancelBtn');

const markerModal = document.getElementById('markerModal');
const markerHours = document.getElementById('markerHours');
const markerMinutes = document.getElementById('markerMinutes');
const markerSecs = document.getElementById('markerSeconds');
const markerConfirm = document.getElementById('markerConfirmBtn');
const markerCancel = document.getElementById('markerCancelBtn');

const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// ---------- Timer state ----------
let intervalId = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";              // "down" or "up"
let pendingMarkers = [];        // { seconds, colorHex }
let halfTriggered = false;

// ---------- Helper functions ----------
function formatTime(seconds) {
    const hrs = Math.floor(Math.abs(seconds) / 3600);
    const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.abs(seconds) % 60;
    return {
        hrs: hrs.toString().padStart(2, '0'),
        mins: mins.toString().padStart(2, '0'),
        secs: secs.toString().padStart(2, '0')
    };
}
function updateDisplay() {
    const parts = formatTime(remainingSeconds);
    timerHoursSpan.textContent = parts.hrs;
    timerMinutesSpan.textContent = parts.mins;
    timerSecondsSpan.textContent = parts.secs;
}
function flashColor(color) {
    const timerDiv = document.querySelector('.timer');
    const original = timerDiv.style.color;
    timerDiv.style.color = color;
    setTimeout(() => timerDiv.style.color = original, 400);
}
function stopTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
function playBeep(freq = 880, dur = 0.5) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.2;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + dur);
        osc.stop(ctx.currentTime + dur);
    } catch (e) {}
}
function finish() {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    playBeep(880, 1);
    flashColor('#dc2626');
    const timerDiv = document.querySelector('.timer');
    timerDiv.style.animation = 'none';
    timerDiv.offsetHeight;
    timerDiv.style.animation = 'pulse 0.5s 3';
    drawTimeline();
}
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ---------- Timeline drawing ----------
function drawTimeline() {
    if (!timelineCanvas) return;
    const canvas = timelineCanvas;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = rect.width;
    const height = 50;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    if (targetSeconds === 0) return;

    ctx.beginPath();
    ctx.moveTo(10, height / 2);
    ctx.lineTo(width - 10, height / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    let progress = (mode === "down")
        ? (targetSeconds - remainingSeconds) / targetSeconds
        : remainingSeconds / targetSeconds;
    progress = Math.min(1, Math.max(0, progress));
    const currentX = 10 + progress * (width - 20);
    ctx.beginPath();
    ctx.arc(currentX, height / 2, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(currentX, height / 2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    for (let marker of pendingMarkers) {
        const markerPos = marker.seconds / targetSeconds;
        const x = 10 + markerPos * (width - 20);
        ctx.beginPath();
        ctx.moveTo(x, height / 2 - 8);
        ctx.lineTo(x - 4, height / 2);
        ctx.lineTo(x + 4, height / 2);
        ctx.fillStyle = marker.colorHex;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, height / 2, 3, 0, 2 * Math.PI);
        ctx.fillStyle = marker.colorHex;
        ctx.fill();
    }
}

// ---------- Marker management ----------
function addMarker(hours, minutes, seconds, colorHex) {
    let h = parseInt(hours) || 0;
    let m = parseInt(minutes) || 0;
    let s = parseInt(seconds) || 0;
    if (s > 59) s = 59;
    const totalSec = h * 3600 + m * 60 + s;
    if (totalSec === 0) return;
    if (targetSeconds === 0) {
        alert('Please set a timer time first.');
        return;
    }
    if (pendingMarkers.some(mk => mk.seconds === totalSec)) return;
    if (totalSec > targetSeconds) {
        alert('Marker time exceeds timer duration.');
        return;
    }
    pendingMarkers.push({ seconds: totalSec, colorHex });
    pendingMarkers.sort((a, b) => a.seconds - b.seconds);
    drawTimeline();
}
function clearAllMarkers() {
    pendingMarkers = [];
    drawTimeline();
}
function triggerMarker(markerSec) {
    const idx = pendingMarkers.findIndex(m => m.seconds === markerSec);
    if (idx === -1) return;
    const marker = pendingMarkers[idx];
    console.log(`Triggering marker at ${markerSec} seconds, color: ${marker.colorHex}`);
    const timeStr = formatTime(marker.seconds);
    const formatted = `${timeStr.hrs}:${timeStr.mins}:${timeStr.secs}`;
    showToast(`✅ Marker reached: ${formatted}`);
    pendingMarkers.splice(idx, 1);
    drawTimeline();
    playBeep(1200, 0.3);
    flashColor(marker.colorHex);
}

// ---------- Timer core ----------
function tick() {
    if (intervalId === null) return;

    if (mode === "down") {
        if (remainingSeconds <= 0) {
            finish();
            return;
        }
        remainingSeconds--;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds / 2) {
            halfTriggered = true;
            flashColor('#eab308');
        }
        const markerHit = pendingMarkers.find(m => m.seconds === remainingSeconds);
        if (markerHit) {
             console.log(`Tick at ${remainingSeconds}, marker found:`, markerHit);
             triggerMarker(markerHit.seconds);
         }
    } else {
        if (targetSeconds > 0 && remainingSeconds >= targetSeconds) {
            finish();
            return;
        }
        remainingSeconds++;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds >= targetSeconds / 2) {
            halfTriggered = true;
            flashColor('#eab308');
        }
        const triggered = pendingMarkers.filter(m => m.seconds <= remainingSeconds);
        triggered.forEach(m => triggerMarker(m.seconds));
        if (targetSeconds > 0 && remainingSeconds >= targetSeconds) {
            remainingSeconds = targetSeconds;
            finish();
        }
    }
    updateDisplay();
    drawTimeline();
}
function startTimer() {
    if (intervalId !== null) return;
    if (mode === "down" && remainingSeconds <= 0) return;
    flashColor('#10b981');
    intervalId = setInterval(() => tick(), 1000);
    startPauseBtn.innerHTML = '⏸ Pause';
}
function pauseTimer() {
    if (intervalId === null) return;
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    drawTimeline();
}
function toggleStartPause() {
    if (intervalId === null) {
        startTimer();
    } else {
        pauseTimer();
    }
}
function setTimerFromHoursMinutesSeconds(hours, minutes, seconds) {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    let h = parseInt(hours) || 0;
    let m = parseInt(minutes) || 0;
    let s = parseInt(seconds) || 0;
    if (s > 59) s = 59;
    const total = h * 3600 + m * 60 + s;
    targetSeconds = total;
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    drawTimeline();
    document.querySelector('.timer').style.animation = '';
}
function toggleMode() {
    mode = mode === "down" ? "up" : "down";
    modeToggleBtn.textContent = mode === "down" ? "⬇️ Count Down" : "⬆️ Count Up";
    const curr = mode === "down" ? targetSeconds : remainingSeconds;
    const hrs = Math.floor(curr / 3600);
    const mins = Math.floor((curr % 3600) / 60);
    const secs = curr % 60;
    setTimerFromHoursMinutesSeconds(hrs, mins, secs);
}

// ---------- Modal handlers ----------
function openTimeModal() {
    const curr = mode === "down" ? targetSeconds : remainingSeconds;
    modalHours.value = Math.floor(curr / 3600);
    modalMinutes.value = Math.floor((curr % 3600) / 60);
    modalSeconds.value = curr % 60;
    timeModal.style.display = 'flex';
    modalHours.focus();
}
function closeTimeModal() { timeModal.style.display = 'none'; }
setTimeBtn.addEventListener('click', openTimeModal);
resetBtn.addEventListener('click', () => {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    drawTimeline();
    document.querySelector('.timer').style.animation = '';
    document.querySelector('.timer').style.color = '';
});
modalConfirm.addEventListener('click', () => {
    setTimerFromHoursMinutesSeconds(modalHours.value, modalMinutes.value, modalSeconds.value);
    closeTimeModal();
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

function openMarkerModal() {
    if (targetSeconds === 0) {
        alert('Please set a timer time first.');
        return;
    }
    markerHours.value = 0;
    markerMinutes.value = 0;
    markerSecs.value = 0;
    markerModal.style.display = 'flex';
    markerHours.focus();
}
function closeMarkerModal() { markerModal.style.display = 'none'; }
setMarkerBtn.addEventListener('click', openMarkerModal);
markerConfirm.addEventListener('click', () => {
    const selectedColor = document.querySelector('input[name="markerColor"]:checked').value;
    addMarker(markerHours.value, markerMinutes.value, markerSecs.value, selectedColor);
    closeMarkerModal();
});
markerCancel.addEventListener('click', closeMarkerModal);
markerModal.addEventListener('click', (e) => { if (e.target === markerModal) closeMarkerModal(); });
clearMarkersBtn.addEventListener('click', clearAllMarkers);

// Help modal
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    const closeHelp = () => helpModal.style.display = 'none';
    closeHelpBtn.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
}

// ---------- Event listeners ----------
modeToggleBtn.addEventListener('click', toggleMode);
startPauseBtn.addEventListener('click', toggleStartPause);

// ---------- Initial values ----------
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
drawTimeline();

window.addEventListener('resize', () => drawTimeline());
