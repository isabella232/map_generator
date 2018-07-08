import SimplexNoise = require("simplex-noise");

export class ShapeOpts {
    round = 0;
    inflate = 0;
    amplitudes: number[] = [];

    constructor(round = 0, inflate = 0, amplitudes: number[] = []) {
        this.round = round;
        this.inflate = inflate;
        this.amplitudes = amplitudes;
    }
}

export class NoisyEdgeOpts {
    length = 0;
    amplitude = 0;
    seed = 0;

    constructor(length = 0, amplitude = 0, seed = 0) {
        this.length = length;
        this.amplitude = amplitude;
        this.seed = seed;
    }
}

export class BiomeBiasOpts {
    northTemperature = 0;
    southTemperature = 0;
    moisture = 0;

    constructor(northTemperature = 0, southTemperature = 0, moisture = 0) {
        this.northTemperature = northTemperature;
        this.southTemperature = southTemperature;
        this.moisture = moisture;
    }
}

class MapOptsClass {
    noise: SimplexNoise;
    numRivers = 0;
    drainageSeed = 0;
    riverSeed = 0;
    biomeBias: BiomeBiasOpts;
    noisyEdge: NoisyEdgeOpts;
    shape: ShapeOpts;
}

export const MapOpts = new MapOptsClass();
