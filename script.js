const gameArea = document.getElementById('gameArea');
const musicSelector = document.getElementById('musicSelector');
const playButton = document.getElementById('playButton');

const NOTE_SPAWN_COOLDOWN = 400; // ms. Cooldown mínimo entre o spawn de notas.
const MAX_ACTIVE_NOTES = 10; // Número máximo de notas ativas na tela.

// --- Ajustes de Sensibilidade ---
const LOW_NOTE_THRESHOLD = 200; // Limiar para notas graves (valor original: 150)
const MID_NOTE_THRESHOLD = 180; // Limiar para notas médias (valor original: 120)
const HIGH_NOTE_THRESHOLD = 150; // Limiar para notas agudas (valor original: 100)

let audio;
let audioCtx;
let analyser;
let dataArray;
let source;
let animationId;

musicSelector.addEventListener('change', (e) => {
    if(audio) audio.pause();
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';
    playButton.disabled = true;

    const file = e.target.files[0];
    if (!file) { // Caso o usuário cancele a seleção de arquivo
        return;
    }

    // Atualiza o texto do label para mostrar o nome do arquivo
    const musicSelectorLabel = document.querySelector('label[for="musicSelector"]');
    if (musicSelectorLabel) {
        // Trunca nomes de arquivo longos para não quebrar o layout
        musicSelectorLabel.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
    }

    audio = new Audio(URL.createObjectURL(file));
    audio.crossOrigin = "anonymous";

    // Web Audio API
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    playButton.disabled = false;
});

playButton.addEventListener('click', () => {
    if (!audio) return;
    audio.play();
    startAudioAnalysis();
    playButton.disabled = true;
});

function startAudioAnalysis() {
    let lastNoteTime = 0;

    function analyze() {
        analyser.getByteFrequencyData(dataArray);
        const now = audioCtx.currentTime * 1000;

        // Limita o número de notas na tela
        const activeNotes = document.getElementsByClassName('note').length;
        if (activeNotes >= MAX_ACTIVE_NOTES) {
            animationId = requestAnimationFrame(analyze);
            return;
        }

        // Frequências graves, médias e agudas
        const low = average(dataArray.slice(0, 20));
        const mid = average(dataArray.slice(20, 60));
        const high = average(dataArray.slice(60, dataArray.length));

        // Sensibilidade e spawn baseado em picos
        if(low > LOW_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
            createNote('low');
            lastNoteTime = now;
        } else if(mid > MID_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
            createNote('mid');
            lastNoteTime = now;
        } else if(high > HIGH_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
            createNote('high');
            lastNoteTime = now;
        }

        animationId = requestAnimationFrame(analyze);
    }

    analyze();
}

function average(arr) {
    return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function createNote(type='low') {
    const note = document.createElement('div');
    note.classList.add('note', type);
    note.style.left = `${Math.random() * (gameArea.clientWidth - 50)}px`;

    // trilha
    const trail = document.createElement('div');
    trail.classList.add('trail', type);
    trail.style.left = note.style.left;
    trail.style.top = '-60px';
    gameArea.appendChild(trail);

    gameArea.appendChild(note);

    let top = -60;
    const speed = 4; 
    const fall = setInterval(() => {
        if(top > gameArea.clientHeight) {
            note.remove();
            trail.remove();
            clearInterval(fall);
            return;
        }
        top += speed;
        note.style.top = top + 'px';
        trail.style.top = top + 'px';
    }, 16);

    note.addEventListener('click', () => {
        note.classList.add('hit');
        spawnParticles(note);
        setTimeout(() => note.remove(), 400);
        trail.remove();
        clearInterval(fall);
    });
}

function spawnParticles(note) {
    const rect = note.getBoundingClientRect();
    for(let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = rect.left + 20 + 'px';
        particle.style.top = rect.top + 20 + 'px';

        gameArea.appendChild(particle);

        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 50 + 20;

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        particle.animate([
            { transform: `translate(0px, 0px)`, opacity: 1 },
            { transform: `translate(${x}px, ${y}px)`, opacity: 0 }
        ], {
            duration: 400,
            easing: 'ease-out'
        });

        setTimeout(() => particle.remove(), 400);
    }
}
