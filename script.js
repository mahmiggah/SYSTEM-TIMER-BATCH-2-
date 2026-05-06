// DOM elements
const timerHoursSpan = document.querySelector('.timer-hours');
const timerMinutesSpan = document.querySelector('.timer-minutes');
const timerSecondsSpan = document.querySelector('.timer-seconds');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');

const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const setTimeBtn = document.getElementById('setTimeBtn');
const modeRadios = document.querySelectorAll('input[name="countMode"]');

const timeModal = document.getElementById('timeModal');
const modalHours = document.getElementById('modalHours');
const modalMinutes = document.getElementById('modalMinutes');
const modalSeconds = document.getElementById('modalSeconds');
const modalConfirm = document.getElementById('modalConfirmBtn');
const modalCancel = document.getElementById('modalCancelBtn');

const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// Traffic lights
const greenLight = document.querySelector('.light.green');
const yellowLight = document.querySelector('.light.yellow');
const redLight = document.querySelector('.light.red');

// Threshold inputs
const yellowInput = document.getElementById('yellowThreshold');
const redInput = document.getElementById('redThreshold');

// Timer state
let intervalId = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";             // "down" or "up"
let halfTriggered = false;
let finishNotified = false;    // for ascending (toast once)

// Default thresholds (seconds left to trigger yellow / red)
let yellowThreshold = 10;
let redThreshold = 3;

// ---------- Load / save thresholds ----------
function loadThresholds() {
    const savedYellow = localStorage.getItem('yellowThreshold');
    const savedRed = localStorage.getItem('redThreshold');
    if (savedYellow !== null) yellowThreshold = parseInt(savedYellow);
    if (savedRed !== null) redThreshold = parseInt(savedRed);
    if (yellowInput) yellowInput.value = yellowThreshold;
    if (redInput) redInput.value = redThreshold;
}
function saveThresholds() {
    localStorage.setItem('yellowThreshold', yellowThreshold);
    localStorage.setItem('redThreshold', redThreshold);
}

// ---------- Helper functions ----------
function formatTime(seconds) {
    const absSecs = Math.abs(seconds);
    const hrs = Math.floor(absSecs / 3600);
    const mins = Math.floor((absSecs % 3600) / 60);
    const secs = absSecs % 60;
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
        greenLight.classList.remove('active');
        yellowLight.classList.remove('active');
        redLight.classList.remove('active');
        return;
    }

    if (mode === "down") {
        const remaining = remainingSeconds;
        if (remaining <= redThreshold && remaining >= 0) {
            greenLight.classList.remove('active');
            yellowLight.classList.remove('active');
            redLight.classList.add('active');
        } else if (remaining <= yellowThreshold) {
            greenLight.classList.remove('active');
            yellowLight.classList.add('active');
            redLight.classList.remove('active');
        } else {
            greenLight.classList.add('active');
            yellowLight.classList.remove('active');
            redLight.classList.remove('active');
        }
    } else {
        // Ascending: use the remaining time to reach target
        const remainingToTarget = targetSeconds - remainingSeconds;
        if (remainingToTarget <= redThreshold && remainingSeconds <= targetSeconds) {
            greenLight.classList.remove('active');
            yellowLight.classList.remove('active');
            redLight.classList.add('active');
        } else if (remainingToTarget <= yellowThreshold) {
            greenLight.classList.remove('active');
            yellowLight.classList.add('active');
            redLight.classList.remove('active');
        } else {
            greenLight.classList.add('active');
            yellowLight.classList.remove('active');
            redLight.classList.remove('active');
        }
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
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ---------- Timer core ----------
function tick() {
    if (intervalId === null) return;

    if (mode === "down") {
        if (remainingSeconds <= 0) return;
        remainingSeconds--;
        if (remainingSeconds === 0) {
            stopTimer();
            startPauseBtn.innerHTML = '▶ Start';
            playBeep(880, 1);
            showToast('⏰ Time\'s up!');
            flashColor('#dc2626');
            updateTrafficLight();
            updateDisplay();
            return;
        }
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds / 2) {
            halfTriggered = true;
            flashColor('#eab308');
        }
    } else { // ascending
        remainingSeconds++;
        if (!finishNotified && remainingSeconds >= targetSeconds && targetSeconds > 0) {
            finishNotified = true;
            playBeep(880, 1);
            showToast('⏰ Target reached – continuing');
            flashColor('#dc2626');
        }
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds >= targetSeconds / 2) {
            halfTriggered = true;
            flashColor('#eab308');
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
    finishNotified = false;
    updateDisplay();
    updateTrafficLight();
}
function setModeFromRadios() {
    const selected = document.querySelector('input[name="countMode"]:checked').value;
    const newMode = selected === "up" ? "up" : "down";
    if (newMode !== mode) {
        mode = newMode;
        if (mode === "down") remainingSeconds = targetSeconds;
        else remainingSeconds = 0;
        halfTriggered = false;
        finishNotified = false;
        updateDisplay();
        updateTrafficLight();
    }
}
function resetTimer() {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    if (mode === "down") remainingSeconds = targetSeconds;
    else remainingSeconds = 0;
    halfTriggered = false;
    finishNotified = false;
    updateDisplay();
    updateTrafficLight();
}

// ---------- Modal handlers ----------
function openSettingsModal() {
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
    openSettingsModal(); // return to settings modal
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

// Threshold listeners
if (yellowInput && redInput) {
    yellowInput.addEventListener('change', () => {
        yellowThreshold = parseInt(yellowInput.value) || 0;
        saveThresholds();
        updateTrafficLight();
    });
    redInput.addEventListener('change', () => {
        redThreshold = parseInt(redInput.value) || 0;
        saveThresholds();
        updateTrafficLight();
    });
}

modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        setModeFromRadios();
    });
});

resetBtn.addEventListener('click', resetTimer);
startPauseBtn.addEventListener('click', toggleStartPause);

// Help modal
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    closeHelpBtn.addEventListener('click', () => helpModal.style.display = 'none');
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });
}

// Initial
loadThresholds();
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
updateTrafficLight();
