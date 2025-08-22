const gameArea = document.getElementById('gameArea');
const musicSelector = document.getElementById('musicSelector');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');

// --- Game Settings ---
const NOTE_SPAWN_COOLDOWN = 400; // ms. Cooldown mínimo entre o spawn de notas.
const MAX_ACTIVE_NOTES = 10; // Número máximo de notas ativas na tela.

// --- Sensitivity Settings ---
const LOW_NOTE_THRESHOLD = 200; // Limiar para notas graves
const MID_NOTE_THRESHOLD = 180; // Limiar para notas médias
const HIGH_NOTE_THRESHOLD = 150; // Limiar para notas agudas

// --- Audio & Game State Variables ---
let audio;
let audioCtx;
let analyser;
let dataArray;
let lastNoteTime = 0;
let source;
let animationId;
let isPaused = false;
let activeGameNotes = []; // Tracks all notes currently on screen

// --- Event Listeners ---

// 1. Music Selection
musicSelector.addEventListener('change', async (e) => {
    if (audio) audio.pause();
    activeGameNotes = [];
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';

    // Reset buttons and state
    playButton.disabled = true;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    isPaused = false;
    pauseButton.textContent = 'Pausar';

    const file = e.target.files[0];
    if (!file) { // Handle user canceling file selection
        return;
    }

    audio = new Audio(URL.createObjectURL(file));
    audio.crossOrigin = "anonymous";

    // Setup Web Audio API
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    playButton.disabled = false;
    resetButton.disabled = false; // Enable reset as soon as a song is loaded
});

// 2. Play Button
playButton.addEventListener('click', () => {
    if (!audio) return;
    audio.play();
    startAudioAnalysis();
    playButton.disabled = true;
    pauseButton.disabled = false;
    musicSelector.disabled = true; // Disable changing music while playing
});

// 3. Pause Button
pauseButton.addEventListener('click', () => {
    if (!audioCtx) return;

    if (isPaused) {
        // Resume
        audio.play();
        startAudioAnalysis();
        pauseButton.textContent = 'Pausar';
        isPaused = false;
    } else {
        // Pause
        audio.pause();
        cancelAnimationFrame(animationId);
        pauseButton.textContent = 'Retomar';
        isPaused = true;
    }
});

// 4. Reset Button
resetButton.addEventListener('click', () => {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    activeGameNotes = [];
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';
    isPaused = false;

    // Reset button states
    playButton.disabled = true;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pausar';
    resetButton.disabled = true;
    musicSelector.disabled = false; // Allow selecting a new song
    musicSelector.value = ''; // Allows re-selecting the same file if needed
});

// 5. Game Area Click (Event Delegation for notes)
gameArea.addEventListener('click', (e) => {
    // We only care about clicks on elements with the 'note' class
    if (!e.target.classList.contains('note')) {
        return;
    }

    const clickedNoteElement = e.target;
    const noteIndex = activeGameNotes.findIndex(noteData => noteData.element === clickedNoteElement);

    if (noteIndex > -1) {
        const noteData = activeGameNotes[noteIndex];

        // Remove the note from our active list so it stops moving
        activeGameNotes.splice(noteIndex, 1);

        // Trigger visual feedback
        createParticles(noteData.element.offsetLeft, noteData.element.offsetTop, noteData.type);
        noteData.element.classList.add('hit');
        noteData.trail.remove();

        // Remove the note element from the DOM after its 'hit' animation finishes
        noteData.element.addEventListener('animationend', () => {
            noteData.element.remove();
        });
    }
});


// --- Core Game Logic ---

function startAudioAnalysis() {
    lastNoteTime = audioCtx.currentTime * 1000;
    analyze();
}

function analyze() {
    animationId = requestAnimationFrame(analyze);
    analyser.getByteFrequencyData(dataArray);
    const now = audioCtx.currentTime * 1000;

    // More efficient check using our tracked array instead of querying the DOM
    if (activeGameNotes.length >= MAX_ACTIVE_NOTES) {
        return;
    }

    const low = average(dataArray.slice(0, 20));
    const mid = average(dataArray.slice(20, 60));
    const high = average(dataArray.slice(60, dataArray.length));

    if (low > LOW_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
        createNote('low');
        lastNoteTime = now;
    } else if (mid > MID_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
        createNote('mid');
        lastNoteTime = now;
    } else if (high > HIGH_NOTE_THRESHOLD && now - lastNoteTime > NOTE_SPAWN_COOLDOWN) {
        createNote('high');
        lastNoteTime = now;
    }
}

function createNote(type) {
    const note = document.createElement('div');
    note.classList.add('note', type);
    const initialLeft = Math.random() * (gameArea.clientWidth - 50);
    note.style.left = `${initialLeft}px`;
    note.style.top = '-50px';

    const trail = document.createElement('div');
    trail.classList.add('trail', type);
    trail.style.left = note.style.left;
    trail.style.top = '-60px';

    gameArea.appendChild(trail);
    gameArea.appendChild(note);

    // Add the new note to our array to be managed by the game loop
    activeGameNotes.push({
        element: note,
        trail: trail,
        type: type,
        top: -50
    });
}

function updateGame() {
    if (!isPaused) {
        // Loop through active notes (backwards, to safely remove items)
        for (let i = activeGameNotes.length - 1; i >= 0; i--) {
            const noteData = activeGameNotes[i];
            noteData.top += 5; // Falling speed
            noteData.element.style.top = `${noteData.top}px`;
            noteData.trail.style.top = `${noteData.top - 60}px`;

            // Remove note if it goes off-screen
            if (noteData.top > gameArea.clientHeight) {
                noteData.element.remove();
                noteData.trail.remove();
                activeGameNotes.splice(i, 1);
            }
        }
    }
    // Keep the loop running
    requestAnimationFrame(updateGame);
}

function createParticles(x, y, type) {
    const noteColors = {
        low: 'var(--low-note-color)',
        mid: 'var(--mid-note-color)',
        high: 'var(--high-note-color)'
    };
    const color = noteColors[type];
    const gameAreaRect = gameArea.getBoundingClientRect();

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = `${gameAreaRect.left + x + 25}px`;
        particle.style.top = `${gameAreaRect.top + y + 25}px`;
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 10px ${color}`;

        const angle = Math.random() * 2 * Math.PI;
        const velocity = Math.random() * 4 + 1;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        document.body.appendChild(particle);

        let life = 60; // frames
        function animateParticle() {
            if (life-- <= 0) {
                if (particle.parentNode) particle.parentNode.removeChild(particle);
                return;
            }
            particle.style.transform = `translate(${vx * (60 - life)}px, ${vy * (60 - life)}px)`;
            particle.style.opacity = life / 60;
            requestAnimationFrame(animateParticle);
        }
        animateParticle();
    }
}

function average(array) {
    if (array.length === 0) return 0;
    const sum = array.reduce((a, b) => a + b, 0);
    return sum / array.length;
}

// Start the main game loop
updateGame();
