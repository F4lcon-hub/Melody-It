const gameArea = document.getElementById('gameArea');
const musicSelector = document.getElementById('musicSelector');
const difficultySelector = document.getElementById('difficultySelector');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');

// --- Game Settings ---
const NUM_LANES = 4;
const TARGET_ZONE_BOTTOM_PERCENT = 0.90; // Note must be below this line
const TARGET_ZONE_TOP_PERCENT = 0.80;    // and above this line
const KEY_MAPPING = { '1': 0, '2': 1, '3': 2, '4': 3 };

const DIFFICULTY_SETTINGS = {
    easy: {
        NOTE_SPAWN_COOLDOWN: 600,
        MAX_ACTIVE_NOTES: 8,
        LOW_NOTE_THRESHOLD: 220,
        MID_NOTE_THRESHOLD: 200,
        HIGH_NOTE_THRESHOLD: 180,
    },
    normal: {
        NOTE_SPAWN_COOLDOWN: 400,
        MAX_ACTIVE_NOTES: 10,
        LOW_NOTE_THRESHOLD: 200,
        MID_NOTE_THRESHOLD: 180,
        HIGH_NOTE_THRESHOLD: 150,
    },
    hard: {
        NOTE_SPAWN_COOLDOWN: 250,
        MAX_ACTIVE_NOTES: 14,
        LOW_NOTE_THRESHOLD: 160,
        MID_NOTE_THRESHOLD: 140,
        HIGH_NOTE_THRESHOLD: 120,
    }
};

let currentDifficultySettings = DIFFICULTY_SETTINGS.normal;

// --- Audio & Game State Variables ---
let audio;
let audioCtx;
let analyser;
let dataArray;
let lastNoteTime = 0;
let source;
let animationId;
let isPaused = false;
let noteIdCounter = 0;
const noteIntervals = new Map();

difficultySelector.addEventListener('change', (e) => {
    currentDifficultySettings = DIFFICULTY_SETTINGS[e.target.value];
});

// --- Event Listeners ---

// 1. Music Selection
musicSelector.addEventListener('change', async (e) => {
    noteIntervals.forEach(interval => clearInterval(interval));
    noteIntervals.clear();

    if (audio) audio.pause();
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';

    // Re-create the target line because innerHTML clears it
    const targetLine = document.createElement('div');
    targetLine.id = 'targetLine';
    gameArea.appendChild(targetLine);

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
    difficultySelector.disabled = true;
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
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';
    isPaused = false;

    // Reset button states
    playButton.disabled = true;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pausar';
    resetButton.disabled = true;
    difficultySelector.disabled = false;
    musicSelector.disabled = false; // Allow selecting a new song
    musicSelector.value = ''; // Allows re-selecting the same file if needed
});

// 5. Keyboard Input Handler
document.addEventListener('keydown', (e) => {
    // Ignore if game is not running or the key is not for the game
    if (isPaused || !audioCtx || !KEY_MAPPING.hasOwnProperty(e.key)) {
        return;
    }

    const targetLane = KEY_MAPPING[e.key];
    const targetZoneTopPx = gameArea.clientHeight * TARGET_ZONE_TOP_PERCENT;
    const targetZoneBottomPx = gameArea.clientHeight * TARGET_ZONE_BOTTOM_PERCENT;

    // Visual feedback on the target line
    const targetLine = document.getElementById('targetLine');
    if (targetLine) {
        targetLine.classList.add('target-hit');
        // Remove the class after the animation to allow it to be re-added
        setTimeout(() => targetLine.classList.remove('target-hit'), 100);
    }

    let hitNoteElement = null;
    const notesInLane = document.querySelectorAll(`.note[data-lane='${targetLane}']`);

    // Find the note that is lowest on the screen (closest to the target) within the zone
    let lowestNote = null;
    let lowestTop = -1;

    for (const note of notesInLane) {
        const noteTop = note.offsetTop;
        if (noteTop >= targetZoneTopPx && noteTop <= targetZoneBottomPx) {
            if (noteTop > lowestTop) {
                lowestTop = noteTop;
                lowestNote = note;
            }
        }
    }
    hitNoteElement = lowestNote;

    if (hitNoteElement) {
        const noteId = parseInt(hitNoteElement.dataset.id, 10);
        const interval = noteIntervals.get(noteId);

        if (interval) {
            clearInterval(interval);
            noteIntervals.delete(noteId);
        }

        const noteType = Array.from(hitNoteElement.classList).find(c => ['low', 'mid', 'high'].includes(c));
        createParticles(hitNoteElement.offsetLeft, hitNoteElement.offsetTop, noteType);
        hitNoteElement.classList.add('hit');

        const trail = document.querySelector(`.trail[data-note-id='${noteId}']`);
        if (trail) trail.remove();

        hitNoteElement.addEventListener('animationend', () => hitNoteElement.remove());
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
    const activeNotes = document.getElementsByClassName('note').length;
    if (activeNotes >= currentDifficultySettings.MAX_ACTIVE_NOTES) {
        return;
    }

    const low = average(dataArray.slice(0, 20));
    const mid = average(dataArray.slice(20, 60));
    const high = average(dataArray.slice(60, dataArray.length));

    if (low > currentDifficultySettings.LOW_NOTE_THRESHOLD && now - lastNoteTime > currentDifficultySettings.NOTE_SPAWN_COOLDOWN) {
        createNote('low');
        lastNoteTime = now;
    } else if (mid > currentDifficultySettings.MID_NOTE_THRESHOLD && now - lastNoteTime > currentDifficultySettings.NOTE_SPAWN_COOLDOWN) {
        createNote('mid');
        lastNoteTime = now;
    } else if (high > currentDifficultySettings.HIGH_NOTE_THRESHOLD && now - lastNoteTime > currentDifficultySettings.NOTE_SPAWN_COOLDOWN) {
        createNote('high');
        lastNoteTime = now;
    }
}

function createNote(type) {
    const noteId = noteIdCounter++;
    const lane = Math.floor(Math.random() * NUM_LANES);

    const note = document.createElement('div');
    note.classList.add('note', type);
    note.dataset.id = noteId;
    note.dataset.lane = lane;

    const laneWidth = gameArea.clientWidth / NUM_LANES;
    const noteWidth = 50; // Should match CSS
    const initialLeft = (lane * laneWidth) + (laneWidth / 2) - (noteWidth / 2);
    note.style.left = `${initialLeft}px`;
    note.style.top = '-50px';

    const trail = document.createElement('div');
    trail.classList.add('trail', type);
    trail.style.left = note.style.left;
    trail.style.top = '-60px';
    trail.dataset.noteId = noteId; // Associate trail with note

    gameArea.appendChild(trail);
    gameArea.appendChild(note);

    let topPosition = -50;
    const fallInterval = setInterval(() => {
        if (isPaused) return;

        topPosition += 5;
        note.style.top = `${topPosition}px`;
        trail.style.top = `${topPosition - 60}px`;

        if (topPosition > gameArea.clientHeight) {
            clearInterval(fallInterval);
            noteIntervals.delete(noteId); // Clean up map
            if (note.parentNode) note.parentNode.removeChild(note);
            if (trail.parentNode) trail.parentNode.removeChild(trail);
        }
    }, 20);

    noteIntervals.set(noteId, fallInterval);
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
