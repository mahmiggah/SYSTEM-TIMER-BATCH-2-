// DOM elements
const timerHoursSpan = document.querySelector('.timer-hours');
const timerMinutesSpan = document.querySelector('.timer-minutes');
const timerSecondsSpan = document.querySelector('.timer-seconds');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const setTimeBtn = document.getElementById('setTimeBtn');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const setMarkerBtn = document.getElementById('setMarkerBtn');
const clearMarkersBtn = document.getElementById('clearMarkersBtn');
const markerIndicator = document.getElementById('markerIndicator');
const markerListDiv = document.getElementById('markerList');
const reachedContainer = document.getElementById('reachedMarkers');

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

// Timer state
let interval = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";
let pendingMarkers = [];
let hitMarkers = [];
let halfTriggered = false;

// Helper: format time to {hrs, mins, secs}
function formatTime(seconds) {
    const hrs = Math.floor(Math.abs(seconds) / 3600);
    const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.abs(seconds) % 60;
    return { hrs: hrs.toString().padStart(2, '0'), mins: mins.toString().padStart(2, '0'), secs: secs.toString().padStart(2, '0') };
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
    setTimeout(() => { timerDiv.style.color = original; }, 500);
}

function stopTimer() {
    if (interval) { clearInterval(interval); interval = null; }
}

function playBeep(freq = 880, dur = 0.5) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + dur);
        osc.stop(ctx.currentTime + dur);
    } catch(e) {}
}

function finish() {
    stopTimer();
    playBeep(880, 1);
    flashColor('#ff4444');
    const timerDiv = document.querySelector('.timer');
    timerDiv.style.animation = 'none';
    timerDiv.offsetHeight;
    timerDiv.style.animation = 'pulse 0.5s 3';
}

// Marker rendering
function renderMarkerLists() {
    if (markerListDiv) {
        markerListDiv.innerHTML = '';
        [...pendingMarkers].sort((a,b)=>a-b).forEach(sec => {
            const p = formatTime(sec);
            const timeStr = (p.hrs !== '00' ? `${p.hrs}:` : '') + `${p.mins}:${p.secs}`;
            const badge = document.createElement('div');
            badge.className = 'marker-badge';
            badge.innerHTML = `🚩 ${timeStr} <button data-time="${sec}">✖</button>`;
            badge.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                pendingMarkers = pendingMarkers.filter(m => m !== sec);
                renderMarkerLists();
            });
            markerListDiv.appendChild(badge);
        });
    }
    if (reachedContainer) {
        reachedContainer.innerHTML = '';
        [...hitMarkers].sort((a,b)=>a-b).forEach(sec => {
            const p = formatTime(sec);
            const timeStr = (p.hrs !== '00' ? `${p.hrs}:` : '') + `${p.mins}:${p.secs}`;
            const badge = document.createElement('div');
            badge.className = 'reached-badge';
            badge.textContent = `✅ ${timeStr}`;
            reachedContainer.appendChild(badge);
        });
    }
}

function addMarker(hours, minutes, seconds) {
    let h = parseInt(hours) || 0, m = parseInt(minutes) || 0, s = parseInt(seconds) || 0;
    if (s > 59) s = 59;
    const total = h*3600 + m*60 + s;
    if (total === 0) return;
    if (!pendingMarkers.includes(total) && !hitMarkers.includes(total)) {
        pendingMarkers.push(total);
        renderMarkerLists();
    }
}

function clearAllMarkers() {
    pendingMarkers = [];
    hitMarkers = [];
    renderMarkerLists();
}

function triggerMarker(markerSec) {
    if (!pendingMarkers.includes(markerSec)) return;
    pendingMarkers = pendingMarkers.filter(m => m !== markerSec);
    if (!hitMarkers.includes(markerSec)) {
        hitMarkers.push(markerSec);
        hitMarkers.sort((a,b)=>a-b);
    }
    renderMarkerLists();
    if (markerIndicator) {
        markerIndicator.style.display = 'block';
        setTimeout(() => { markerIndicator.style.display = 'none'; }, 1500);
    }
    playBeep(1200, 0.3);
}

