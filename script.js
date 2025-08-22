const fileInput = document.getElementById("fileInput");
const audioPlayer = document.getElementById("audioPlayer");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const accuracyDisplay = document.getElementById("accuracy");

let notes = [];
let score = 0;
let effects = [];

const NOTE_TYPES = ["circle", "long", "slider"];
let audioCtx, source, analyser, dataArray;
let lastBeatTime = 0;

// 🎵 Efeitos sonoros
const hitSound = new Audio("hit.wav");
hitSound.volume = 0.3;
const perfectSound = new Audio("perfect.wav");
perfectSound.volume = 0.4;
const greatSound = new Audio("great.wav");
greatSound.volume = 0.35;
const goodSound = new Audio("good.wav");
goodSound.volume = 0.3;

// 🔧 Canvas responsivo
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Criar nota
function createNote(type=null) {
  const padding = 0.05;
  const x = Math.random() * (1 - 2*padding) * canvas.width + padding*canvas.width;
  const y = Math.random() * (1 - 2*padding) * canvas.height + padding*canvas.height;
  const appearTime = audioPlayer.currentTime + 0.3;
  type = type || NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)];

  notes.push({
    x, y,
    radius: 80,
    appearTime,
    clicked: false,
    type,
    holdTime: type === "long" ? 1.5 : 0.0,
    sliderLength: type === "slider" ? 120 : 0,
  });
}

// Desenhar notas e efeitos
function drawNotes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = audioPlayer.currentTime;

  notes.forEach(note => {
    if (now >= note.appearTime - 1 && !note.clicked) {
      const progress = 1 - (note.appearTime - now);
      const radius = note.radius * (1 - progress * 0.8);

      ctx.beginPath();
      ctx.arc(note.x, note.y, radius, 0, Math.PI*2);

      if (note.type === "circle") ctx.strokeStyle = "cyan";
      if (note.type === "long") ctx.strokeStyle = "lime";
      if (note.type === "slider") ctx.strokeStyle = "magenta";

      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      if (note.type === "slider") {
        ctx.beginPath();
        ctx.moveTo(note.x, note.y);
        ctx.lineTo(note.x + note.sliderLength, note.y);
        ctx.strokeStyle = "magenta";
        ctx.stroke();
      }
    }
  });

  effects.forEach((fx, index) => {
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.size, 0, Math.PI*2);
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = fx.alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
    fx.size += 4;
    fx.alpha -= 0.05;
    if (fx.alpha <= 0) effects.splice(index,1);
  });
}

// Loop principal
function gameLoop() {
  if (!audioPlayer.paused) {
    drawNotes();
    requestAnimationFrame(gameLoop);
  }
}

// Avaliar clique/touch
function checkHit(note, clickX, clickY, now) {
  const dx = clickX - note.x;
  const dy = clickY - note.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  if (distance > 90) return;

  const diff = Math.abs(now - note.appearTime);
  let timing = "", points = 0;

  if (diff < 0.08) { timing = "Perfect"; points = 300; perfectSound.currentTime=0; perfectSound.play(); }
  else if (diff < 0.15) { timing = "Great"; points = 150; greatSound.currentTime=0; greatSound.play(); }
  else if (diff < 0.25) { timing = "Good"; points = 50; goodSound.currentTime=0; goodSound.play(); }
  else { timing = "Miss"; points = 0; }

  if (points > 0) {
    note.clicked = true;
    score += points;
    effects.push({ x: note.x, y: note.y, size: 10, color: "yellow", alpha: 1 });
    hitSound.currentTime = 0;
    hitSound.play();
  }

  accuracyDisplay.textContent = `Timing: ${timing}`;
  scoreDisplay.textContent = score;
}

// Coordenadas do clique ou touch
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if (e.touches) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  x *= canvas.width / rect.width;
  y *= canvas.height / rect.height;
  return { x, y };
}

// Eventos de clique e touch
canvas.addEventListener("click", (e) => {
  const {x,y} = getCanvasCoords(e);
  const now = audioPlayer.currentTime;
  notes.forEach(note => { if(!note.clicked) checkHit(note, x, y, now); });
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const {x,y} = getCanvasCoords(e);
  const now = audioPlayer.currentTime;
  notes.forEach(note => { if(!note.clicked) checkHit(note, x, y, now); });
});

// Upload da música
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  audioPlayer.src = url;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (source) source.disconnect();

  source = audioCtx.createMediaElementSource(audioPlayer);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
});

// Beat Detection avançada por bandas de frequência
function detectBeats() {
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const now = audioPlayer.currentTime;
  
  // Divisão em bandas
  let bass = 0, mid = 0, high = 0;
  let bassCount = 0, midCount = 0, highCount = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const freq = i * (audioCtx.sampleRate/2) / dataArray.length;
    const val = dataArray[i];

    if (freq >= 20 && freq <= 250) { bass += val; bassCount++; }
    else if (freq > 250 && freq <= 2000) { mid += val; midCount++; }
    else if (freq > 2000) { high += val; highCount++; }
  }

  bass = bassCount ? bass / bassCount : 0;
  mid  = midCount ? mid / midCount : 0;
  high = highCount ? high / highCount : 0;

  // Thresholds adaptativos simples
  const bassThreshold = 150;
  const midThreshold  = 120;
  const highThreshold = 100;

  if (bass > bassThreshold && now - lastBeatTime > 0.2) {
    lastBeatTime = now;
    createNote("circle"); // graves → círculo
  } else if (mid > midThreshold && now - lastBeatTime > 0.2) {
    lastBeatTime = now;
    createNote("slider"); // médios → slider
  } else if (high > highThreshold && now - lastBeatTime > 0.15) {
    lastBeatTime = now;
    createNote("long"); // agudos → long note
  }

  requestAnimationFrame(detectBeats);
}

// Início do jogo
audioPlayer.addEventListener("play", () => {
  score = 0;
  scoreDisplay.textContent = score;
  notes = [];
  effects = [];
  gameLoop();
  detectBeats();
});
