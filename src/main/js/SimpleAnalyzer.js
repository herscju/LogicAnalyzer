/**
 * 
 */
import Analyzer from "./Analyzer.js"

export default class SimpleAnalyzer extends Analyzer {

    /**
     * 
     */
    constructor() {
        super();

        this.startX = 0;            // Status für das Ziehen (Pan / Scroll)
        this.zoomX = 2.0;           // Streckungsfaktor auf der X-Achse
        this.offsetX = 20.0;        // Horizontaler Versatz (Scroll-Position in Pixeln)
        this.isDragging = false;    // Status für das Ziehen (Pan / Scroll)
    }

    /**
     * 
     * @returns 
     */
    addEventHandler() {
        if (!this.canvas && !this.context) {
            return;
        }

        // Scrollen (Pan) via Maus-Drag
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX - this.offsetX;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) {
                return;
            };

            this.offsetX = e.clientX - this.startX;
            this.drawLogicTimeline();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Zoomen via Mausrad (Zentriert auf den Mauszeiger)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); // Verhindert das Scrollen der Webseite

            // Aktuelle Mausposition auf dem Canvas bestimmen
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            console.log(rect + " --> " + mouseX);

            // Zoom-Faktor ermitteln (Rauf = Vergrössern, Runter = Verkleinern)
            const zoomIntensity = 0.1;
            const oldZoom = this.zoomX;

            if (e.deltaY < 0) {
                this.zoomX *= (1 + zoomIntensity);
            } else {
                this.zoomX /= (1 + zoomIntensity);
            }

            // Zoom-Grenzen setzen, damit man sich nicht unendlich verliert
            this.zoomX = Math.max(0.1, Math.min(this.zoomX, 50));

            // Magischer Schritt: Offset so verschieben, dass der Punkt unter der Maus fix bleibt
            this.offsetX = mouseX - (mouseX - this.offsetX) * (this.zoomX / oldZoom);

            this.drawLogicTimeline();
        }, { passive: false });

        return this;
    }

    /**
     * 
     * @param {*} input 
     */
    drawLogicTimeline(input) {
        this.input = (input) ? input : this.input;

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        const paddingY = 30;
        const yHigh = paddingY;
        const yLow = canvasHeight - paddingY;

        this.context.clearRect(0, 0, canvasWidth, canvasHeight);

        // Dynamische Gitterlinien (Skalieren und scrollen mit dem Zoom mit)
        this.context.strokeStyle = Analyzer.GRID_COLOR;
        this.context.lineWidth = 1;

        const gridSize = 50 * this.zoomX;
        const gridStart = this.offsetX % gridSize;
        for (let x = gridStart; x < canvasWidth; x += gridSize) {
            this.context.beginPath();
            this.context.moveTo(x, 0);
            this.context.lineTo(x, canvasHeight);
            this.context.stroke();
        }

        // Null-Linie / Achse anzeigen
        this.context.strokeStyle = Analyzer.XAXIS_COLOR;
        this.context.lineWidth = 1;
        this.context.beginPath();
        this.context.moveTo(0, yLow);
        this.context.lineTo(canvasWidth, yLow);
        this.context.stroke();

        // Signalpfad zeichnen
        this.context.strokeStyle = Analyzer.SIGNAL_COLOR;
        this.context.lineWidth = 2.5;
        this.context.beginPath();

        let currentX = this.offsetX;
        let lastY = this.input[0].state === 1 ? yHigh : yLow;

        this.context.moveTo(currentX, lastY);

        for (const sample of this.input) {
            // Die originale Dauer wird mit dem Zoom-Faktor multipliziert
            const nextX = currentX + (sample.duration * this.zoomX);
            const targetY = sample.state === 1 ? yHigh : yLow;

            // Optimierung: Nur zeichnen, wenn das Signal im sichtbaren Bereich liegt
            if (nextX >= 0 && currentX <= canvasWidth) {
                // Flanke nach oben/unten
                this.context.lineTo(currentX, targetY);
                // Waagerechte Linie des Zustands
                this.context.lineTo(nextX, targetY);
            } else {
                // Falls ausserhalb des Bildschirms, Cursor stumm weiterbewegen
                this.context.moveTo(nextX, targetY);
            }

            currentX = nextX;
            if (currentX > canvasWidth) break; // Abbrechen, wenn rechter Rand erreicht ist
        }

        this.context.stroke();

        return this;
    }

}
