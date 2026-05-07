// DOM elements (unchanged)
const timerHoursSpan = document.querySelector('.timer-hours');
const timerMinutesSpan = document.querySelector('.timer-minutes');
const timerSecondsSpan = document.querySelector('.timer-seconds');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const menuBtn = document.getElementById('menuBtn');
const helpBtn = document.getElementById('helpBtn');

// ... (all other DOM element declarations remain same) ...

// Timer core functions with icon-only button text

function finish() {
    stopTimer();
    startPauseBtn.innerHTML = '▶';
    playBeep(880, 1);
    flashColor('#dc2626');
    const timerDiv = document.querySelector('.timer');
    timerDiv.style.animation = 'none';
    timerDiv.offsetHeight;
    timerDiv.style.animation = 'pulse 0.5s 3';
    updateTrafficLight();
    updateDisplay();
}

function tickPreparation() {
    if (intervalId === null) return;
    if (currentPrepSeconds <= 0) {
        stopTimer();
        startPauseBtn.innerHTML = '▶';
        isPreparing = false;
        preparationUsed = true;
        if (prepTimerDisplay) prepTimerDisplay.style.display = 'none';
        if (prepIndicator) prepIndicator.style.display = 'none';
        remainingSeconds = originalMainRemaining;
        targetSeconds = originalTarget;
        updateDisplay();
        updateTrafficLight();
        return;
    }
    currentPrepSeconds--;
    updatePrepDisplay(currentPrepSeconds);
}

function startMainTimer() {
    if (intervalId !== null) return;
    if (mode === "down" && remainingSeconds <= 0 && !continueDescending) return;
    flashColor('#10b981');
    intervalId = setInterval(tick, 1000);
    startPauseBtn.innerHTML = '⏸';
}
function startTimer() {
    if (intervalId !== null) return;
    if (mode === "down" && remainingSeconds <= 0 && !continueDescending) return;

    if (prepTimeSeconds > 0 && !isPreparing && !preparationUsed && !intervalId) {
        isPreparing = true;
        originalMainRemaining = remainingSeconds;
        originalTarget = targetSeconds;
        currentPrepSeconds = prepTimeSeconds;
        if (prepTimerDisplay) {
            prepTimerDisplay.style.display = 'inline-block';
            updatePrepDisplay(currentPrepSeconds);
        }
        if (prepIndicator) prepIndicator.style.display = 'inline-block';
        updateDisplay();
        flashColor('#10b981');
        intervalId = setInterval(tickPreparation, 1000);
        startPauseBtn.innerHTML = '⏸';
        return;
    }
    startMainTimer();
}
function pauseTimer() {
    if (intervalId === null) return;
    stopTimer();
    startPauseBtn.innerHTML = '▶';
}
function toggleStartPause() {
    if (intervalId === null) startTimer();
    else pauseTimer();
}
function setTimerFromHoursMinutesSeconds(hours, minutes, seconds) {
    stopTimer();
    startPauseBtn.innerHTML = '▶';
    if (isPreparing) {
        isPreparing = false;
        if (prepTimerDisplay) prepTimerDisplay.style.display = 'none';
        if (prepIndicator) prepIndicator.style.display = 'none';
    }
    preparationUsed = false;
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
            if (prepTimerDisplay) prepTimerDisplay.style.display = 'none';
            if (prepIndicator) prepIndicator.style.display = 'none';
            stopTimer();
            startPauseBtn.innerHTML = '▶';
        }
        preparationUsed = false;
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
    startPauseBtn.innerHTML = '▶';
    preparationUsed = false;
    if (isPreparing) {
        isPreparing = false;
        if (prepTimerDisplay) prepTimerDisplay.style.display = 'none';
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

// ... rest of script unchanged (modal handlers, event listeners, init) ...
