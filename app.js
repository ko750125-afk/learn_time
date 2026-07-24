/**
 * Modern Clock Studio - Grade 2 Edition
 * Realtime Web Audio API Sound Feedback Engine
 */

// Global State (0 ~ 719 minutes = 12 Hours)
let totalMinutes12 = 600;
let isDragging = false;
let activeHand = null;
let prevAngle = 0;
let lastTickMinute = 600;
let currentMode = 'explore';

// Quiz States
let dragTargetMinutes = 210;
let dragScoreCorrect = 0;
let dragScoreStreak = 0;

let choiceCorrectMinutes = 0;
let choiceOptions = [];
let choiceScoreCorrect = 0;
let choiceScoreStreak = 0;

// Web Audio Context Synthesis Engine
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play Realtime Tick Sound during hand drag
 */
function playTickSound() {
  const toggleSound = document.getElementById('toggle-sound');
  if (toggleSound && !toggleSound.checked) return;

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
  } catch (e) {
    // Silent fail if browser audio policy blocks
  }
}

/**
 * Play Snap Click Sound on hand release (5-min snap)
 */
function playSnapSound() {
  const toggleSound = document.getElementById('toggle-sound');
  if (toggleSound && !toggleSound.checked) return;

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

/**
 * Play Quiz Success Melody (Do-Mi-Sol Fanfare)
 */
function playSuccessSound() {
  const toggleSound = document.getElementById('toggle-sound');
  if (toggleSound && !toggleSound.checked) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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

/**
 * Play Quiz Error Sound
 */
function playErrorSound() {
  const toggleSound = document.getElementById('toggle-sound');
  if (toggleSound && !toggleSound.checked) return;

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

// DOM Elements
const analogClock = document.getElementById('analog-clock');
const clockFace = document.getElementById('clock-face');

const digitalHour = document.getElementById('digital-hour');
const digitalMinute = document.getElementById('digital-minute');
const timeSentence = document.getElementById('time-sentence');

const toggleMinuteNumbersCheck = document.getElementById('toggle-minute-numbers');

document.addEventListener('DOMContentLoaded', () => {
  createClockElements();
  initEventListeners();
  setTime12(10, 0); // Start at 10:00
});

function createClockElements() {
  clockFace.innerHTML = `
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

  const updatedHourHand = document.getElementById('hour-hand');
  const updatedMinuteHand = document.getElementById('minute-hand');

  const faceWidth = clockFace.clientWidth || 316;
  const faceHeight = clockFace.clientHeight || 316;
  
  const centerX = (faceWidth / 2) - 3;
  const centerY = (faceHeight / 2) - 4;

  const tickRadius = 142;
  const hourRadius = 104;
  const minuteOuterRadius = 175;

  // 1. Ticks (60 total)
  for (let i = 0; i < 60; i++) {
    const tick = document.createElement('div');
    tick.className = `clock-tick ${i % 5 === 0 ? 'major' : ''}`;
    const angleRad = ((i * 6) - 90) * (Math.PI / 180);
    const tx = centerX + tickRadius * Math.cos(angleRad);
    const ty = centerY + tickRadius * Math.sin(angleRad);

    tick.style.left = `${tx}px`;
    tick.style.top = `${ty}px`;
    tick.style.transform = `translate(-50%, -50%) rotate(${i * 6}deg)`;
    clockFace.appendChild(tick);
  }

  // 2. Hour Numbers (1 - 12)
  for (let h = 1; h <= 12; h++) {
    const numEl = document.createElement('div');
    numEl.className = 'clock-number';
    numEl.innerText = h;

    const angleRad = ((h * 30) - 90) * (Math.PI / 180);
    const x = centerX + hourRadius * Math.cos(angleRad);
    const y = centerY + hourRadius * Math.sin(angleRad);

    numEl.style.left = `${x}px`;
    numEl.style.top = `${y}px`;
    clockFace.appendChild(numEl);
  }

  // 3. Outer Minute Numbers (00, 05, 10 ... 55)
  for (let m = 0; m < 60; m += 5) {
    const minEl = document.createElement('div');
    minEl.className = 'minute-number-outer';
    minEl.innerText = m < 10 ? `0${m}` : `${m}`;

    const angleRad = ((m * 6) - 90) * (Math.PI / 180);
    const x = centerX + minuteOuterRadius * Math.cos(angleRad);
    const y = centerY + minuteOuterRadius * Math.sin(angleRad);

    minEl.style.left = `${x}px`;
    minEl.style.top = `${y}px`;
    clockFace.appendChild(minEl);
  }

  updatedHourHand.addEventListener('mousedown', (e) => startDrag(e, 'hour'));
  updatedHourHand.addEventListener('touchstart', (e) => startDrag(e, 'hour'), { passive: false });

  updatedMinuteHand.addEventListener('mousedown', (e) => startDrag(e, 'minute'));
  updatedMinuteHand.addEventListener('touchstart', (e) => startDrag(e, 'minute'), { passive: false });
}

function initEventListeners() {
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('touchmove', onDrag, { passive: false });

  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
}

function getAngleFromEvent(e) {
  const rect = analogClock.getBoundingClientRect();
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
  getAudioContext(); // Resume audio context on user interaction
  isDragging = true;
  activeHand = handType;
  prevAngle = getAngleFromEvent(e);
  lastTickMinute = Math.round(totalMinutes12);
}

function onDrag(e) {
  if (!isDragging || !activeHand) return;
  e.preventDefault();

  const currentAngle = getAngleFromEvent(e);
  let delta = currentAngle - prevAngle;

  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  if (activeHand === 'minute') {
    let minuteDelta = delta / 6;
    totalMinutes12 = (totalMinutes12 + minuteDelta + 720) % 720;
  } else if (activeHand === 'hour') {
    let minuteDelta = delta * 2;
    totalMinutes12 = (totalMinutes12 + minuteDelta + 720) % 720;
  }

  // Play tick sound whenever time changes by 1 minute interval
  const currentMins = Math.round(totalMinutes12);
  if (Math.abs(currentMins - lastTickMinute) >= 1) {
    playTickSound();
    lastTickMinute = currentMins;
  }

  prevAngle = currentAngle;
  renderClockHands();
  updateDigitalDisplay();
}

function stopDrag() {
  if (isDragging) {
    totalMinutes12 = (Math.round(totalMinutes12 / 5) * 5) % 720;
    renderClockHands();
    updateDigitalDisplay();
    playSnapSound(); // Play snap click sound on release!
  }
  isDragging = false;
  activeHand = null;
}

function renderClockHands() {
  const hourHandEl = document.getElementById('hour-hand');
  const minuteHandEl = document.getElementById('minute-hand');
  if (!hourHandEl || !minuteHandEl) return;

  const minuteAngle = (totalMinutes12 % 60) * 6;
  const hourAngle = (totalMinutes12 / 720) * 360;

  minuteHandEl.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
  hourHandEl.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
}

function updateDigitalDisplay() {
  const minsTotal = Math.round(totalMinutes12);
  let hours = Math.floor(minsTotal / 60);
  const minutes = minsTotal % 60;

  if (hours === 0) hours = 12;

  const formattedHour = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinute = minutes < 10 ? `0${minutes}` : `${minutes}`;

  digitalHour.innerText = formattedHour;
  digitalMinute.innerText = formattedMinute;

  const minuteSentence = minutes === 0 ? '정각' : `${minutes}분`;
  timeSentence.innerText = `${hours}시 ${minuteSentence}`;
}

function setTime12(hour, minute) {
  let h = hour % 12;
  totalMinutes12 = (h * 60) + minute;
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

function setMode(mode) {
  currentMode = mode;

  document.getElementById('tab-explore').classList.toggle('active', mode === 'explore');
  document.getElementById('tab-quiz-drag').classList.toggle('active', mode === 'quiz-drag');
  document.getElementById('tab-quiz-choice').classList.toggle('active', mode === 'quiz-choice');

  document.getElementById('panel-explore').classList.toggle('active', mode === 'explore');
  document.getElementById('panel-quiz-drag').classList.toggle('active', mode === 'quiz-drag');
  document.getElementById('panel-quiz-choice').classList.toggle('active', mode === 'quiz-choice');

  if (mode === 'quiz-drag') {
    generateDragQuiz();
  } else if (mode === 'quiz-choice') {
    generateChoiceQuiz();
  }
}

/* Quiz 1: Drag Hands Quiz Mode */
function generateDragQuiz() {
  const h = Math.floor(Math.random() * 12) + 1;
  const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const m = minuteSteps[Math.floor(Math.random() * minuteSteps.length)];

  dragTargetMinutes = ((h % 12) * 60) + m;

  const mText = m === 0 ? '정각' : `${m}분`;
  document.getElementById('drag-quiz-target').innerText = `${h}시 ${mText}`;

  const feedback = document.getElementById('drag-quiz-feedback');
  feedback.innerText = "시침과 분침을 위 목표 시간에 맞춰보세요!";
  feedback.className = "quiz-feedback-box";

  setTime12((h + 4) % 12 || 12, 0);
}

function checkDragQuizAnswer() {
  const userMins = Math.round(totalMinutes12);
  const diff = Math.abs(userMins - dragTargetMinutes);

  const feedback = document.getElementById('drag-quiz-feedback');

  if (diff === 0 || diff === 720) {
    dragScoreCorrect++;
    dragScoreStreak++;
    document.getElementById('drag-score-correct').innerText = dragScoreCorrect;
    document.getElementById('drag-score-streak').innerText = `${dragScoreStreak} 🔥`;

    feedback.innerText = "🎉 최고예요! 완벽하게 맞췄어요!";
    feedback.className = "quiz-feedback-box success";
    showToast("🎉 정답입니다!", "success");
    playSuccessSound();

    setTimeout(() => {
      generateDragQuiz();
    }, 1800);
  } else {
    dragScoreStreak = 0;
    document.getElementById('drag-score-streak').innerText = '0';

    feedback.innerText = "❌ 다시 한 번 시계 바늘을 천천히 옮겨보세요.";
    feedback.className = "quiz-feedback-box error";
    showToast("다시 도전해보세요! 💡", "error");
    playErrorSound();
  }
}

/* Quiz 2: Multiple Choice Quiz Mode */
function generateChoiceQuiz() {
  const h = Math.floor(Math.random() * 12) + 1;
  const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const m = minuteSteps[Math.floor(Math.random() * minuteSteps.length)];

  choiceCorrectMinutes = ((h % 12) * 60) + m;
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

  choiceOptions = Array.from(optionsSet).sort(() => Math.random() - 0.5);

  const container = document.getElementById('choice-options');
  container.innerHTML = '';

  choiceOptions.forEach((optText) => {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.innerText = optText;
    btn.onclick = () => checkChoiceAnswer(optText, btn, correctText);
    container.appendChild(btn);
  });

  const feedback = document.getElementById('choice-quiz-feedback');
  feedback.innerText = "시계를 보고 알맞은 시간을 고르세요!";
  feedback.className = "quiz-feedback-box";
}

function formatTimeForChoice(h, m) {
  const mText = m === 0 ? '정각' : `${m}분`;
  return `${h}시 ${mText}`;
}

function checkChoiceAnswer(selectedText, btnElement, correctText) {
  const feedback = document.getElementById('choice-quiz-feedback');
  const allChoiceBtns = document.querySelectorAll('.choice-card');

  if (selectedText === correctText) {
    btnElement.classList.add('correct');
    choiceScoreCorrect++;
    choiceScoreStreak++;

    document.getElementById('choice-score-correct').innerText = choiceScoreCorrect;
    document.getElementById('choice-score-streak').innerText = `${choiceScoreStreak} 🔥`;

    feedback.innerText = "🎉 대단해요! 완벽하게 읽었어요!";
    feedback.className = "quiz-feedback-box success";
    showToast("🎉 정답입니다!", "success");
    playSuccessSound();

    allChoiceBtns.forEach(btn => btn.disabled = true);

    setTimeout(() => {
      generateChoiceQuiz();
    }, 1800);
  } else {
    btnElement.classList.add('wrong');
    choiceScoreStreak = 0;
    document.getElementById('choice-score-streak').innerText = '0';

    feedback.innerText = `❌ 아쉬워요! 정답은 [ ${correctText} ] 입니다.`;
    feedback.className = "quiz-feedback-box error";
    showToast("다시 도전해볼까요?", "error");
    playErrorSound();
  }
}

function toggleMinuteNumbers() {
  const show = toggleMinuteNumbersCheck.checked;
  const minuteEls = document.querySelectorAll('.minute-number-outer');
  minuteEls.forEach(el => {
    el.style.opacity = show ? '1' : '0';
  });
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `shadcn-toast show ${type}`;

  setTimeout(() => {
    toast.className = 'shadcn-toast';
  }, 2500);
}
