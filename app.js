/**
 * 지우의 시계읽기 - Grade 2 Edition
 * Modern Clean Code Refactored Architecture (with 3D Ball Joystick Controllers)
 */

// ==========================================
// 1. Application State
// ==========================================
const state = {
  totalMinutes12: 600, // 0 ~ 719 minutes (12 Hours)
  isDragging: false,
  activeHand: null,    // 'hour' | 'minute' | 'hour-ball' | 'minute-ball' | null
  prevAngle: 0,
  lastTickMinute: 600,
  currentMode: 'explore', // 'explore' | 'quiz-drag' | 'quiz-choice'

  // Quiz States
  dragQuiz: {
    targetMinutes: 210,
    scoreCorrect: 0,
    scoreStreak: 0
  },
  choiceQuiz: {
    correctMinutes: 0,
    options: [],
    scoreCorrect: 0,
    scoreStreak: 0
  }
};

// ==========================================
// 2. DOM Elements Cache
// ==========================================
const DOM = {};

function cacheDOMElements() {
  DOM.analogClock = document.getElementById('analog-clock');
  DOM.clockFace = document.getElementById('clock-face');
  DOM.digitalHour = document.getElementById('digital-hour');
  DOM.digitalMinute = document.getElementById('digital-minute');
  DOM.timeSentence = document.getElementById('time-sentence');
  DOM.toggleSound = document.getElementById('toggle-sound');
  DOM.toggleMinuteNumbers = document.getElementById('toggle-minute-numbers');

  // 3D Ball Joystick Elements
  DOM.hourBallTrack = document.getElementById('hour-ball-track');
  DOM.minuteBallTrack = document.getElementById('minute-ball-track');
  DOM.hourBall = document.getElementById('hour-ball');
  DOM.minuteBall = document.getElementById('minute-ball');

  // Tabs & Panels
  DOM.tabs = {
    explore: document.getElementById('tab-explore'),
    quizDrag: document.getElementById('tab-quiz-drag'),
    quizChoice: document.getElementById('tab-quiz-choice')
  };
  DOM.panels = {
    explore: document.getElementById('panel-explore'),
    quizDrag: document.getElementById('panel-quiz-drag'),
    quizChoice: document.getElementById('panel-quiz-choice')
  };

  // Drag Quiz Elements
  DOM.dragQuizTarget = document.getElementById('drag-quiz-target');
  DOM.dragQuizFeedback = document.getElementById('drag-quiz-feedback');
  DOM.dragScoreCorrect = document.getElementById('drag-score-correct');
  DOM.dragScoreStreak = document.getElementById('drag-score-streak');
  DOM.btnCheckDrag = document.getElementById('btn-check-drag');
  DOM.btnNextDrag = document.getElementById('btn-next-drag');

  // Choice Quiz Elements
  DOM.choiceOptions = document.getElementById('choice-options');
  DOM.choiceQuizFeedback = document.getElementById('choice-quiz-feedback');
  DOM.choiceScoreCorrect = document.getElementById('choice-score-correct');
  DOM.choiceScoreStreak = document.getElementById('choice-score-streak');

  // Controls & Toast
  DOM.presetBtns = document.querySelectorAll('.preset-btn');
  DOM.btnCurrentTime = document.getElementById('btn-current-time');
  DOM.toast = document.getElementById('toast');
}

// ==========================================
// 3. Audio Synthesis Engine (Web Audio API)
// ==========================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function isSoundEnabled() {
  return DOM.toggleSound && DOM.toggleSound.checked;
}

function playTickSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {}
}

function playSnapSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

function playSuccessSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.08));

      gain.gain.setValueAtTime(0.2, ctx.currentTime + (idx * 0.08));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.08) + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + (idx * 0.08));
      osc.stop(ctx.currentTime + (idx * 0.08) + 0.25);
    });
  } catch (e) {}
}

function playErrorSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

