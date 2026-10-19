<script>
const canvas = document.getElementById('analyzerCanvas');
const ctx = canvas.getContext('2d');

// --- 1. Konfiguration & Zustand ---
let zoomX = 1.5;         // Pixel pro Mikrosekunde (µs)
let offsetX = 50.0;       // Start-Offset in Pixeln
let isDragging = false;
let startX = 0;
let activeKey = null;     // Erkennt ob 'a' oder 'b' gedrückt gehalten wird

// Marker-Positionen in Mikrosekunden (µs). null bedeutet nicht gesetzt.
let markerA = 40;
let markerB = 160;

// --- 2. Mehrkanal-Testdaten generieren (Einheit: Mikrosekunden µs) ---
// Kanal-Definitionen
const channels = [
    { name: "CH1: CLK (Clock)", color: "#00ff66", data: [] },
    { name: "CH2: DATA", color: "#00ffff", data: [] },
    { name: "CH3: ENABLE", color: "#ff007f", data: [] }
];

// Daten generieren
let t1 = 0, t2 = 0, t3 = 0;
let s1 = 0, s2 = 0, s3 = 1;

for (let i = 0; i < 300; i++) {
    // CH1: Konstanter schneller Takt (z.B. alle 10µs Flanke)
    s1 = s1 === 0 ? 1 : 0;
    channels[0].data.push({ state: s1, duration: 10 });
    
    // CH2: Zufällige Datenbits, etwas langsamer
    if (i % 3 === 0) {
        s2 = Math.random() > 0.5 ? 1 : 0;
        channels[1].data.push({ state: s2, duration: 30 });
    }
}
// CH3: Ein langes Enable-Signal
channels[2].data.push({ state: 1, duration: 150 });
channels[2].data.push({ state: 0, duration: 250 });
channels[2].data.push({ state: 1, duration: 1000 });


// --- 3. Haupt-Zeichenfunktion (Render Loop) ---
function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const timelineHeight = 30; // Höhe des Lineals oben
    const channelAreaHeight = h - timelineHeight;
    const chHeight = channelAreaHeight / channels.length; // Höhe pro Kanal-Slot

    // --- A. ZEIT-LINEAL (TIMELINE TRACE) ---
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, w, timelineHeight);
    
    // Berechnen, wie viele µs pro Hauptgitter-Teilung sinnvoll sind
    // Schrittweiten-Autoscaling basierend auf Zoomstufe
    let usPerGrid = 10;
    if (zoomX < 0.3) usPerGrid = 100;
    else if (zoomX < 0.8) usPerGrid = 50;
    else if (zoomX > 4) usPerGrid = 2;
    else if (zoomX > 10) usPerGrid = 0.5;

    const gridPixelWidth = usPerGrid * zoomX;
    // Ersten sichtbaren Gitter-Tick links vom Schirm berechnen
    const firstGridUs = Math.ceil(-offsetX / gridPixelWidth) * usPerGrid;
    const startPixelX = offsetX + (firstGridUs * zoomX);

    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#888888';
    ctx.font = '10px monospace';

    for (let x = startPixelX, us = firstGridUs; x < w; x += gridPixelWidth, us += usPerGrid) {
        if (x < 0) continue;
        
        // Vertikale Rasterlinie durch alle Kanäle ziehen
        ctx.beginPath();
        ctx.moveTo(x, timelineHeight);
        ctx.lineTo(x, h);
        ctx.stroke();

        // Tick-Marke im Lineal zeichnen
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(x, timelineHeight - 8);
        ctx.lineTo(x, timelineHeight);
        ctx.stroke();

        // Textbeschriftung (µs)
        ctx.fillText(`${us.toFixed(1)} µs`, x + 4, timelineHeight - 4);
    }
    
    // Trennlinie unter dem Lineal
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(0, timelineHeight);
    ctx.lineTo(w, timelineHeight);
    ctx.stroke();

    // --- B. KANÄLE ZEICHNEN ---
    channels.forEach((ch, idx) => {
        const topY = timelineHeight + (idx * chHeight);
        const bottomY = topY + chHeight;
        
        // Signal-Spannungspegel innerhalb des Kanal-Slots berechnen
        const padding = chHeight * 0.2;
        const yHigh = topY + padding;
        const yLow = bottomY - padding;

        // Kanal-Hintergrundbeschriftung
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.font = '11px sans-serif';
        ctx.fillText(ch.name, 10, topY + 18);

        // Trennlinie zwischen den Kanälen
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(0, bottomY);
        ctx.lineTo(w, bottomY);
        ctx.stroke();

        // Signalverlauf zeichnen
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let currentX = offsetX;
        let lastY = ch.data[0]?.state === 1 ? yHigh : yLow;
        ctx.moveTo(currentX, lastY);

        for (const sample of ch.data) {
            const nextX = currentX + (sample.duration * zoomX);
            const targetY = sample.state === 1 ? yHigh : yLow;

            if (nextX >= 0 && currentX <= w) {
                ctx.lineTo(currentX, targetY);
                ctx.lineTo(nextX, targetY);
            } else {
                ctx.moveTo(nextX, targetY);
            }

            currentX = nextX;
            if (currentX > w) break;
        }
        ctx.stroke();
    });

    // --- C. MARKER ZEICHNEN ---
    const drawMarker = (usValue, color, label) => {
        if (usValue === null) return;
        const posX = offsetX + (usValue * zoomX);
        if (posX < 0 || posX > w) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); // Gestrichelte Linie
        
        ctx.beginPath();
        ctx.moveTo(posX, timelineHeight);
        ctx.lineTo(posX, h);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // Marker-Fahne oben
        ctx.fillStyle = color;
        ctx.fillRect(posX - 10, 0, 20, 15);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(label, posX - 3, 11);
    };

    drawMarker(markerA, '#0077ff', 'A');
    drawMarker(markerB, '#ffaa00', 'B');

    // Infoboxen ausserhalb updaten
    updateMeasurementUI();
}

