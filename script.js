const fileInput = document.getElementById("fileInput");
const audioPlayer = document.getElementById("audioPlayer");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");

let notes = [];
let effects = [];
let score = 0;
const NOTE_TYPES = ["circle", "long", "slider"];
let audioCtx, source, analyser, dataArray;
let lastBeatTime = 0;

// 🔧 Canvas responsivo
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Criar nota com log
function createNote(type = null) {
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
    lifeTime: 2.0
  });
  console.log(`Nota criada: tipo=${type}, x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
}

// Coordenadas clique/touch
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

// Checar acerto
function checkHit(note, clickX, clickY) {
  const dx = clickX - note.x;
  const dy = clickY - note.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  if (distance > 90) return;

  if (!note.clicked) {
    note.clicked = true;
    score += 100;
    scoreDisplay.textContent = score;
    effects.push({ x: note.x, y: note.y, size: 10, color: "yellow", alpha: 1, text: "Hit" });
    console.log(`Hit registrado: x=${note.x.toFixed(2)}, y=${note.y.toFixed(2)}`);
  }
}

// Desenhar notas e efeitos
function drawNotes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = audioPlayer.currentTime;

  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    const elapsed = now - note.spawnTime;

    if (elapsed > note.lifeTime) {
      effects.push({ x: note.x, y: note.y, size: 20, color: "red", alpha: 1, text: "Miss" });
      console.log(`Miss: tipo=${note.type}, x=${note.x.toFixed(2)}, y=${note.y.toFixed(2)}`);
      notes.splice(i, 1);
      continue;
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
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
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
    if (fx.alpha <= 0) effects.splice(i, 1);
  }
}

// Loop principal
function gameLoop() {
  if (!audioPlayer.paused) {
    drawNotes();
    requestAnimationFrame(gameLoop);
  }
}

// Beat detection simplificada
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

  if (bass > 150 && now - lastBeatTime > 0.2) { lastBeatTime = now; createNote("circle"); }
  else if (mid > 120 && now - lastBeatTime > 0.2) { lastBeatTime = now; createNote("slider"); }
  else if (high > 100 && now - lastBeatTime > 0.15) { lastBeatTime = now; createNote("long"); }

  requestAnimationFrame(detectBeats);
}

// Clique/touch
canvas.addEventListener("click", e => {
  const {x, y} = getCanvasCoords(e);
  notes.forEach(n => checkHit(n, x, y));
});
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const {x, y} = getCanvasCoords(e);
  notes.forEach(n => checkHit(n, x, y));
});

// Upload local
fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  setupAudioContext();
});

// Setup AudioContext
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

// Início do jogo
audioPlayer.addEventListener("play", () => {
  score = 0;
  scoreDisplay.textContent = score;
  notes = [];
  effects = [];
  for (let i=0;i<3;i++) createNote(); // notas iniciais
  gameLoop();
  detectBeats();
});
