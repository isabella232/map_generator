/**
 * Return value, unless it's undefined, then return orElse
 */
import * as SimplexNoise from "simplex-noise";
import Region from "../model/Region";

export function fallback(value: any, orElse: any) {
    return (value !== undefined) ? value : orElse;
}

/**
 * Add several noise values together
 */
export function fbm_noise(noise: SimplexNoise, amplitudes: number[], nx: number, ny: number): number {
    let sum = 0, sumOfAmplitudes = 0;
    for (let octave = 0; octave < amplitudes.length; octave++) {
        let frequency = 1 << octave;
        sum += amplitudes[octave] * noise.noise2D(nx * frequency, ny * frequency);
        sumOfAmplitudes += amplitudes[octave];
    }
    return sum / sumOfAmplitudes;
}

/**
 * Like GLSL. Return t clamped to the range [lo,hi] inclusive
 */
export function clamp(t: number, lo: number, hi: number): number {
    if (t < lo) {
        return lo;
    }
    if (t > hi) {
        return hi;
    }
    return t;
}

/**
 * Like GLSL. Return a mix of a and b; all a when is 0 and all b when
 * t is 1; extrapolates when t outside the range [0,1]
 */
export function mix(a: number, b: number, t: number): number {
    return a * (1.0 - t) + b * t;
}

/**
 * Componentwise mix for arrays of equal length; output goes in 'out'
 */
export function mixp(p: Region, q: Region, t: number): Region {
    return Region.valueOf(mix(p.x, q.x, t), mix(p.y, q.y, t));
}

/**
 * Like GLSL.
 */
export function smoothstep(a: number, b: number, t: number): number {
    // https://en.wikipedia.org/wiki/Smoothstep
    if (t <= a) {
        return 0;
    }
    if (t >= b) {
        return 1;
    }
    t = (t - a) / (b - a);
    return (3 - 2 * t) * t * t;
}

/**
 * Circumcenter of a triangle with regions a,b,c
 */
export function circumcenter(a: number[], b: number[], c: number[]): number[] {
    // https://en.wikipedia.org/wiki/Circumscribed_circle#Circumcenter_coordinates
    let ad = a[0] * a[0] + a[1] * a[1],
        bd = b[0] * b[0] + b[1] * b[1],
        cd = c[0] * c[0] + c[1] * c[1];
    let D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    let Ux = 1 / D * (ad * (b[1] - c[1]) + bd * (c[1] - a[1]) + cd * (a[1] - b[1]));
    let Uy = 1 / D * (ad * (c[0] - b[0]) + bd * (a[0] - c[0]) + cd * (b[0] - a[0]));
    return [Ux, Uy];
}

/**
 * Intersection of line p1--p2 and line p3--p4,
 * between 0.0 and 1.0 if it's in the line segment
 */
export function lineIntersection(x1: any, y1: any, x2: any, y2: any, x3: any, y3: any, x4: any, y4: any) {
    // from http://paulbourke.net/geometry/pointlineplane/
    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    return {ua, ub};
}

/**
 * in-place shuffle of an array - Fisher-Yates
 * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 */
export function randomShuffle(array: any[], randInt: (x: number) => number): number[] {
    for (let i = array.length - 1; i > 0; i--) {
        let j = randInt(i + 1);
        let swap = array[i];
        array[i] = array[j];
        array[j] = swap;
    }
    return array;
}
