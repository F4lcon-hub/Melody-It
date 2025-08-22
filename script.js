const fileInput = document.getElementById("fileInput");
const audioPlayer = document.getElementById("audioPlayer");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const accuracyDisplay = document.getElementById("accuracy");
const audioURLInput = document.getElementById("audioURL");
const loadURLBtn = document.getElementById("loadURL");

let notes = [];
let score = 0;
let effects = [];

const NOTE_TYPES = ["circle", "long", "slider"];
let audioCtx, source, analyser, dataArray;
let lastBeatTime = 0;

// 🎵 Efeitos sonoros
const hitSound = new Audio("hit.wav"); hitSound.volume = 0.3;
const perfectSound = new Audio("perfect.wav"); perfectSound.volume = 0.4;
const greatSound = new Audio("great.wav"); greatSound.volume = 0.35;
const goodSound = new Audio("good.wav"); goodSound.volume = 0.3;

// 🔧 Canvas responsivo
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Criar nota com tempo de vida
function createNote(type=null) {
  const padding = 0.05;
  const x = Math.random() * (1 - 2*padding) * canvas.width + padding*canvas.width;
  const y = Math.random() * (1 - 2*padding) * canvas.height + padding*canvas.height;
  type = type || NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)];

  notes.push({
    x, y,
    radius: 80,
    type,
    clicked: false,
    spawnTime: audioPlayer.currentTime,
    lifeTime: 2.0 // duração da nota em segundos
  });
}

// Coordenadas do clique ou touch
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if (e.touches) { x = e.touches[0].clientX - rect.left; y = e.touches[0].clientY - rect.top; }
  else { x = e.clientX - rect.left; y = e.clientY - rect.top; }
  x *= canvas.width / rect.width;
  y *= canvas.height / rect.height;
  return { x, y };
}

// Verifica acerto
function checkHit(note, clickX, clickY, now) {
  const dx = clickX - note.x;
  const dy = clickY - note.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  if (distance > 90) return;

  if (!note.clicked) {
    note.clicked = true;
    score += 100;
    effects.push({ x: note.x, y: note.y, size: 10, color: "yellow", alpha: 1, text: "Hit" });
    hitSound.currentTime = 0; hitSound.play();
    scoreDisplay.textContent = score;
  }
}

// Desenhar notas e efeitos
function drawNotes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = audioPlayer.currentTime;

  notes.forEach((note, index) => {
    const elapsed = now - note.spawnTime;

    if (elapsed > note.lifeTime) {
      effects.push({ x: note.x, y: note.y, size: 20, color: "red", alpha: 1, text: "Miss" });
      notes.splice(index, 1);
      return;
    }

    const alpha = 1 - (elapsed / note.lifeTime) * 0.5;

    ctx.beginPath();
    ctx.arc(note.x, note.y, note.radius, 0, Math.PI*2);
    ctx.strokeStyle = note.type === "circle" ? "cyan" : note.type === "long" ? "lime" : "magenta";
    ctx.lineWidth = 5;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (note.type === "slider") {
      ctx.beginPath();
      ctx.moveTo(note.x, note.y);
      ctx.lineTo(note.x + 120, note.y);
      ctx.strokeStyle = "magenta";
      ctx.stroke();
    }
  });

  // efeitos visuais
  effects.forEach((fx, idx) => {
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.size, 0, Math.PI*2);
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = fx.alpha;
    ctx.stroke();

    if (fx.text) {
      ctx.font = "20px Arial";
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = fx.alpha;
      ctx.fillText(fx.text, fx.x + 25, fx.y);
    }

    ctx.globalAlpha = 1;
    fx.size += 2;
    fx.alpha -= 0.03;
    if (fx.alpha <= 0) effects.splice(idx, 1);
  });
}

// Loop principal
function gameLoop() {
  if (!audioPlayer.paused) {
    drawNotes();
    requestAnimationFrame(gameLoop);
  }
}

// Beat Detection avançada por faixas
function detectBeats() {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  const now = audioPlayer.currentTime;

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
  mid = midCount ? mid / midCount : 0;
  high = highCount ? high / highCount : 0;

  const bassThreshold = 150;
  const midThreshold = 120;
  const highThreshold = 100;

  if (bass > bassThreshold && now - lastBeatTime > 0.2) { lastBeatTime = now; createNote("circle"); }
  else if (mid > midThreshold && now - lastBeatTime > 0.2) { lastBeatTime = now; createNote("slider"); }
  else if (high > highThreshold && now - lastBeatTime > 0.15) { lastBeatTime = now; createNote("long"); }

  requestAnimationFrame(detectBeats);
}

// Eventos de clique/touch
canvas.addEventListener("click", e => { const {x,y} = getCanvasCoords(e); const now = audioPlayer.currentTime; notes.forEach(n=>checkHit(n,x,y,now)); });
canvas.addEventListener("touchstart", e => { e.preventDefault(); const {x,y} = getCanvasCoords(e); const now = audioPlayer.currentTime; notes.forEach(n=>checkHit(n,x,y,now)); });

// Upload de arquivo local
fileInput.addEventListener("change", e => {
  const file = e.target.files[0]; if(!file) return;
  const url = URL.createObjectURL(file); audioPlayer.src = url;
  setupAudioContext();
});

// Carregar via URL
loadURLBtn.addEventListener("click", () => {
  const url = audioURLInput.value.trim(); if(!url) return alert("Insira uma URL válida!");
  audioPlayer.src = url; audioPlayer.load();
  setupAudioContext();
});

// Configuração do AudioContext e Analyser
function setupAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (source) source.disconnect();
  source = audioCtx.createMediaElementSource(audioPlayer);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Início do jogo ao tocar áudio
audioPlayer.addEventListener("play", () => {
  score = 0; scoreDisplay.textContent = score;
  notes = []; effects = [];
  // Cria algumas notas iniciais para teste
  for(let i=0;i<3;i++) createNote();
  gameLoop(); detectBeats();
});
