import WorldMap from "../model/WorldMap";
import { Terrains } from "../model/Terrain";
import Region from "../model/Region";
import Side from "../model/Side";

function smoothColoring(elevation: number, temperature: number, moisture: number): string {
    // adapted from <https://www.redblobgames.com/maps/terrain-from-noise/>
    if (elevation < 0.0) {
        return `rgb(${(48 + 48 * elevation) | 0},
                    ${(64 + 64 * elevation) | 0},
                    ${(127 + 128 * elevation) | 0})`;
    }

    // Green or brown at low elevation, and make it more white-ish
    // as you get colder
    let white = (1 - temperature) * (1 - temperature);
    moisture = 1.0 - ((1 - moisture) * (1 - moisture));
    let red = 210 - 100 * moisture, grn = 185 - 45 * moisture, blu = 139 - 45 * moisture;
    return `rgb(${(255 * white + red * (1 - white)) | 0},
                ${(255 * white + grn * (1 - white)) | 0},
                ${(255 * white + blu * (1 - white)) | 0})`;
}

export class ColorStyle {
    noisy: boolean;
    lineWidth: number;
    strokeStyle: string;

    constructor(noisy: boolean, lineWidth: number, strokeStyle: string) {
        this.noisy = noisy;
        this.lineWidth = lineWidth;
        this.strokeStyle = strokeStyle;
    }
}

export class Coloring {
    static draw_coast_s(map: WorldMap, s: Side): boolean {
        return s.start.ocean !== s.end.ocean;
    }

    static draw_lakeside_s(map: WorldMap, s: Side) {
        return (s.start.water !== s.end.water
            && !s.start.ocean
            && s.start.biome !== Terrains.ICE
            && s.end.biome !== Terrains.ICE);
    }

    static draw_river_s(map: WorldMap, s: Side) {
        return ((s.flow > 0 || s.pair.flow > 0) && !s.start.water && !s.end.water);
    }

    biome(map: WorldMap, r: Region): string {
        return "#FF0000";
    }

    side(map: WorldMap, s: Side): ColorStyle {
        if (Coloring.draw_coast_s(map, s)) {
            // Coastlines are thick
            return new ColorStyle(true, 3, Terrains.COAST.color);
        } else if (Coloring.draw_lakeside_s(map, s)) {
            // Lake boundary
            return new ColorStyle(true, 1.5, Terrains.LAKE_SHORE.color);
        } else if (Coloring.draw_river_s(map, s)) {
            // River
            return new ColorStyle(true, 2.0 * Math.sqrt(s.flow), Terrains.RIVER.color);
        } else if (s.start.biome === s.end.biome) {
            return new ColorStyle(false, 1.0, this.biome(map, s.start));
        } else {
            return new ColorStyle(true, 1.0, this.biome(map, s.start));
        }
    }
}

export class Discrete extends Coloring {
    biome(map: WorldMap, r: Region): string {
        return r.biome.color;
    }
}

export class Smooth extends Coloring {
    biome(map: WorldMap, r: Region): string {
        if (r.lake) {
            return r.biome.color;
        } else {
            return smoothColoring(r.elevation, Math.min(1, Math.max(0, r.temperature)), Math.min(1, Math.max(0, r.moisture)));
        }
    }
}
