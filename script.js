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

const eventModal = document.getElementById('eventModal');
const eventHours = document.getElementById('eventHours');
const eventMinutes = document.getElementById('eventMinutes');
const eventSeconds = document.getElementById('eventSeconds');
const eventConfirm = document.getElementById('eventConfirmBtn');
const eventCancel = document.getElementById('eventCancelBtn');
const addEventBtn = document.getElementById('addEventBtn');
const eventsListDiv = document.getElementById('eventsList');

const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

const continueDescendingCheckbox = document.getElementById('continueDescending');
const prepIndicator = document.getElementById('prepIndicator');
const prepHoursInput = document.getElementById('prepHours');
const prepMinutesInput = document.getElementById('prepMinutes');
const prepSecondsInput = document.getElementById('prepSeconds');

const greenLight = document.querySelector('.light.green');
const yellowLight = document.querySelector('.light.yellow');
const redLight = document.querySelector('.light.red');
const timerDiv = document.querySelector('.timer');

// Timer state
let intervalId = null;
let remainingSeconds = 0;
let targetSeconds = 0;
let mode = "down";
let halfTriggered = false;
let finishNotified = false;
let zeroCrossed = false;
let events = [];

// Preparation state
let prepTimeSeconds = 0;
let isPreparing = false;
let originalMainRemaining = 0;
let originalTarget = 0;
let continueDescending = false;

// ---------- Load / save preferences ----------
function loadContinuePreference() {
    const saved = localStorage.getItem('continueDescending');
    if (saved !== null) continueDescending = (saved === 'true');
    if (continueDescendingCheckbox) continueDescendingCheckbox.checked = continueDescending;
}
function saveContinuePreference() {
    localStorage.setItem('continueDescending', continueDescending);
}
if (continueDescendingCheckbox) {
    continueDescendingCheckbox.addEventListener('change', () => {
        continueDescending = continueDescendingCheckbox.checked;
        saveContinuePreference();
    });
}

function loadPrepTime() {
    const saved = localStorage.getItem('prepTimeSeconds');
    if (saved !== null) prepTimeSeconds = parseInt(saved);
    if (prepHoursInput) {
        const hrs = Math.floor(prepTimeSeconds / 3600);
        const mins = Math.floor((prepTimeSeconds % 3600) / 60);
        const secs = prepTimeSeconds % 60;
        prepHoursInput.value = hrs;
        prepMinutesInput.value = mins;
        prepSecondsInput.value = secs;
    }
}
function savePrepTime() {
    localStorage.setItem('prepTimeSeconds', prepTimeSeconds);
}
if (prepHoursInput && prepMinutesInput && prepSecondsInput) {
    const updatePrep = () => {
        let h = parseInt(prepHoursInput.value) || 0;
        let m = parseInt(prepMinutesInput.value) || 0;
        let s = parseInt(prepSecondsInput.value) || 0;
        if (s > 59) s = 59;
        if (m > 59) m = 59;
        prepTimeSeconds = h * 3600 + m * 60 + s;
        savePrepTime();
    };
    prepHoursInput.addEventListener('change', updatePrep);
    prepMinutesInput.addEventListener('change', updatePrep);
    prepSecondsInput.addEventListener('change', updatePrep);
}

// Custom label persistence
const customLabel = document.getElementById('customLabel');
if (customLabel) {
    const savedLabel = localStorage.getItem('timerCustomLabel');
    if (savedLabel) customLabel.textContent = savedLabel;
    customLabel.addEventListener('blur', () => {
        localStorage.setItem('timerCustomLabel', customLabel.textContent);
    });
    customLabel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            customLabel.blur();
        }
    });
}

// ---------- Helper functions ----------
function formatTime(seconds) {
    const sign = seconds < 0 ? '-' : '';
    const absSecs = Math.abs(seconds);
    const hrs = Math.floor(absSecs / 3600);
    const mins = Math.floor((absSecs % 3600) / 60);
    const secs = absSecs % 60;
    return {
        hrs: (sign + hrs.toString().padStart(2, '0')).slice(-3),
        mins: mins.toString().padStart(2, '0'),
        secs: secs.toString().padStart(2, '0')
    };
}
function updateDisplay() {
    const parts = formatTime(remainingSeconds);
    timerHoursSpan.textContent = parts.hrs;
    timerMinutesSpan.textContent = parts.mins;
    timerSecondsSpan.textContent = parts.secs;

    if (mode === "down" && remainingSeconds < 0 && continueDescending) {
        timerDiv.style.color = '#ef4444';
    } else {
        timerDiv.style.color = '#0f172a';
    }
}

