export default class Analyzer {

    static DATA_COLOR = '#00ffff';
    static GRID_COLOR = '#d61717';
    static XAXIS_COLOR = '#33ff66';
    static SIGNAL_COLOR = '#00ff66';
    static ENABLE_COLOR = '#d61717';

    canvas = null;
    context = null;

    startX = 0;
    zoomX = 0;
    offsetX = 0;
    isDragging = false;

    input = [];
    channels = [];

    /**
     * 
     */
    constructor() {

    }

    /**
     * 
     * @param {*} id 
     * @returns 
     */
    setCanvasId(id) {
        this.canvas = document.getElementById(id);
        this.context = this.canvas.getContext('2d');

        return this;
    }

    /**
     * 
     * @param {*} input 
     * @returns 
     */
    setInput(input) {
        this.input = (input) ? input : this.input;

        return this;
    }

    setChannels(channels) {
        this.channels = (channels) ? channels : this.channels;

        return this;
    }

}