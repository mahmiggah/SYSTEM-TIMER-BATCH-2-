// DOM elements
const timerHoursSpan = document.querySelector('.timer-hours');
const timerMinutesSpan = document.querySelector('.timer-minutes');
const timerSecondsSpan = document.querySelector('.timer-seconds');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Settings modal and its buttons
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const setTimeBtn = document.getElementById('setTimeBtn');
const modeRadios = document.querySelectorAll('input[name="countMode"]');

// Time modal
const timeModal = document.getElementById('timeModal');
const modalHours = document.getElementById('modalHours');
const modalMinutes = document.getElementById('modalMinutes');
const modalSeconds = document.getElementById('modalSeconds');
const modalConfirm = document.getElementById('modalConfirmBtn');
const modalCancel = document.getElementById('modalCancelBtn');

// Help modal
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// Traffic lights
const redLight = document.querySelector('.light.red');
const yellowLight = document.querySelector('.light.yellow');
const greenLight = document.querySelector('.light.green');

// Timer state
let intervalId = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";          // "down" = descending, "up" = ascending
let halfTriggered = false;

// Helper functions
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

function updateTrafficLight() {
    if (targetSeconds === 0) {
        // no time set, turn all off? keep green active? we'll default to green off.
        redLight.classList.remove('active');
        yellowLight.classList.remove('active');
        greenLight.classList.remove('active');
        return;
    }
    let progress;
    if (mode === "down") {
        progress = (targetSeconds - remainingSeconds) / targetSeconds;
    } else {
        progress = remainingSeconds / targetSeconds;
    }
    progress = Math.min(1, Math.max(0, progress));
    // Green: 0 - 0.33, Yellow: 0.33 - 0.66, Red: 0.66 - 1
    if (progress < 0.33) {
        greenLight.classList.add('active');
        yellowLight.classList.remove('active');
        redLight.classList.remove('active');
    } else if (progress < 0.66) {
        greenLight.classList.remove('active');
        yellowLight.classList.add('active');
        redLight.classList.remove('active');
    } else {
        greenLight.classList.remove('active');
        yellowLight.classList.remove('active');
        redLight.classList.add('active');
    }
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
    updateTrafficLight();
}
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Timer core
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
        if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            finish();
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
        if (targetSeconds > 0 && remainingSeconds >= targetSeconds) {
            remainingSeconds = targetSeconds;
            finish();
        }
    }
    updateDisplay();
    updateTrafficLight();
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
}
function toggleStartPause() {
    if (intervalId === null) startTimer();
    else pauseTimer();
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
    updateTrafficLight();
}
function setModeFromRadios() {
    const selected = document.querySelector('input[name="countMode"]:checked').value;
    const newMode = selected === "up" ? "up" : "down";
    if (newMode !== mode) {
        mode = newMode;
        // Adjust remainingSeconds based on new mode but keep same target
        if (mode === "down") remainingSeconds = targetSeconds;
        else remainingSeconds = 0;
        halfTriggered = false;
        updateDisplay();
        updateTrafficLight();
    }
}

// Modal handlers
function openSettingsModal() {
    // Sync radio buttons with current mode
    const radioToCheck = mode === "down" ? document.querySelector('input[value="down"]') : document.querySelector('input[value="up"]');
    if (radioToCheck) radioToCheck.checked = true;
    settingsModal.style.display = 'flex';
}
function closeSettingsModal() { settingsModal.style.display = 'none'; }
settingsBtn.addEventListener('click', openSettingsModal);
closeSettingsBtn.addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});

// Set Time button inside settings modal: open time modal but keep settings open? Actually we'll close settings, open time, and after confirm reopen settings.
setTimeBtn.addEventListener('click', () => {
    closeSettingsModal();
    openTimeModal();
});
function openTimeModal() {
    const curr = mode === "down" ? targetSeconds : remainingSeconds;
    modalHours.value = Math.floor(curr / 3600);
    modalMinutes.value = Math.floor((curr % 3600) / 60);
    modalSeconds.value = curr % 60;
    timeModal.style.display = 'flex';
    modalHours.focus();
}
function closeTimeModal() { timeModal.style.display = 'none'; }
modalConfirm.addEventListener('click', () => {
    setTimerFromHoursMinutesSeconds(modalHours.value, modalMinutes.value, modalSeconds.value);
    closeTimeModal();
    openSettingsModal(); // return to settings modal after setting time
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

// Mode radio change: apply immediately and keep settings open
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        setModeFromRadios();
    });
});

resetBtn.addEventListener('click', () => {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    updateDisplay();
    updateTrafficLight();
});

startPauseBtn.addEventListener('click', toggleStartPause);

// Help modal
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    closeHelpBtn.addEventListener('click', () => helpModal.style.display = 'none');
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });
}

// Initial
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
updateTrafficLight();
