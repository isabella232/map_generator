import * as util from "../utility/Utils";
import WorldMap from "../model/WorldMap";
import { Coloring, ColorStyle } from "./Coloring";
import { ShapeOpts } from "../model/MapOptions";
import * as SimplexNoise from "simplex-noise";
import { Terrains } from "../model/Terrain";
import TriangleMesh from "../mesh/DualMesh";
import Region from "../model/Region";
import MapIcons from "./MapIcons";
import Triangle from "../model/Triangle";
import Side from "../model/Side";
import { MapCfg } from "../model/MapCfg";

const noiseSize = 100;
let noiseCanvas: HTMLCanvasElement = null;

function makeNoise(randInt: (seed: number) => number): void {
    if (noiseCanvas === null) {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = noiseSize;
        noiseCanvas.height = noiseSize;

        let ctx = noiseCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, noiseSize, noiseSize);
        const pixels = imageData.data;

        for (let y = 0, p = 0; y < noiseSize; y++) {
            for (let x = 0; x < noiseSize; x++) {
                let value = 128 + randInt(16) - 8;
                pixels[p++] = value;
                pixels[p++] = value;
                pixels[p++] = value;
                pixels[p++] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

export function noisyFill(ctx: CanvasRenderingContext2D,
                          width: number,
                          height: number,
                          randInt: (seed: number) => number): void {
    makeNoise(randInt);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.drawImage(noiseCanvas, 0, 0, width, height);
    ctx.globalCompositeOperation = 'hard-light';
    for (let y = 0; y < height; y += noiseSize) {
        for (let x = 0; x < width; x += noiseSize) {
            ctx.drawImage(noiseCanvas, x, y, noiseSize, noiseSize);
        }
    }
    ctx.restore();
}

const lightSize = 250;
const lightScaleZ = 15;
const lightVector = [-1, -1, 0];
let lightCanvas: HTMLCanvasElement = null;

// quick & dirty light based on normal vector
function calculateLight(ax: number, ay: number, az: number,
                        bx: number, by: number, bz: number,
                        cx: number, cy: number, cz: number): number {
    az *= lightScaleZ;
    bz *= lightScaleZ;
    cz *= lightScaleZ;
    let ux = bx - ax, uy = by - ay, uz = bz - az,
        vx = cx - ax, vy = cy - ay, vz = cz - az;
    // cross product (ugh I should have a lib for this)
    let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
    let length = -Math.sqrt(nx * nx + ny * ny + nz * nz);
    nx /= length;
    ny /= length;
    nz /= length;
    let dotProduct = nx * lightVector[0] + ny * lightVector[1] + nz * lightVector[2];
    let light = 0.5 + 10 * dotProduct;
    return util.clamp(light, 0, 1);
}

function makeLight(map: WorldMap): void {
    if (lightCanvas === null) {
        lightCanvas = document.createElement('canvas');
        lightCanvas.width = lightSize;
        lightCanvas.height = lightSize;
    }
    let ctx = lightCanvas.getContext('2d');
    ctx.save();
    ctx.scale(lightSize / MapCfg.width, lightSize / MapCfg.height);
    ctx.fillStyle = "hsl(0,0%,50%)";
    ctx.fillRect(0, 0, MapCfg.width, MapCfg.height);
    let mesh = map.mesh;

    // Draw lighting on land; skip in the ocean
    for (let i = 0; i < mesh.numSolidTriangles; i++) {
        let t = mesh.triangles[i];
        if (t.water) {
            continue;
        }
        let {a, b, c} = t;
        let ax = a.x,
            ay = a.y,
            az = a.elevation,
            bx = b.x,
            by = b.y,
            bz = b.elevation,
            cx = c.x,
            cy = c.y,
            cz = c.elevation;
        let light = calculateLight(ax, ay, az * az, bx, by, bz * bz, cx, cy, cz * cz);
        light = util.mix(light, t.elevation, 0.5);
        ctx.strokeStyle = ctx.fillStyle = `hsl(0,0%,${(light * 100) | 0}%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

export function lighting(ctx: CanvasRenderingContext2D, width: number, height: number, map: WorldMap): void {
    makeLight(map);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.drawImage(lightCanvas, 0, 0, width, height);
}

let islandShapeCanvas: HTMLCanvasElement = null;

function makeIsland(noise: SimplexNoise, opts: ShapeOpts): void {
    let islandShapeSize = MapCfg.islandSize;
    if (!islandShapeCanvas) {
        islandShapeCanvas = document.createElement('canvas');
        islandShapeCanvas.width = islandShapeSize;
        islandShapeCanvas.height = islandShapeSize;
    }

    let ctx: CanvasRenderingContext2D = islandShapeCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, islandShapeSize, islandShapeSize);
    const pixels = imageData.data;

    for (let y = 0, p = 0; y < islandShapeSize; y++) {
        let ny = 2 * y / islandShapeSize - 1;
        for (let x = 0; x < islandShapeSize; x++) {
            let nx = 2 * x / islandShapeSize - 1;
            let distance = Math.max(Math.abs(nx), Math.abs(ny));
            let n = util.fbm_noise(noise, opts.amplitudes, nx, ny);
            n = util.mix(n, 0.5, opts.round);
            if (n - (1.0 - opts.inflate) * distance * distance < 0) {
                // water color uses OCEAN discrete color
                pixels[p++] = 0x44;
                pixels[p++] = 0x44;
                pixels[p++] = 0x7a;
            } else {
                // land color uses BEACH discrete color
                pixels[p++] = 0xa0;
                pixels[p++] = 0x90;
                pixels[p++] = 0x77;
            }
            pixels[p++] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

export function approximateIslandShape(ctx: CanvasRenderingContext2D, width: number, height: number, noise: SimplexNoise, opts: ShapeOpts): void {
    makeIsland(noise, opts);
    ctx.drawImage(islandShapeCanvas, 0, 0, width, height);
}

export function background(ctx: CanvasRenderingContext2D, coloring: Coloring): void {
    ctx.fillStyle = Terrains.OCEAN.color;
    ctx.fillRect(0, 0, MapCfg.width, MapCfg.height);
}

export function noisyRegions(ctx: CanvasRenderingContext2D, map: WorldMap, coloring: Coloring, noisyEdge: boolean): void {
    let mesh = map.mesh;
    let out_s: Side[] = [];

    for (let i = 0; i < mesh.numSolidRegions; i++) {
        let r = mesh.regions[i];
        mesh.r_circulate_s(out_s, r);
        let last_t = TriangleMesh.s_inner_t(out_s[0]);
        ctx.fillStyle = ctx.strokeStyle = coloring.biome(map, r);
        ctx.beginPath();
        ctx.moveTo(last_t.pos.x, last_t.pos.y);
        for (let s1 of out_s) {
            if (!noisyEdge || !coloring.side(map, s1).noisy) {
                let first_t = TriangleMesh.s_outer_t(s1);
                ctx.lineTo(first_t.pos.x, first_t.pos.y);
            } else {
                for (let s2 of s1.line) {
                    ctx.lineTo(s2.x, s2.y);
                }
            }
        }
        ctx.fill();
    }
}

/*
 * Helper function: how big is the region?
 *
 * Returns the minimum distance from the region center to a corner
 */
export function region_radius(mesh: TriangleMesh, region: Region): number {
    let min_distance_squared = Infinity;
    let out_t: Triangle[] = [];
    mesh.r_circulate_t(out_t, region);
    for (let t of out_t) {
        let distance_squared = region.disSq(t.pos);
        if (distance_squared < min_distance_squared) {
            min_distance_squared = distance_squared;
        }
    }
    return Math.sqrt(min_distance_squared);
}

/*
 * Draw a biome icon in each of the regions
 */
export function regionIcons(ctx: CanvasRenderingContext2D,
                            map: WorldMap,
                            mapIcons: MapIcons,
                            randInt: (seed: number) => number): void {
    let mesh = map.mesh;
    for (let i = 0; i < mesh.numSolidRegions; i++) {
        let r = mesh.regions[i];
        if (r.boundary) {
            continue;
        }
        let biome = r.biome;
        let radius = region_radius(mesh, r);
        let row = biome.icon;
        // NOTE: mountains reflect elevation, but the biome
        // calculation reflects temperature, so if you set the biome
        // bias to be 'cold', you'll get more snow, but you shouldn't
        // get more mountains, so the mountains are calculated
        // separately from biomes
        if (row === 5 && r.y < 300) {
            row = 9;
        }
        if (r.elevation > 0.8) {
            row = 1;
        }
        if (row === -1) {
            continue;
        }
        let col = 1 + randInt(5);
        ctx.drawImage(mapIcons.image,
            mapIcons.left + col * 100, mapIcons.top + row * 100,
            100, 100,
            r.x - radius, r.y - radius,
            2 * radius, 2 * radius);
    }
}

/*
 * Drawing the region polygons leaves little gaps in HTML5 Canvas
 * so I need to draw sides to fill those gaps. Sometimes those sides
 * are simple straight lines but sometimes they're thick noisy lines
 * like coastlines and rivers.
 *
 * This step is rather slow so it's split up into phases.
 *
 * If 'filter' is defined, filter(side, style) should return true if
 * the edge is to be drawn. This is used by the rivers and coastline
 * drawing functions.
 */
export function noisyEdges(ctx: CanvasRenderingContext2D,
                           map: WorldMap,
                           coloring: Coloring,
                           noisyEdge: boolean,
                           phase: number /* 0-15 */,
                           filter: (s: Side, style: ColorStyle) => boolean = null): void {
    let mesh = map.mesh;
    let begin = (mesh.numSolidSides / 16 * phase) | 0;
    let end = (mesh.numSolidSides / 16 * (phase + 1)) | 0;
    for (let i = begin; i < end; i++) {
        let s1 = mesh.sides[i];
        let style = coloring.side(map, s1);
        if (filter && !filter(s1, style)) {
            continue;
        }
        ctx.strokeStyle = style.strokeStyle;
        ctx.lineWidth = style.lineWidth;
        let last_t = TriangleMesh.s_inner_t(s1);
        ctx.beginPath();
        ctx.moveTo(last_t.pos.x, last_t.pos.y);
        if (!noisyEdge || !style.noisy) {
            let first_t = TriangleMesh.s_outer_t(s1);
            ctx.lineTo(first_t.pos.x, first_t.pos.y);
        } else {
            for (let s2 of s1.line) {
                ctx.lineTo(s2.x, s2.y);
            }
        }
        ctx.stroke();
    }
}

export function vertices(ctx: CanvasRenderingContext2D, map: WorldMap): void {
    let mesh = map.mesh;
    ctx.fillStyle = "black";
    for (let r = 0; r < mesh.numSolidRegions; r++) {
        let region = mesh.regions[r];
        ctx.beginPath();
        ctx.arc(region.x, region.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

export function rivers(ctx: CanvasRenderingContext2D, map: WorldMap, coloring: Coloring, noisyEdge: boolean, fast: boolean): void {
    if (!fast) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    for (let phase = 0; phase < 16; phase++) {
        noisyEdges(ctx, map, coloring, noisyEdge, phase,
            (s: Side, style: ColorStyle) => Coloring.draw_river_s(map, s)
        );
    }
}

export function coastlines(ctx: CanvasRenderingContext2D, map: WorldMap, coloring: Coloring, noisyEdge: boolean): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let phase = 0; phase < 16; phase++) {
        noisyEdges(ctx, map, coloring, noisyEdge, phase,
            (s: Side, style: ColorStyle) => Coloring.draw_coast_s(map, s)
        );
    }
}
