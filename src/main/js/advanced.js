import AdvancedAnalyzer from "./AdvancedAnalyzer.js"
import Analyzer from "./Analyzer.js";

// Kanal-Definitionen
const channels = [
    { "name": "CH1: CLK (Clock)", "color": Analyzer.SIGNAL_COLOR, "data": [] },
    { "name": "CH2: DATA", "color": Analyzer.DATA_COLOR, "data": [] },
    { "name": "CH3: ENABLE", "color": Analyzer.ENABLE_COLOR, "data": [] }
];

// Daten generieren
let s1 = 0;
let s2 = 0;

for (let i = 0; i < 300; i++) {
    // CH1: Konstanter schneller Takt (z.B. alle 10µs Flanke)
    s1 = s1 === 0 ? 1 : 0;
    channels[0].data.push({ "state": s1, "duration": 10 });

    // CH2: Zufällige Datenbits, etwas langsamer
    if (i % 3 === 0) {
        s2 = Math.random() > 0.5 ? 1 : 0;
        channels[1].data.push({ "state": s2, "duration": 30 });
    }
}

// CH3: Ein langes Enable-Signal
channels[2].data.push({ "state": 1, "duration": 150 });
channels[2].data.push({ "state": 0, "duration": 250 });
channels[2].data.push({ "state": 1, "duration": 1000 });



let analyzer = new AdvancedAnalyzer();
analyzer.setCanvasId('analyzerCanvas').setChannels(channels).addEventHandler().drawLogicTimeline();
