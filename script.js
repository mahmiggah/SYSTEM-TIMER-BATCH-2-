// DOM elements
const timerDisplay = document.querySelector('.timer');
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

// Time modal
const timeModal = document.getElementById('timeModal');
const modalHours = document.getElementById('modalHours');
const modalMinutes = document.getElementById('modalMinutes');
const modalSeconds = document.getElementById('modalSeconds');
const modalConfirm = document.getElementById('modalConfirmBtn');
const modalCancel = document.getElementById('modalCancelBtn');

// Marker modal
const markerModal = document.getElementById('markerModal');
const markerHours = document.getElementById('markerHours');
const markerMinutes = document.getElementById('markerMinutes');
const markerSecs = document.getElementById('markerSeconds');
const markerConfirm = document.getElementById('markerConfirmBtn');
const markerCancel = document.getElementById('markerCancelBtn');

// Help modal
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

// Helper: flash color
function flashColor(color) {
    const originalColor = timerDisplay.style.color;
    timerDisplay.style.color = color;
    setTimeout(() => {
        timerDisplay.style.color = originalColor || '';
    }, 500);
}

// Format HH:MM:SS (hours only shown if >0)
function formatTime(seconds) {
    const hrs = Math.floor(Math.abs(seconds) / 3600);
    const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.abs(seconds) % 60;
    return {
        hours: hrs.toString().padStart(2, '0'),
        minutes: mins.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0')
    };
}

function updateDisplay() {
    const parts = formatTime(remainingSeconds);
    document.querySelector('.timer-hours').textContent = parts.hours;
    document.querySelector('.timer-minutes').textContent = parts.minutes;
    document.querySelector('.timer-seconds').textContent = parts.seconds;
}

function stopTimer() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

// Simple beep using Web Audio
function playBeep(frequency = 880, duration = 0.5) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function finish() {
    stopTimer();
    playBeep(880, 1);
    flashColor('#ff4444');
    timerDisplay.style.animation = 'none';
    timerDisplay.offsetHeight;
    timerDisplay.style.animation = 'pulse 0.5s 3';
}

// Marker list rendering
function renderMarkerLists() {
    if (markerListDiv) {
        markerListDiv.innerHTML = '';
        [...pendingMarkers].sort((a,b)=>a-b).forEach(sec => {
            const badge = document.createElement('div');
            badge.className = 'marker-badge';
            badge.innerHTML = `🚩 ${formatTime(sec)} <button data-time="${sec}">✖</button>`;
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
            const badge = document.createElement('div');
            badge.className = 'reached-badge';
            badge.textContent = `✅ ${formatTime(sec)}`;
            reachedContainer.appendChild(badge);
        });
    }
}

function addMarker(hours, minutes, seconds) {
    let hrs = parseInt(hours) || 0;
    let mins = parseInt(minutes) || 0;
    let secs = parseInt(seconds) || 0;
    if (secs > 59) secs = 59;
    const total = hrs * 3600 + mins * 60 + secs;
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
        // Halfway check (compare to targetSeconds / 2)
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds / 2) {
            halfTriggered = true;
            flashColor('#ffcc00');
        }
        if (pendingMarkers.includes(remainingSeconds)) {
            triggerMarker(remainingSeconds);
        }
        if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            finish();
        }
    } else { // count up
        remainingSeconds++;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds >= targetSeconds / 2) {
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
    let hrs = parseInt(hours) || 0;
    let mins = parseInt(minutes) || 0;
    let secs = parseInt(seconds) || 0;
    if (secs > 59) secs = 59;
    const total = hrs * 3600 + mins * 60 + secs;
    targetSeconds = total;
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    timerDisplay.style.animation = '';
}

function toggleMode() {
    mode = mode === "down" ? "up" : "down";
    modeToggleBtn.textContent = mode === "down" ? "⬇️ Count Down" : "⬆️ Count Up";
    const currentTotal = (mode === "down") ? targetSeconds : remainingSeconds;
    const hrs = Math.floor(currentTotal / 3600);
    const mins = Math.floor((currentTotal % 3600) / 60);
    const secs = currentTotal % 60;
    setTimerFromHoursMinutesSeconds(hrs, mins, secs);
}

// Time modal handlers
function openTimeModal() {
    const current = (mode === "down") ? targetSeconds : remainingSeconds;
    modalHours.value = Math.floor(current / 3600);
    modalMinutes.value = Math.floor((current % 3600) / 60);
    modalSeconds.value = current % 60;
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
    timerDisplay.style.animation = '';
});
modalConfirm.addEventListener('click', () => {
    setTimerFromHoursMinutesSeconds(modalHours.value, modalMinutes.value, modalSeconds.value);
    closeTimeModal();
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

// Marker modal handlers
function openMarkerModal() {
    markerHours.value = 0;
    markerMinutes.value = 0;
    markerSecs.value = 0;
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

// Help modal handlers
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
    const closeHelp = () => { helpModal.style.display = 'none'; };
    closeHelpBtn.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
}

// Mode, start, pause
modeToggleBtn.addEventListener('click', toggleMode);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);

// Initial values
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();

// Pulse keyframes
if (!document.querySelector('#timer-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'timer-pulse-style';
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); text-shadow: 0 0 0 white; }
            50% { transform: scale(1.08); text-shadow: 0 0 20px white; color: #ffaa66; }
            100% { transform: scale(1); text-shadow: 0 0 0 white; }
        }
    `;
    document.head.appendChild(style);
}