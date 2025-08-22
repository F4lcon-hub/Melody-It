const gameArea = document.getElementById('gameArea');
const musicSelector = document.getElementById('musicSelector');

let audio;
let audioCtx;
let analyser;
let dataArray;
let source;
let animationId;

musicSelector.addEventListener('change', async (e) => {
    if(audio) audio.pause();
    cancelAnimationFrame(animationId);
    gameArea.innerHTML = '';

    audio = new Audio(URL.createObjectURL(e.target.files[0]));
    audio.crossOrigin = "anonymous";
    await audio.play();

    // Web Audio API
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    startAudioAnalysis();
});

function startAudioAnalysis() {
    let lastNoteTime = 0;

    function analyze() {
        analyser.getByteFrequencyData(dataArray);
        const now = audioCtx.currentTime * 1000;

        // Frequências graves, médias e agudas
        const low = average(dataArray.slice(0, 20));
        const mid = average(dataArray.slice(20, 60));
        const high = average(dataArray.slice(60, dataArray.length));

        // Sensibilidade e spawn baseado em picos
        if(low > 150 && now - lastNoteTime > 150) {
            createNote('low');
            lastNoteTime = now;
        } else if(mid > 120 && now - lastNoteTime > 150) {
            createNote('mid');
            lastNoteTime = now;
        } else if(high > 100 && now - lastNoteTime > 150) {
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
    trail.classList.add('trail');
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
