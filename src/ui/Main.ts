import WorldMap from "../model/WorldMap";
import TriangleMesh from "../mesh/DualMesh";
import { makeRandFloat, makeRandInt } from "../utility/Random";
import * as Colormap from "./Coloring";
import * as Draw from "./Draw";

import * as SimplexNoise from "simplex-noise";
import { BiomeBiasOpts, NoisyEdgeOpts, MapOpts, ShapeOpts } from "../model/MapOptions";
import MapIcons from "./MapIcons";
import { UiSize } from "./UiSize";
import UiState from "./UiState";
import { MapCfg } from "../model/MapCfg";

const urlUtils = require("url-search-utils");

let uiState = new UiState();

let _mapCache: { [key: string]: WorldMap } = {};

function getMap(size: UiSize): WorldMap {
    if (!_mapCache[size]) {
        // NOTE: the seeds here are constant so that I can reuse the same
        // mesh and noisy sides for all maps, but you could get more variety
        // by creating a new Map object each time
        let noisyEdge = new NoisyEdgeOpts(4, 0.2, 12345);
        let mesh: TriangleMesh = new TriangleMesh(size, makeRandFloat(12345), []);
        _mapCache[size] = new WorldMap(mesh, noisyEdge, makeRandInt);
        console.log(`Map size "${size}" has ${_mapCache[size].mesh.regions.length} regions`);
    }
    return _mapCache[size];
}


/**
 * Manage drawing with requestAnimationFrame
 *
 * 1. Each frame call one function from the queue.
 * 2. If the queue empties, stop calling requestAnimationFrame.
 */
let requestAnimationFrameId: number = null;
let requestAnimationFrameQueue: (() => void)[] = [];

function requestAnimationFrameHandler(): void {
    requestAnimationFrameId = null;
    let timeStart = performance.now();
    while (requestAnimationFrameQueue.length > 0 && performance.now() - timeStart < 1000 / 60) {
        let f = requestAnimationFrameQueue.shift();
        f();
    }
    if (requestAnimationFrameQueue.length > 0) {
        requestAnimationFrameId = requestAnimationFrame(requestAnimationFrameHandler);
    }
}

/* map icons */
const mapIcons: MapIcons = <MapIcons>{
    left: 9,
    top: 4,
    filename: "map-icons.png"
};
mapIcons.image = new Image();
mapIcons.image.onload = draw;
mapIcons.image.src = mapIcons.filename;

let _lastUiState: UiState;