// ==========================================
// 4. Analog Clock Renderer & Geometry Engine
// ==========================================
function createClockElements() {
  if (!DOM.clockFace) return;

  DOM.clockFace.innerHTML = `
    <div class="clock-center"></div>
    <div class="hand hour-hand" id="hour-hand">
      <div class="hand-line"></div>
      <div class="hand-cap"></div>
    </div>
    <div class="hand minute-hand" id="minute-hand">
      <div class="hand-line"></div>
      <div class="hand-cap"></div>
    </div>
  `;

  const hourHand = document.getElementById('hour-hand');
  const minuteHand = document.getElementById('minute-hand');

  const faceWidth = DOM.clockFace.clientWidth || 316;
  const faceHeight = DOM.clockFace.clientHeight || 316;

  const centerX = (faceWidth / 2) - 3;
  const centerY = (faceHeight / 2) - 4;

  const tickRadius = faceWidth * 0.44;
  const hourRadius = faceWidth * 0.325;
  const minuteOuterRadius = faceWidth * 0.545;

  // 1. Render Ticks (60 total)
  for (let i = 0; i < 60; i++) {
    const tick = document.createElement('div');
    tick.className = `clock-tick ${i % 5 === 0 ? 'major' : ''}`;
    const angleRad = ((i * 6) - 90) * (Math.PI / 180);
    const tx = centerX + tickRadius * Math.cos(angleRad);
    const ty = centerY + tickRadius * Math.sin(angleRad);

    tick.style.left = `${tx}px`;
    tick.style.top = `${ty}px`;
    tick.style.transform = `translate(-50%, -50%) rotate(${i * 6}deg)`;
    DOM.clockFace.appendChild(tick);
  }

  // 2. Render Hour Numbers (1 ~ 12)
  for (let h = 1; h <= 12; h++) {
    const numEl = document.createElement('div');
    numEl.className = 'clock-number';
    numEl.innerText = h;

    const angleRad = ((h * 30) - 90) * (Math.PI / 180);
    const x = centerX + hourRadius * Math.cos(angleRad);
    const y = centerY + hourRadius * Math.sin(angleRad);

    numEl.style.left = `${x}px`;
    numEl.style.top = `${y}px`;
    DOM.clockFace.appendChild(numEl);
  }

  // 3. Render Minute Numbers (00, 05, 10 ... 55)
  for (let m = 0; m < 60; m += 5) {
    const minEl = document.createElement('div');
    minEl.className = 'minute-number-outer';
    minEl.innerText = m < 10 ? `0${m}` : `${m}`;

    const angleRad = ((m * 6) - 90) * (Math.PI / 180);
    const x = centerX + minuteOuterRadius * Math.cos(angleRad);
    const y = centerY + minuteOuterRadius * Math.sin(angleRad);

    minEl.style.left = `${x}px`;
    minEl.style.top = `${y}px`;
    DOM.clockFace.appendChild(minEl);
  }

  // Touch & Mouse Drag Hand Event Binding (Direct Clock Hand Drag)
  if (hourHand) {
    hourHand.addEventListener('mousedown', (e) => startDrag(e, 'hour'));
    hourHand.addEventListener('touchstart', (e) => startDrag(e, 'hour'), { passive: false });
  }

  if (minuteHand) {
    minuteHand.addEventListener('mousedown', (e) => startDrag(e, 'minute'));
    minuteHand.addEventListener('touchstart', (e) => startDrag(e, 'minute'), { passive: false });
  }

  toggleMinuteNumbers();
}

function getAngleFromEventTarget(e, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const deltaX = clientX - centerX;
  const deltaY = clientY - centerY;

  let rad = Math.atan2(deltaY, deltaX);
  let deg = rad * (180 / Math.PI) + 90;
  if (deg < 0) deg += 360;

  return deg;
}

function startDrag(e, handType) {
  e.preventDefault();
  e.stopPropagation();
  getAudioContext();

  state.isDragging = true;
  state.activeHand = handType;

  const targetEl = (handType === 'hour-ball') ? DOM.hourBallTrack :
                   (handType === 'minute-ball') ? DOM.minuteBallTrack : DOM.analogClock;

  state.prevAngle = getAngleFromEventTarget(e, targetEl);
  state.lastTickMinute = Math.round(state.totalMinutes12);
}

