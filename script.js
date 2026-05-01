// DOM elements (same as before)
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

// modals (time)
const timeModal = document.getElementById('timeModal');
const modalHours = document.getElementById('modalHours');
const modalMinutes = document.getElementById('modalMinutes');
const modalSeconds = document.getElementById('modalSeconds');
const modalConfirm = document.getElementById('modalConfirmBtn');
const modalCancel = document.getElementById('modalCancelBtn');

// marker modal
const markerModal = document.getElementById('markerModal');
const markerHours = document.getElementById('markerHours');
const markerMinutes = document.getElementById('markerMinutes');
const markerSecs = document.getElementById('markerSeconds');
const markerConfirm = document.getElementById('markerConfirmBtn');
const markerCancel = document.getElementById('markerCancelBtn');

// help
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// timeline canvas
const timelineCanvas = document.getElementById('timelineCanvas');

// state
let interval = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";
let pendingMarkers = [];    // each { seconds, color }
let hitMarkers = [];
let halfTriggered = false;

// helper functions
function formatTime(seconds) {
    const hrs = Math.floor(Math.abs(seconds) / 3600);
    const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.abs(seconds) % 60;
    return { hrs: hrs.toString().padStart(2,'0'), mins: mins.toString().padStart(2,'0'), secs: secs.toString().padStart(2,'0') };
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
    if (interval) { clearInterval(interval); interval = null; }
}
function playBeep(freq=880, dur=0.5) {
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
    } catch(e) {}
}
function finish() {
    stopTimer();
    playBeep(880, 1);
    flashColor('#dc2626');
    const timerDiv = document.querySelector('.timer');
    timerDiv.style.animation = 'none';
    timerDiv.offsetHeight;
    timerDiv.style.animation = 'pulse 0.5s 3';
    drawTimeline(); // redraw timeline when finished
}