// Traffic light (based on time left)
function getTimeLeft() {
    if (mode === "down") return remainingSeconds;
    else return targetSeconds - remainingSeconds;
}
function getActiveEvent() {
    if (targetSeconds === 0 || events.length === 0) return null;
    const timeLeft = getTimeLeft();
    if (timeLeft < 0) return null;
    let candidate = null;
    for (let ev of events) {
        if (ev.timeSeconds >= timeLeft) {
            if (candidate === null || ev.timeSeconds < candidate.timeSeconds) candidate = ev;
        }
    }
    return candidate;
}
function updateTrafficLight() {
    greenLight.classList.remove('active');
    yellowLight.classList.remove('active');
    redLight.classList.remove('active');
    if (mode === "down" && remainingSeconds < 0 && continueDescending) {
        redLight.classList.add('active');
        return;
    }
    const active = getActiveEvent();
    if (!active) return;
    switch (active.color) {
        case 'green': greenLight.classList.add('active'); break;
        case 'yellow': yellowLight.classList.add('active'); break;
        case 'red': redLight.classList.add('active'); break;
    }
}

// Events management
function renderEventsList() {
    if (!eventsListDiv) return;
    eventsListDiv.innerHTML = '';
    events.sort((a,b) => a.timeSeconds - b.timeSeconds);
    events.forEach((ev, idx) => {
        const t = formatTime(ev.timeSeconds);
        const timeStr = (t.hrs !== '00' ? `${t.hrs}:` : '') + `${t.mins}:${t.secs}`;
        const div = document.createElement('div');
        div.className = 'event-item';
        div.innerHTML = `
            <div>
                <span class="color-badge ${ev.color}"></span>
                <span class="time">${timeStr}</span>
            </div>
            <button data-index="${idx}">✖</button>
        `;
        div.querySelector('button').addEventListener('click', () => {
            events.splice(idx, 1);
            renderEventsList();
            updateTrafficLight();
        });
        eventsListDiv.appendChild(div);
    });
}
function addEvent(hours, minutes, seconds, color) {
    let h = parseInt(hours) || 0;
    let m = parseInt(minutes) || 0;
    let s = parseInt(seconds) || 0;
    if (s > 59) s = 59;
    const totalSec = h * 3600 + m * 60 + s;
    if (totalSec === 0) return false;
    if (targetSeconds === 0) {
        alert('Please set a timer time first.');
        return false;
    }
    if (totalSec > targetSeconds) {
        alert('Event time cannot exceed timer duration.');
        return false;
    }
    events.push({ timeSeconds: totalSec, color: color });
    events.sort((a,b) => a.timeSeconds - b.timeSeconds);
    renderEventsList();
    updateTrafficLight();
    return true;
}
function openEventModal() {
    eventHours.value = 0;
    eventMinutes.value = 0;
    eventSeconds.value = 0;
    eventModal.style.display = 'flex';
    eventHours.focus();
}
function closeEventModal() { eventModal.style.display = 'none'; }
if (addEventBtn) addEventBtn.addEventListener('click', openEventModal);
eventConfirm.addEventListener('click', () => {
    const selectedColor = document.querySelector('input[name="eventColor"]:checked').value;
    addEvent(eventHours.value, eventMinutes.value, eventSeconds.value, selectedColor);
    closeEventModal();
});
eventCancel.addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (e) => { if (e.target === eventModal) closeEventModal(); });