function onDrag(e) {
  if (!state.isDragging || !state.activeHand) return;
  e.preventDefault();

  const targetEl = (state.activeHand === 'hour-ball') ? DOM.hourBallTrack :
                   (state.activeHand === 'minute-ball') ? DOM.minuteBallTrack : DOM.analogClock;

  const currentAngle = getAngleFromEventTarget(e, targetEl);
  let delta = currentAngle - state.prevAngle;

  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  if (state.activeHand === 'minute' || state.activeHand === 'minute-ball') {
    let minuteDelta = delta / 6;
    state.totalMinutes12 = (state.totalMinutes12 + minuteDelta + 720) % 720;
  } else if (state.activeHand === 'hour' || state.activeHand === 'hour-ball') {
    let minuteDelta = delta * 2;
    state.totalMinutes12 = (state.totalMinutes12 + minuteDelta + 720) % 720;
  }

  const currentMins = Math.round(state.totalMinutes12);
  if (Math.abs(currentMins - state.lastTickMinute) >= 1) {
    playTickSound();
    state.lastTickMinute = currentMins;
  }

  state.prevAngle = currentAngle;
  renderClockHands();
  updateDigitalDisplay();
}

function stopDrag() {
  if (state.isDragging) {
    state.totalMinutes12 = (Math.round(state.totalMinutes12 / 5) * 5) % 720;
    renderClockHands();
    updateDigitalDisplay();
    playSnapSound();
  }
  state.isDragging = false;
  state.activeHand = null;
}

function renderClockHands() {
  const hourHandEl = document.getElementById('hour-hand');
  const minuteHandEl = document.getElementById('minute-hand');

  const minuteAngle = (state.totalMinutes12 % 60) * 6;
  const hourAngle = (state.totalMinutes12 / 720) * 360;

  if (minuteHandEl) minuteHandEl.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
  if (hourHandEl) hourHandEl.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;

  // Also rotate 3D Joystick Spheres for visual feedback!
  if (DOM.hourBall) DOM.hourBall.style.transform = `rotate(${hourAngle}deg)`;
  if (DOM.minuteBall) DOM.minuteBall.style.transform = `rotate(${minuteAngle}deg)`;
}

// ==========================================
// 5. Digital Display & Sync Controls
// ==========================================
function updateDigitalDisplay() {
  const minsTotal = Math.round(state.totalMinutes12);
  let hours = Math.floor(minsTotal / 60);
  const minutes = minsTotal % 60;

  if (hours === 0) hours = 12;

  const formattedHour = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinute = minutes < 10 ? `0${minutes}` : `${minutes}`;

  if (DOM.digitalHour) DOM.digitalHour.innerText = formattedHour;
  if (DOM.digitalMinute) DOM.digitalMinute.innerText = formattedMinute;

  const minuteSentence = minutes === 0 ? '정각' : `${minutes}분`;
  if (DOM.timeSentence) DOM.timeSentence.innerText = `${hours}시 ${minuteSentence}`;
}

function setTime12(hour, minute) {
  let h = hour % 12;
  state.totalMinutes12 = (h * 60) + minute;
  renderClockHands();
  updateDigitalDisplay();
  playSnapSound();
}

function setTimeToCurrent() {
  const now = new Date();
  let h = now.getHours() % 12;
  let m = Math.round(now.getMinutes() / 5) * 5;
  setTime12(h, m);
  showToast("🕒 현재 시간으로 바로 맞췄어요!");
}

function toggleMinuteNumbers() {
  if (!DOM.toggleMinuteNumbers) return;
  const show = DOM.toggleMinuteNumbers.checked;
  const minuteEls = document.querySelectorAll('.minute-number-outer');
  minuteEls.forEach(el => {
    el.style.opacity = show ? '1' : '0';
  });
}

function setMode(mode) {
  state.currentMode = mode;

  if (DOM.tabs.explore) DOM.tabs.explore.classList.toggle('active', mode === 'explore');
  if (DOM.tabs.quizDrag) DOM.tabs.quizDrag.classList.toggle('active', mode === 'quiz-drag');
  if (DOM.tabs.quizChoice) DOM.tabs.quizChoice.classList.toggle('active', mode === 'quiz-choice');

  if (DOM.panels.explore) DOM.panels.explore.classList.toggle('active', mode === 'explore');
  if (DOM.panels.quizDrag) DOM.panels.quizDrag.classList.toggle('active', mode === 'quiz-drag');
  if (DOM.panels.quizChoice) DOM.panels.quizChoice.classList.toggle('active', mode === 'quiz-choice');

  if (mode === 'quiz-drag') {
    generateDragQuiz();
  } else if (mode === 'quiz-choice') {
    generateChoiceQuiz();
  }
}