// ---------- TIMELINE DRAWING (with red/yellow/green markers) ----------
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

    // draw base line
    ctx.beginPath();
    ctx.moveTo(10, height/2);
    ctx.lineTo(width-10, height/2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // calculate current progress (0..1)
    let progress = 0;
    if (mode === "down") {
        progress = (targetSeconds - remainingSeconds) / targetSeconds;
    } else {
        progress = remainingSeconds / targetSeconds;
    }
    progress = Math.min(1, Math.max(0, progress));

    // draw current position tick
    const currentX = 10 + progress * (width - 20);
    ctx.beginPath();
    ctx.arc(currentX, height/2, 6, 0, 2*Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(currentX, height/2, 3, 0, 2*Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // draw pending markers (color based on distance to current time)
    for (let marker of pendingMarkers) {
        const markerSec = marker.seconds;
        // marker position on timeline (0..1)
        let markerPos = markerSec / targetSeconds;
        const x = 10 + markerPos * (width - 20);
        // distance from current progress (absolute difference)
        const distance = Math.abs(progress - markerPos);
        let color;
        if (distance < 0.05) color = '#ef4444'; // red (very close)
        else if (distance < 0.15) color = '#eab308'; // yellow (approaching)
        else color = '#10b981'; // green (far)
        // draw flag (triangle)
        ctx.beginPath();
        ctx.moveTo(x, height/2 - 8);
        ctx.lineTo(x - 4, height/2);
        ctx.lineTo(x + 4, height/2);
        ctx.fillStyle = color;
        ctx.fill();
        // small circle at base
        ctx.beginPath();
        ctx.arc(x, height/2, 3, 0, 2*Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }
    // optional: also show hit markers as grayed out? (skip for simplicity)
}

// call drawTimeline whenever state changes that affects timeline
function updateTimelineAndUI() {
    updateDisplay();
    drawTimeline();
}

// modify tick to call drawTimeline after each second
function tick() {
    if (mode === "down") {
        remainingSeconds--;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds/2) {
            halfTriggered = true;
            flashColor('#eab308');
        }
        const markerHit = pendingMarkers.find(m => m.seconds === remainingSeconds);
        if (markerHit) triggerMarker(markerHit.seconds);
        if (remainingSeconds <= 0) { remainingSeconds = 0; finish(); }
    } else {
        remainingSeconds++;
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds >= targetSeconds/2) {
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
    drawTimeline();   // update timeline position and marker colors
}

// override start, setTimer, etc. to redraw timeline
function startTimer() {
    if (interval !== null) return;
    if (mode === "down" && remainingSeconds <= 0) return;
    flashColor('#10b981');
    interval = setInterval(tick, 1000);
    drawTimeline();
}
function pauseTimer() {
    if (interval === null) return;
    stopTimer();
    drawTimeline();
}
function setTimerFromHoursMinutesSeconds(hours, minutes, seconds) {
    if (interval) stopTimer();
    let h = parseInt(hours)||0, m = parseInt(minutes)||0, s = parseInt(seconds)||0;
    if (s > 59) s = 59;
    const total = h*3600 + m*60 + s;
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
    const hrs = Math.floor(curr/3600), mins = Math.floor((curr%3600)/60), secs = curr%60;
    setTimerFromHoursMinutesSeconds(hrs, mins, secs);
}

// marker rendering (unchanged, but call drawTimeline after any marker change)
function renderMarkerLists() {
    // ... (same as previous version) ...
    if (markerListDiv) {
        markerListDiv.innerHTML = '';
        pendingMarkers.sort((a,b) => a.seconds - b.seconds).forEach(m => {
            const p = formatTime(m.seconds);
            const timeStr = (p.hrs !== '00' ? `${p.hrs}:` : '') + `${p.mins}:${p.secs}`;
            const badge = document.createElement('div');
            badge.className = 'marker-badge';
            badge.style.backgroundColor = `${m.color}20`;
            badge.style.borderLeftColor = m.color;
            badge.style.borderLeftWidth = '3px';
            badge.style.borderLeftStyle = 'solid';
            badge.innerHTML = `
                🚩 ${timeStr}
                <input type="color" value="${m.color}" class="marker-color" data-sec="${m.seconds}">
                <button data-sec="${m.seconds}">✖</button>
            `;
            const colorPicker = badge.querySelector('.marker-color');
            colorPicker.addEventListener('input', (e) => {
                const newColor = e.target.value;
                const marker = pendingMarkers.find(mm => mm.seconds === m.seconds);
                if (marker) marker.color = newColor;
                renderMarkerLists();
                drawTimeline();
            });
            badge.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                pendingMarkers = pendingMarkers.filter(mx => mx.seconds !== m.seconds);
                renderMarkerLists();
                drawTimeline();
            });
            markerListDiv.appendChild(badge);
        });
    }
    if (reachedContainer) {
        reachedContainer.innerHTML = '';
        hitMarkers.forEach(sec => {
            const p = formatTime(sec);
            const timeStr = (p.hrs !== '00' ? `${p.hrs}:` : '') + `${p.mins}:${p.secs}`;
            const badge = document.createElement('div');
            badge.className = 'reached-badge';
            badge.textContent = `✅ ${timeStr}`;
            reachedContainer.appendChild(badge);
        });
    }
    drawTimeline();
}

function addMarker(hours, minutes, seconds, color = '#3b82f6') {
    let h = parseInt(hours)||0, m = parseInt(minutes)||0, s = parseInt(seconds)||0;
    if (s > 59) s = 59;
    const total = h*3600 + m*60 + s;
    if (total === 0) return;
    if (!pendingMarkers.some(mk => mk.seconds === total) && !hitMarkers.includes(total)) {
        pendingMarkers.push({ seconds: total, color: color });
        renderMarkerLists();
        drawTimeline();
    }
}
function clearAllMarkers() {
    pendingMarkers = [];
    hitMarkers = [];
    renderMarkerLists();
    drawTimeline();
}
function triggerMarker(markerSec) {
    const idx = pendingMarkers.findIndex(m => m.seconds === markerSec);
    if (idx === -1) return;
    const markerColor = pendingMarkers[idx].color;
    pendingMarkers = pendingMarkers.filter(m => m.seconds !== markerSec);
    if (!hitMarkers.includes(markerSec)) hitMarkers.push(markerSec);
    renderMarkerLists();
    if (markerIndicator) {
        markerIndicator.style.display = 'block';
        setTimeout(() => markerIndicator.style.display = 'none', 1500);
    }
    playBeep(1200, 0.3);
    flashColor(markerColor);
    drawTimeline();
}

// attach event listeners (same as before, but ensure drawTimeline called where needed)
setTimeBtn.addEventListener('click', openTimeModal);
resetBtn.addEventListener('click', () => {
    if (interval) stopTimer();
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    drawTimeline();
    document.querySelector('.timer').style.animation = '';
});
modalConfirm.addEventListener('click', () => {
    setTimerFromHoursMinutesSeconds(modalHours.value, modalMinutes.value, modalSeconds.value);
    closeTimeModal();
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });
setMarkerBtn.addEventListener('click', openMarkerModal);
markerConfirm.addEventListener('click', () => {
    addMarker(markerHours.value, markerMinutes.value, markerSecs.value);
    closeMarkerModal();
});
markerCancel.addEventListener('click', closeMarkerModal);
markerModal.addEventListener('click', (e) => { if (e.target === markerModal) closeMarkerModal(); });
clearMarkersBtn.addEventListener('click', clearAllMarkers);
modeToggleBtn.addEventListener('click', toggleMode);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);

function openTimeModal() {
    const curr = mode === "down" ? targetSeconds : remainingSeconds;
    modalHours.value = Math.floor(curr/3600);
    modalMinutes.value = Math.floor((curr%3600)/60);
    modalSeconds.value = curr%60;
    timeModal.style.display = 'flex';
    modalHours.focus();
}
function closeTimeModal() { timeModal.style.display = 'none'; }
function openMarkerModal() {
    markerHours.value = 0; markerMinutes.value = 0; markerSecs.value = 0;
    markerModal.style.display = 'flex';
    markerHours.focus();
}
function closeMarkerModal() { markerModal.style.display = 'none'; }
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    const closeHelp = () => helpModal.style.display = 'none';
    closeHelpBtn.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
}

// initial draw
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
drawTimeline();

// also draw on window resize
window.addEventListener('resize', () => { drawTimeline(); });
