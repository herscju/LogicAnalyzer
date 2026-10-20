/**
 * 
 */
import Analyzer from "./Analyzer.js"

export default class AdvancedAnalyzer extends Analyzer {

    activeKeys = {};
    activeKey = null;
    additionalKey = null;
    numberOfKeys = 0;
    markerA = 0;
    markerB = 0;

    /**
     * 
     */
    constructor() {
        super();

        this.startX = 0;            // Status für das Ziehen (Pan / Scroll)
        this.zoomX = 1.5;           // Streckungsfaktor auf der X-Achse
        this.offsetX = 50.0;        // Horizontaler Versatz (Scroll-Position in Pixeln)
        this.isDragging = false;    // Status für das Ziehen (Pan / Scroll)
        this.activeKeys = {};       // Erkennt ob 'a' oder 'b' und die Pfeiltasten gedrückt gehalten wird
        this.activeKey = null;      // Erkennt ob 'a' oder 'b' gedrückt gehalten wird
        this.additionalKey = null;  // Erkennt weitere Tasten
        this.numberOfKeys = 0;      // Anzahl gedrückter Tasten
        this.markerA = 40;          // Marker-Positionen in Mikrosekunden (µs). null bedeutet nicht gesetzt.
        this.markerB = 160;         // Marker-Positionen in Mikrosekunden (µs). null bedeutet nicht gesetzt.

    }

   aaaaaaaa /**
     * 
     * @returns 
     */
    addEventHandler() {
        if (!this.canvas && !this.context) {
            return;
        }

        // Tastaturabfrage für Marker-Modus (A oder B Taste halten)
        window.addEventListener('keydown', (e) => {
            this.activeKey = e.key.toLowerCase();

            // Erkennt ob 'a' oder 'b' gedrückt gehalten wird
            this.activeKeys[e.key.toLowerCase()] = true;

            // Prüfen, ob (a ODER b) UND (Pfeil Links ODER Pfeil Rechts) gedrückt sind
            const isAorB = this.activeKeys['a'] || this.activeKeys['b'];
            const isLeftOrRight = this.activeKeys['arrowleft'] || this.activeKeys['arrowright'];

            if (isAorB && isLeftOrRight) {
                if (this.activeKeys['a'] && this.activeKeys['arrowleft']) {
                    this.markerA--;
                } else if (this.activeKeys['a'] && this.activeKeys['arrowright']) {
                    this.markerA++;
                } else if (this.activeKeys['b'] && this.activeKeys['arrowleft']) {
                    this.markerB--;
                } else {
                    this.markerB++;
                }
                this.drawLogicTimeline();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.activeKey = null;

            // Löscht die Taste aus dem Speicher, wenn sie losgelassen wird
            delete this.activeKeys[e.key.toLowerCase()];
        });

        // Canvas-Klicks & Dragging verarbeiten
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            // Berechnen, welcher Mikrosekunden-Wert angeklickt wurde
            const clickedUs = (mouseX - this.offsetX) / this.zoomX;

            // Falls A oder B gedrückt gehalten wird -> Marker verschieben statt scrollen
            if (this.activeKey === 'a') {
                this.markerA = Math.max(0, clickedUs);
                this.drawLogicTimeline();
            } else if (this.activeKey === 'b') {
                this.markerB = Math.max(0, clickedUs);
                this.drawLogicTimeline();
            } else {
                // Normaler Scroll-Modus
                this.isDragging = true;
                this.startX = e.clientX - this.offsetX;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) {
                return;
            }

            this.offsetX = e.clientX - this.startX;
            this.drawLogicTimeline();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Zoom-Steuerung via Mausrad (fokussiert auf Mausposition)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const zoomIntensity = 0.12;
            const oldZoom = this.zoomX;
            if (e.deltaY < 0) {
                this.zoomX *= (1 + zoomIntensity);
            } else {
                this.zoomX /= (1 + zoomIntensity);
            }
            this.zoomX = Math.max(0.05, Math.min(this.zoomX, 100)); // Zoom-Limits
            this.offsetX = mouseX - (mouseX - this.offsetX) * (this.zoomX / oldZoom);

            this.drawLogicTimeline();
        }, { passive: false });