// ==========================================
// 6. Quiz Engines (Drag & Multiple Choice)
// ==========================================
function generateDragQuiz() {
  const h = Math.floor(Math.random() * 12) + 1;
  const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const m = minuteSteps[Math.floor(Math.random() * minuteSteps.length)];

  state.dragQuiz.targetMinutes = ((h % 12) * 60) + m;

  const mText = m === 0 ? '정각' : `${m}분`;
  if (DOM.dragQuizTarget) DOM.dragQuizTarget.innerText = `${h}시 ${mText}`;

  if (DOM.dragQuizFeedback) {
    DOM.dragQuizFeedback.innerText = "손가락으로 입체 공이나 바늘을 움직여 시간을 맞춰보세요!";
    DOM.dragQuizFeedback.className = "quiz-feedback-box";
  }

  setTime12((h + 4) % 12 || 12, 0);
}

function checkDragQuizAnswer() {
  const userMins = Math.round(state.totalMinutes12);
  const diff = Math.abs(userMins - state.dragQuiz.targetMinutes);

  if (diff === 0 || diff === 720) {
    state.dragQuiz.scoreCorrect++;
    state.dragQuiz.scoreStreak++;

    if (DOM.dragScoreCorrect) DOM.dragScoreCorrect.innerText = state.dragQuiz.scoreCorrect;
    if (DOM.dragScoreStreak) DOM.dragScoreStreak.innerText = `${state.dragQuiz.scoreStreak} 🔥`;

    if (DOM.dragQuizFeedback) {
      DOM.dragQuizFeedback.innerText = "🎉 최고예요! 완벽하게 맞췄어요!";
      DOM.dragQuizFeedback.className = "quiz-feedback-box success";
    }
    showToast("🎉 정답입니다!", "success");
    playSuccessSound();

    setTimeout(() => {
      generateDragQuiz();
    }, 1800);
  } else {
    state.dragQuiz.scoreStreak = 0;
    if (DOM.dragScoreStreak) DOM.dragScoreStreak.innerText = '0';

    if (DOM.dragQuizFeedback) {
      DOM.dragQuizFeedback.innerText = "❌ 입체 공이나 시계 바늘을 천천히 옮겨보세요.";
      DOM.dragQuizFeedback.className = "quiz-feedback-box error";
    }
    showToast("다시 도전해보세요! 💡", "error");
    playErrorSound();
  }
}

function generateChoiceQuiz() {
  const h = Math.floor(Math.random() * 12) + 1;
  const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const m = minuteSteps[Math.floor(Math.random() * minuteSteps.length)];

  state.choiceQuiz.correctMinutes = ((h % 12) * 60) + m;
  setTime12(h, m);

  const optionsSet = new Set();
  const correctText = formatTimeForChoice(h, m);
  optionsSet.add(correctText);

  while (optionsSet.size < 4) {
    let wrongH = Math.floor(Math.random() * 12) + 1;
    let wrongM = minuteSteps[Math.floor(Math.random() * minuteSteps.length)];
    if (wrongH === h && wrongM === m) continue;
    optionsSet.add(formatTimeForChoice(wrongH, wrongM));
  }

  state.choiceQuiz.options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

  if (!DOM.choiceOptions) return;
  DOM.choiceOptions.innerHTML = '';

  state.choiceQuiz.options.forEach((optText) => {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.innerText = optText;
    btn.addEventListener('click', () => checkChoiceAnswer(optText, btn, correctText));
    DOM.choiceOptions.appendChild(btn);
  });

  if (DOM.choiceQuizFeedback) {
    DOM.choiceQuizFeedback.innerText = "시계를 보고 알맞은 시간을 고르세요!";
    DOM.choiceQuizFeedback.className = "quiz-feedback-box";
  }
}

function formatTimeForChoice(h, m) {
  const mText = m === 0 ? '정각' : `${m}분`;
  return `${h}시 ${mText}`;
}

