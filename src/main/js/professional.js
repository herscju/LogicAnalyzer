import SimpleAnalyzer from "./SimpleAnalyzer.js"

const signalData = [];
let lastState = 0;
for (let i = 0; i < 200; i++) {
    lastState = lastState === 0 ? 1 : 0;
    // Zufällige Dauer für Takt- und Datenzyklen
    const duration = Math.floor(Math.random() * 40) + 10;
    signalData.push({ state: lastState, duration: duration });
}

let analyzer = new SimpleAnalyzer();
analyzer.setCanvasId('analyzerCanvas').setInput(signalData).addEventHandler().drawLogicTimeline();