// Timer core
function tick() {
    if (mode === "down") {
        remainingSeconds--;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds/2) {
            halfTriggered = true;
            flashColor('#ffcc00');
        }
        if (pendingMarkers.includes(remainingSeconds)) triggerMarker(remainingSeconds);
        if (remainingSeconds <= 0) { remainingSeconds = 0; finish(); }
    } else {
        remainingSeconds++;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds >= targetSeconds/2) {
            halfTriggered = true;
            flashColor('#ffcc00');
        }
        const triggered = pendingMarkers.filter(m => m <= remainingSeconds);
        triggered.forEach(m => triggerMarker(m));
        if (targetSeconds > 0 && remainingSeconds >= targetSeconds) {
            remainingSeconds = targetSeconds;
            finish();
        }
    }
    updateDisplay();
}

function startTimer() {
    if (interval !== null) return;
    if (mode === "down" && remainingSeconds <= 0) return;
    flashColor('#4caf50');
    interval = setInterval(tick, 1000);
}

function pauseTimer() {
    if (interval === null) return;
    stopTimer();
}

function setTimerFromHoursMinutesSeconds(hours, minutes, seconds) {
    if (interval) stopTimer();
    let h = parseInt(hours) || 0, m = parseInt(minutes) || 0, s = parseInt(seconds) || 0;
    if (s > 59) s = 59;
    const total = h*3600 + m*60 + s;
    targetSeconds = total;
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    document.querySelector('.timer').style.animation = '';
}

function toggleMode() {
    mode = mode === "down" ? "up" : "down";
    modeToggleBtn.textContent = mode === "down" ? "⬇️ Count Down" : "⬆️ Count Up";
    const curr = (mode === "down") ? targetSeconds : remainingSeconds;
    const hrs = Math.floor(curr/3600), mins = Math.floor((curr%3600)/60), secs = curr%60;
    setTimerFromHoursMinutesSeconds(hrs, mins, secs);
}

// Modal handlers
function openTimeModal() {
    const curr = (mode === "down") ? targetSeconds : remainingSeconds;
    modalHours.value = Math.floor(curr/3600);
    modalMinutes.value = Math.floor((curr%3600)/60);
    modalSeconds.value = curr%60;
    timeModal.style.display = 'flex';
    modalHours.focus();
}
function closeTimeModal() { timeModal.style.display = 'none'; }

setTimeBtn.addEventListener('click', openTimeModal);
resetBtn.addEventListener('click', () => {
    if (interval) stopTimer();
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    document.querySelector('.timer').style.animation = '';
});
modalConfirm.addEventListener('click', () => {
    setTimerFromHoursMinutesSeconds(modalHours.value, modalMinutes.value, modalSeconds.value);
    closeTimeModal();
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

function openMarkerModal() {
    markerHours.value = 0; markerMinutes.value = 0; markerSecs.value = 0;
    markerModal.style.display = 'flex';
    markerHours.focus();
}
function closeMarkerModal() { markerModal.style.display = 'none'; }

setMarkerBtn.addEventListener('click', openMarkerModal);
markerConfirm.addEventListener('click', () => {
    addMarker(markerHours.value, markerMinutes.value, markerSecs.value);
    closeMarkerModal();
});
markerCancel.addEventListener('click', closeMarkerModal);
markerModal.addEventListener('click', (e) => { if (e.target === markerModal) closeMarkerModal(); });
clearMarkersBtn.addEventListener('click', clearAllMarkers);

// Help modal
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
    const closeHelp = () => { helpModal.style.display = 'none'; };
    closeHelpBtn.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
}

// Listeners
modeToggleBtn.addEventListener('click', toggleMode);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);

// Initial values
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