function checkChoiceAnswer(selectedText, btnElement, correctText) {
  const allChoiceBtns = document.querySelectorAll('.choice-card');

  if (selectedText === correctText) {
    btnElement.classList.add('correct');
    state.choiceQuiz.scoreCorrect++;
    state.choiceQuiz.scoreStreak++;

    if (DOM.choiceScoreCorrect) DOM.choiceScoreCorrect.innerText = state.choiceQuiz.scoreCorrect;
    if (DOM.choiceScoreStreak) DOM.choiceScoreStreak.innerText = `${state.choiceQuiz.scoreStreak} 🔥`;

    if (DOM.choiceQuizFeedback) {
      DOM.choiceQuizFeedback.innerText = "🎉 대단해요! 완벽하게 읽었어요!";
      DOM.choiceQuizFeedback.className = "quiz-feedback-box success";
    }
    showToast("🎉 정답입니다!", "success");
    playSuccessSound();

    allChoiceBtns.forEach(btn => btn.disabled = true);

    setTimeout(() => {
      generateChoiceQuiz();
    }, 1800);
  } else {
    btnElement.classList.add('wrong');
    state.choiceQuiz.scoreStreak = 0;
    if (DOM.choiceScoreStreak) DOM.choiceScoreStreak.innerText = '0';

    if (DOM.choiceQuizFeedback) {
      DOM.choiceQuizFeedback.innerText = `❌ 아쉬워요! 정답은 [ ${correctText} ] 입니다.`;
      DOM.choiceQuizFeedback.className = "quiz-feedback-box error";
    }
    showToast("다시 도전해볼까요?", "error");
    playErrorSound();
  }
}

// ==========================================
// 7. UI Notifications & Utilities
// ==========================================
function showToast(message, type = '') {
  if (!DOM.toast) return;
  DOM.toast.innerText = message;
  DOM.toast.className = `shadcn-toast show ${type}`;

  setTimeout(() => {
    DOM.toast.className = 'shadcn-toast';
  }, 2500);
}

// ==========================================
// 8. Event Listeners Initialization
// ==========================================
function initEventListeners() {
  // Global Drag Events
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('touchmove', onDrag, { passive: false });

  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);

  // 3D Ball Track Controllers Listeners
  if (DOM.hourBallTrack) {
    DOM.hourBallTrack.addEventListener('mousedown', (e) => startDrag(e, 'hour-ball'));
    DOM.hourBallTrack.addEventListener('touchstart', (e) => startDrag(e, 'hour-ball'), { passive: false });
  }

  if (DOM.minuteBallTrack) {
    DOM.minuteBallTrack.addEventListener('mousedown', (e) => startDrag(e, 'minute-ball'));
    DOM.minuteBallTrack.addEventListener('touchstart', (e) => startDrag(e, 'minute-ball'), { passive: false });
  }

  // Resize Engine
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      createClockElements();
      renderClockHands();
    }, 100);
  });

  // Tab Item Selection
  if (DOM.tabs.explore) DOM.tabs.explore.addEventListener('click', () => setMode('explore'));
  if (DOM.tabs.quizDrag) DOM.tabs.quizDrag.addEventListener('click', () => setMode('quiz-drag'));
  if (DOM.tabs.quizChoice) DOM.tabs.quizChoice.addEventListener('click', () => setMode('quiz-choice'));

  // Toggle Minute Numbers
  if (DOM.toggleMinuteNumbers) {
    DOM.toggleMinuteNumbers.addEventListener('change', toggleMinuteNumbers);
  }

  // Quick Time Preset Buttons
  if (DOM.presetBtns) {
    DOM.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hour = parseInt(btn.getAttribute('data-hour'), 10);
        const minute = parseInt(btn.getAttribute('data-minute'), 10);
        setTime12(hour, minute);
      });
    });
  }

  // Current Time Button
  if (DOM.btnCurrentTime) {
    DOM.btnCurrentTime.addEventListener('click', setTimeToCurrent);
  }

  // Drag Quiz Action Buttons
  if (DOM.btnCheckDrag) {
    DOM.btnCheckDrag.addEventListener('click', checkDragQuizAnswer);
  }
  if (DOM.btnNextDrag) {
    DOM.btnNextDrag.addEventListener('click', generateDragQuiz);
  }
}

// ==========================================
// 9. Application Entrypoint
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  createClockElements();
  initEventListeners();
  setTime12(10, 0);
});