        return this;
    }

    /**
     * Haupt-Zeichenfunktion (Render Loop)
     * @returns 
     */
    drawLogicTimeline() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.context.clearRect(0, 0, w, h);

        const timelineHeight = 30; // Höhe des Lineals oben
        const channelAreaHeight = h - timelineHeight;
        const chHeight = channelAreaHeight / this.channels.length; // Höhe pro Kanal-Slot

        // --- A. ZEIT-LINEAL (TIMELINE TRACE) ---
        this.context.fillStyle = '#161616';
        this.context.fillRect(0, 0, w, timelineHeight);

        // Berechnen, wie viele µs pro Hauptgitter-Teilung sinnvoll sind
        // Schrittweiten-Autoscaling basierend auf Zoomstufe
        let usPerGrid = 10;
        if (this.oomX < 0.3) usPerGrid = 100;
        else if (this.zoomX < 0.8) usPerGrid = 50;
        else if (this.zoomX > 4) usPerGrid = 2;
        else if (this.zoomX > 10) usPerGrid = 0.5;

        const gridPixelWidth = usPerGrid * this.zoomX;
        // Ersten sichtbaren Gitter-Tick links vom Schirm berechnen
        const firstGridUs = Math.ceil(-this.offsetX / gridPixelWidth) * usPerGrid;
        const startPixelX = this.offsetX + (firstGridUs * this.zoomX);

        this.context.strokeStyle = '#2d2d2d';
        this.context.lineWidth = 1;
        this.context.fillStyle = '#888888';
        this.context.font = '10px monospace';

        for (let x = startPixelX, us = firstGridUs; x < w; x += gridPixelWidth, us += usPerGrid) {
            if (x < 0) continue;

            // Vertikale Rasterlinie durch alle Kanäle ziehen
            this.context.beginPath();
            this.context.moveTo(x, timelineHeight);
            this.context.lineTo(x, h);
            this.context.stroke();

            // Tick-Marke im Lineal zeichnen
            this.context.strokeStyle = '#555';
            this.context.beginPath();
            this.context.moveTo(x, timelineHeight - 8);
            this.context.lineTo(x, timelineHeight);
            this.context.stroke();

            // Textbeschriftung (µs)
            this.context.fillText(`${us.toFixed(1)} µs`, x + 4, timelineHeight - 4);
        }

        // Trennlinie unter dem Lineal
        this.context.strokeStyle = '#444';
        this.context.beginPath();
        this.context.moveTo(0, timelineHeight);
        this.context.lineTo(w, timelineHeight);
        this.context.stroke();

        // --- B. KANÄLE ZEICHNEN ---
        this.channels.forEach((ch, idx) => {
            const topY = timelineHeight + (idx * chHeight);
            const bottomY = topY + chHeight;

            // Signal-Spannungspegel innerhalb des Kanal-Slots berechnen
            const padding = chHeight * 0.2;
            const yHigh = topY + padding;
            const yLow = bottomY - padding;

            // Kanal-Hintergrundbeschriftung
            this.context.fillStyle = 'rgba(255,255,255,0.05)';
            this.context.font = '11px sans-serif';
            this.context.fillText(ch.name, 10, topY + 18);

            // Trennlinie zwischen den Kanälen
            this.context.strokeStyle = '#222';
            this.context.beginPath();
            this.context.moveTo(0, bottomY);
            this.context.lineTo(w, bottomY);
            this.context.stroke();

            // Signalverlauf zeichnen
            this.context.strokeStyle = ch.color;
            this.context.lineWidth = 2;
            this.context.beginPath();

            let currentX = this.offsetX;
            let lastY = ch.data[0]?.state === 1 ? yHigh : yLow;
            this.context.moveTo(currentX, lastY);

            for (const sample of ch.data) {
                const nextX = currentX + (sample.duration * this.zoomX);
                const targetY = sample.state === 1 ? yHigh : yLow;

                if (nextX >= 0 && currentX <= w) {
                    this.context.lineTo(currentX, targetY);
                    this.context.lineTo(nextX, targetY);
                } else {
                    this.context.moveTo(nextX, targetY);
                }

                currentX = nextX;
                if (currentX > w) break;
            }

            this.context.stroke();
        });

        // --- C. MARKER ZEICHNEN ---
        const drawMarker = (usValue, color, label) => {
            if (usValue === null) {
                return;
            }

            const posX = this.offsetX + (usValue * this.zoomX);
            if (posX < 0 || posX > w) return;

            this.context.strokeStyle = color;
            this.context.lineWidth = 1.5;
            this.context.setLineDash([4, 4]); // Gestrichelte Linie

            this.context.beginPath();
            this.context.moveTo(posX, timelineHeight);
            this.context.lineTo(posX, h);
            this.context.stroke();
            this.context.setLineDash([]); // Reset

            // Marker-Fahne oben
            this.context.fillStyle = color;
            this.context.fillRect(posX - 10, 0, 20, 15);
            this.context.fillStyle = '#000';
            this.context.font = 'bold 10px sans-serif';
            this.context.fillText(label, posX - 3, 11);
        };

        drawMarker(this.markerA, '#0077ff', 'A');
        drawMarker(this.markerB, '#ffaa00', 'B');

        // Infoboxen ausserhalb updaten
        this.updateMeasurementUI();

        return this;

    }

    /**
     * Mathematische Auswertung & UI-Update
     * @returns 
     */
    updateMeasurementUI() {
        const valA = document.getElementById('valA');
        const valB = document.getElementById('valB');
        const valDelta = document.getElementById('valDelta');
        const valFreq = document.getElementById('valFreq');

        valA.innerText = this.markerA !== null ? `${this.markerA.toFixed(2)} µs` : "--";
        valB.innerText = this.markerB !== null ? `${this.markerB.toFixed(2)} µs` : "--";

        if (this.markerA !== null && this.markerB !== null) {
            const delta = Math.abs(this.markerB - this.markerA);
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

        return this;
    }

}