function draw(): void {
    let worldMap = getMap(uiState.size);
    let noisyEdges = uiState.noisyEdges;
    let noisyFills = uiState.noisyFills;

    let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('map');
    let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

    let size = Math.min(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    if (size !== uiState.canvasSize) {
        // Don't assign to width,height if the size hasn't changed because
        // it will blank out the canvas and we'd like to reuse the previous draw
        uiState.canvasSize = size;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        size = MapCfg.canvasSize;
        if (window.devicePixelRatio && window.devicePixelRatio !== 1) {
            size *= window.devicePixelRatio;
        }
        canvas.width = size;
        canvas.height = size;
    }

    let noise = new SimplexNoise(makeRandFloat(uiState.seed));
    let persistence = Math.pow(1 / 2, 1 + uiState.persistence);
    let islandShapeAmplitudes = Array.from({length: 5}, (_, octave) => Math.pow(persistence, octave));
    let coloring = uiState.biomes ? new Colormap.Discrete() : new Colormap.Smooth();
    let queue: (() => void)[] = [];
    if ((!noisyEdges || uiState.size === UiSize.large || uiState.size === UiSize.huge) && !uiState.cached(_lastUiState)) {
        // Noisy sides are slow enough that it'd be nice to have a
        // quick approximation drawn first, but if the last time we
        // drew something was with the same essential parameters let's
        // reuse the drawing from last time
        let opts = new ShapeOpts(MapCfg.islandRound, MapCfg.islandInflate, islandShapeAmplitudes.slice(0, 3));
        queue.push(() => Draw.approximateIslandShape(ctx, MapCfg.width, MapCfg.height, noise, opts));
    }
    _lastUiState = uiState;

    MapOpts.noise = noise;
    MapOpts.numRivers = uiState.rivers;
    MapOpts.drainageSeed = uiState.variant;
    MapOpts.riverSeed = uiState.variant;
    MapOpts.biomeBias = new BiomeBiasOpts(uiState.northTemperature, uiState.southTemperature, uiState.rainfall);
    MapOpts.noisyEdge = new NoisyEdgeOpts(10, 0.2, 0);
    MapOpts.shape = new ShapeOpts(MapCfg.islandRound, MapCfg.islandInflate, islandShapeAmplitudes);

    queue.push(() => worldMap.calculate());
    queue.push(() => {
            Draw.background(ctx, coloring);
            Draw.noisyRegions(ctx, worldMap, coloring, noisyEdges);
            // Draw the rivers early for better user experience
            Draw.rivers(ctx, worldMap, coloring, noisyEdges, true);
        }
    );

    for (let phase = 0; phase < 16; phase++) {
        queue.push(() => Draw.noisyEdges(ctx, worldMap, coloring, noisyEdges, phase));
    }

    // Have to draw the rivers and coastlines again because the noisy
    // sides might overwrite them, and these should take priority over
    // the other noisy sides. Otherwise it leaves little gaps that look
    // ugly when zoomed in.
    queue.push(() => Draw.rivers(ctx, worldMap, coloring, noisyEdges, false));
    queue.push(() => Draw.coastlines(ctx, worldMap, coloring, noisyEdges));

    if (noisyFills) {
        queue.push(() => Draw.noisyFill(ctx, MapCfg.width, MapCfg.height, makeRandInt(12345)));
    }

    if (uiState.icons) {
        queue.push(() => Draw.regionIcons(ctx, worldMap, mapIcons, makeRandInt(uiState.variant)));
    }

    if (uiState.lighting) {
        queue.push(() => Draw.lighting(ctx, MapCfg.width, MapCfg.height, worldMap));
    }

    requestAnimationFrameQueue = queue.map(
        (layer) => () => {
            // console.time("layer " + i);
            ctx.save();
            ctx.scale(canvas.width / MapCfg.width, canvas.height / MapCfg.width);
            layer();
            ctx.restore();
            // console.timeEnd("layer " + i);
        });

    if (!requestAnimationFrameId) {
        requestAnimationFrameId = requestAnimationFrame(requestAnimationFrameHandler);
    }
}


function initUi() {
    function oninput(element: any) {
        element.addEventListener('input', getUiState);
    }

    function onclick(element: any) {
        element.addEventListener('click', getUiState);
    }

    function onchange(element: any) {
        element.addEventListener('change', getUiState);
    }

    selectAll("input[type='radio']").forEach(onclick);
    selectAll("input[type='checkbox']").forEach(onclick);
    selectAll("input[type='number']").forEach(onchange);
    selectAll("input[type='range']").forEach(oninput);

    // HACK: on touch devices use touch event to make the slider feel better
    selectAll("input[type='range']").forEach((slider: any) => {
        function handleTouch(e: any) {
            let rect = slider.getBoundingClientRect();
            let min = parseFloat(slider.getAttribute('min')),
                max = parseFloat(slider.getAttribute('max')),
                step = parseFloat(slider.getAttribute('step')) || 1;
            let value = (e.changedTouches[0].clientX - rect.left) / rect.width;
            value = min + value * (max - min);
            value = Math.round(value / step) * step;
            if (value < min) {
                value = min;
            }
            if (value > max) {
                value = max;
            }
            slider.value = value;
            slider.dispatchEvent(new Event('input'));
            e.preventDefault();
            e.stopPropagation();
        }

        slider.addEventListener('touchmove', handleTouch, {passive: true});
        slider.addEventListener('touchstart', handleTouch, {passive: true});
    });
}

function setUiState() {
    getInput('seed').value = uiState.seed.toString();
    getInput('variant').value = uiState.variant.toString();
    getInput('rivers').value = uiState.rivers.toString();
    if (!uiState.size) {
        uiState.size = UiSize.medium;
    }
    let size: string = UiSize[UiSize.medium];
    if (UiSize[uiState.size]) {
        size = UiSize[uiState.size];
    }
    selectInput("input#size-" + size).checked = true;
    selectInput("input#noisyEdges").checked = uiState.noisyEdges;
    selectInput("input#noisyFills").checked = uiState.noisyFills;
    selectInput("input#icons").checked = uiState.icons;
    selectInput("input#biomes").checked = uiState.biomes;
    selectInput("input#lighting").checked = uiState.lighting;
    selectInput("input#northTemperature").value = uiState.northTemperature.toString();
    selectInput("input#southTemperature").value = uiState.southTemperature.toString();
    selectInput("input#rainfall").value = uiState.rainfall.toString();
    selectInput("input#persistence").value = uiState.persistence.toString();
}

function getUiState() {
    uiState.seed = getInput('seed').valueAsNumber;
    uiState.variant = getInput('variant').valueAsNumber;
    uiState.rivers = getInput('rivers').valueAsNumber;
    let size: string = selectInput("input[name='size']:checked").value;
    uiState.size = (<any>UiSize)[size];
    uiState.noisyEdges = selectInput("input#noisyEdges").checked;
    uiState.noisyFills = selectInput("input#noisyFills").checked;
    uiState.icons = selectInput("input#icons").checked;
    uiState.biomes = selectInput("input#biomes").checked;
    uiState.lighting = selectInput("input#lighting").checked;
    uiState.northTemperature = selectInput("input#northTemperature").valueAsNumber;
    uiState.southTemperature = selectInput("input#southTemperature").valueAsNumber;
    uiState.rainfall = selectInput("input#rainfall").valueAsNumber;
    uiState.persistence = selectInput("input#persistence").valueAsNumber;
    setUrlFromState();
    draw();
}

function selectAll(selector: string): HTMLElement[] {
    return Array.from(document.querySelectorAll(selector));
}

function selectInput(selector: string): HTMLInputElement {
    return <HTMLInputElement>document.querySelector(selector);
}

function getInput(id: string): HTMLInputElement {
    return <HTMLInputElement>document.getElementById(id);
}

function setSeed(seed: number): void {
    uiState.seed = seed & 0x7fffffff;
    setUiState();
    getUiState();
}

function setVariant(variant: number): void {
    uiState.variant = ((variant % 10) + 10) % 10;
    setUiState();
    getUiState();
}

function setRivers(rivers: number): void {
    uiState.rivers = rivers & 0x7fffffff;
    setUiState();
    getUiState();
}

declare global {
    interface Window {
        prevSeed: () => void;
        nextSeed: () => void;
        prevVariant: () => void;
        nextVariant: () => void;
        prevRivers: () => void;
        nextRivers: () => void;
    }
}

window.prevSeed = () => setSeed(uiState.seed - 1);
window.nextSeed = () => setSeed(uiState.seed + 1);
window.prevVariant = () => setVariant(uiState.variant - 1);
window.nextVariant = () => setVariant(uiState.variant + 1);
window.prevRivers = () => setRivers(uiState.rivers - 1);
window.nextRivers = () => setRivers(uiState.rivers + 1);

let _setUrlFromStateTimeout: any = null;

function _setUrlFromState() {
    _setUrlFromStateTimeout = null;
    let fragment = urlUtils.stringifyParams(uiState, {}, {
        'canvasSize': 'exclude',
        'noisyEdges': 'include-if-falsy',
        'noisyFills': 'include-if-falsy',
    });
    let url = window.location.pathname + "#" + fragment;
    window.history.replaceState({}, null, url);
}

function setUrlFromState() {
    // Rate limit the url update because some browsers (like Safari
    // iOS) throw an error if you change the url too quickly.
    if (_setUrlFromStateTimeout === null) {
        _setUrlFromStateTimeout = setTimeout(_setUrlFromState, 500);
    }
}

function getStateFromUrl() {
    const bool = (value: any) => value === 'true';
    let hashState = urlUtils.parseQuery(
        window.location.hash.slice(1),
        {
            'seed': 'number',
            'drainage': 'number',
            'noisyEdges': bool,
            'noisyFills': bool,
            'icons': bool,
            'biomes': bool,
            'lighting': bool,
            'northTemperature': 'number',
            'southTemperature': 'number',
            'rainfall': 'number',
            'persistence': 'number',
            'size': 'number',
            'rivers': 'number'
        }
    );
    Object.assign(uiState, hashState);
    setUrlFromState();
    setUiState();
    draw();
}

window.addEventListener('hashchange', getStateFromUrl);
window.addEventListener('resize', draw);

initUi();
getStateFromUrl();
setUiState();