// --- 4. Mathematische Auswertung & UI-Update ---
function updateMeasurementUI() {
    const valA = document.getElementById('valA');
    const valB = document.getElementById('valB');
    const valDelta = document.getElementById('valDelta');
    const valFreq = document.getElementById('valFreq');

    valA.innerText = markerA !== null ? `${markerA.toFixed(2)} µs` : "--";
    valB.innerText = markerB !== null ? `${markerB.toFixed(2)} µs` : "--";

    if (markerA !== null && markerB !== null) {
        const delta = Math.abs(markerB - markerA);
        valDelta.innerText = `${delta.toFixed(2)} µs`;

        if (delta > 0) {
            const freqHz = 1000000 / delta; // 1s = 1.000.000 µs
            if (freqHz >= 1000000) {
                valFreq.innerText = `${(freqHz / 1000000).toFixed(2)} MHz`;
            } else if (freqHz >= 1000) {
                valFreq.innerText = `${(freqHz / 1000).toFixed(2)} kHz`;
            } else {
                valFreq.innerText = `${freqHz.toFixed(1)} Hz`;
            }
        } else {
            valFreq.innerText = "--";
        }
    } else {
        valDelta.innerText = "--";
        valFreq.innerText = "--";
    }
}

// --- 5. Event Listener für Interaktionen ---

// Tastaturabfrage für Marker-Modus (A oder B Taste halten)
window.addEventListener('keydown', (e) => { activeKey = e.key.toLowerCase(); });
window.addEventListener('keyup', () => { activeKey = null; });

// Canvas-Klicks & Dragging verarbeiten
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
// Berechnen, welcher Mikrosekunden-Wert angeklickt wurde
const clickedUs = (mouseX - offsetX) / zoomX;
// Falls A oder B gedrückt gehalten wird -> Marker verschieben statt scrollen
if (activeKey === 'a') {
markerA = Math.max(0, clickedUs);
draw();
} else if (activeKey === 'b') {
markerB = Math.max(0, clickedUs);
draw();
} else {
// Normaler Scroll-Modus
isDragging = true;
startX = e.clientX - offsetX;
}
});
window.addEventListener('mousemove', (e) => {
if (!isDragging) return;
offsetX = e.clientX - startX;
draw();
});
window.addEventListener('mouseup', () => { isDragging = false; });
// Zoom-Steuerung via Mausrad (fokussiert auf Mausposition)
canvas.addEventListener('wheel', (e) => {
e.preventDefault();
const rect = canvas.getBoundingClientRect();
const mouseX = e.clientX - rect.left;
const zoomIntensity = 0.12;
const oldZoom = zoomX;
if (e.deltaY < 0) {
zoomX *= (1 + zoomIntensity);
} else {
zoomX /= (1 + zoomIntensity);
}
zoomX = Math.max(0.05, Math.min(zoomX, 100)); // Zoom-Limits
offsetX = mouseX - (mouseX - offsetX) * (zoomX / oldZoom);
draw();
}, { passive: false });
// Initialer Renderaufruf
draw();