// Timer core
function flashColor(color) {
    const original = timerDiv.style.color;
    timerDiv.style.color = color;
    setTimeout(() => { if (timerDiv.style.color === color) timerDiv.style.color = original; }, 400);
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

// Main timer tick
function tick() {
    if (intervalId === null) return;
    if (mode === "down") {
        if (remainingSeconds <= 0 && !continueDescending) {
            if (remainingSeconds === 0) {
                stopTimer();
                startPauseBtn.innerHTML = '▶ Start';
                if (!zeroCrossed) {
                    playBeep(880, 1);
                    showToast('⏰ Time\'s up!');
                    flashColor('#dc2626');
                    zeroCrossed = true;
                }
                updateTrafficLight();
                updateDisplay();
            }
            return;
        }
        remainingSeconds--;
        if (!zeroCrossed && remainingSeconds < 0) {
            zeroCrossed = true;
            playBeep(880, 1);
            showToast('⏰ Time\'s up! (continuing)');
            flashColor('#dc2626');
        }
        if (!halfTriggered && targetSeconds > 0 && remainingSeconds <= targetSeconds / 2 && remainingSeconds >= 0) {
            halfTriggered = true;
            flashColor('#eab308');
        }
    } else {
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

// Preparation tick (auto-starts main timer when done)
function tickPreparation() {
    if (intervalId === null) return;
    if (remainingSeconds <= 0) {
        // Preparation finished
        stopTimer();
        startPauseBtn.innerHTML = '▶ Start';
        isPreparing = false;
        if (prepIndicator) prepIndicator.style.display = 'none';
        // Restore original main timer values
        remainingSeconds = originalMainRemaining;
        targetSeconds = originalTarget;
        updateDisplay();
        // Auto-start main timer if it has positive remaining or ascending
        if ((mode === "down" && remainingSeconds > 0) || (mode === "up")) {
            // Use startTimer – it will now go to normal start because isPreparing is false
            flashColor('#10b981');
            intervalId = setInterval(tick, 1000);
            startPauseBtn.innerHTML = '⏸ Pause';
        }
        return;
    }
    remainingSeconds--;
    updateDisplay();
}

function startTimer() {
    if (intervalId !== null) return;
    if (mode === "down" && remainingSeconds <= 0 && !continueDescending) return;

    // If preparation is set and not already preparing
    if (prepTimeSeconds > 0 && !isPreparing && intervalId === null) {
        isPreparing = true;
        if (prepIndicator) prepIndicator.style.display = 'inline-block';
        originalMainRemaining = remainingSeconds;
        originalTarget = targetSeconds;
        remainingSeconds = prepTimeSeconds;
        targetSeconds = prepTimeSeconds; // temporary target for prep display
        updateDisplay();
        flashColor('#10b981');
        intervalId = setInterval(tickPreparation, 1000);
        startPauseBtn.innerHTML = '⏸ Pause';
        return;
    }

    // Normal start (no prep or prep already done)
    flashColor('#10b981');
    intervalId = setInterval(tick, 1000);
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
    if (isPreparing) {
        isPreparing = false;
        if (prepIndicator) prepIndicator.style.display = 'none';
    }
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
    zeroCrossed = false;
    updateDisplay();
    updateTrafficLight();
    timerDiv.style.color = '#0f172a';
}
function setModeFromRadios() {
    const selected = document.querySelector('input[name="countMode"]:checked').value;
    const newMode = selected === "up" ? "up" : "down";
    if (newMode !== mode) {
        mode = newMode;
        if (isPreparing) {
            isPreparing = false;
            if (prepIndicator) prepIndicator.style.display = 'none';
            stopTimer();
            startPauseBtn.innerHTML = '▶ Start';
        }
        if (mode === "down") remainingSeconds = targetSeconds;
        else remainingSeconds = 0;
        halfTriggered = false;
        finishNotified = false;
        zeroCrossed = false;
        updateDisplay();
        updateTrafficLight();
        timerDiv.style.color = '#0f172a';
    }
}
function resetTimer() {
    stopTimer();
    startPauseBtn.innerHTML = '▶ Start';
    if (isPreparing) {
        isPreparing = false;
        if (prepIndicator) prepIndicator.style.display = 'none';
        remainingSeconds = (mode === "down") ? targetSeconds : 0;
    } else {
        if (mode === "down") remainingSeconds = targetSeconds;
        else remainingSeconds = 0;
    }
    halfTriggered = false;
    finishNotified = false;
    zeroCrossed = false;
    updateDisplay();
    updateTrafficLight();
    timerDiv.style.color = '#0f172a';
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
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

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
    openSettingsModal();
});
modalCancel.addEventListener('click', closeTimeModal);
timeModal.addEventListener('click', (e) => { if (e.target === timeModal) closeTimeModal(); });

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

// ---------- Keyboard shortcuts ----------
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    switch (e.key) {
        case ' ':
        case 'Space':
            e.preventDefault();
            toggleStartPause();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            resetTimer();
            break;
        case 's':
        case 'S':
            e.preventDefault();
            openSettingsModal();
            break;
        case 'e':
        case 'E':
            e.preventDefault();
            if (typeof openEventModal === 'function') openEventModal();
            break;
    }
});

// ---------- Initialisation ----------
loadContinuePreference();
loadPrepTime();
remainingSeconds = 0;
targetSeconds = 0;
updateDisplay();
updateTrafficLight();
timerDiv.style.color = '#0f172a';
