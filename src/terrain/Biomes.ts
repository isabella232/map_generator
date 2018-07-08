import * as util from "../utility/Utils";
import TriangleMesh from "../mesh/DualMesh";
import { Terrain, Terrains } from "../model/Terrain";
import Region from "../model/Region";
import { MapCfg } from "../model/MapCfg";

/**
 * A coast region is land that has an ocean neighbor
 */
export function assign_r_coast(mesh: TriangleMesh): void {
    let out_r: Region[] = [];
    for (let r1 of mesh.regions) {
        mesh.r_circulate_r(out_r, r1);
        if (!r1.ocean) {
            for (let r2 of out_r) {
                if (r2.ocean) {
                    r1.coast = true;
                    break;
                }
            }
        }
    }
}

/**
 * Temperature assignment
 *
 * Temperature is based on elevation and latitude.
 * The normal range is 0.0=cold, 1.0=hot, but it is not
 * limited to that range, especially when using temperature bias.
 *
 * The northernmost parts of the map get bias_north added to them;
 * the southernmost get bias_south added; in between it's a blend.
 */
export function assign_r_temperature(mesh: TriangleMesh, bias_north: number, bias_south: number): void {
    for (let r of mesh.regions) {
        let latitude = r.y / MapCfg.height;
        /* 0.0 - 1.0 */
        let d_temperature = util.mix(bias_north, bias_south, latitude);
        r.temperature = 1.0 - r.elevation + d_temperature;
    }
}

function biome(r: Region): Terrain {
    if (r.ocean) {
        return Terrains.OCEAN;
    } else if (r.water) {
        if (r.temperature > 0.9) {
            return Terrains.MARSH;
        } else if (r.temperature < 0.2) {
            return Terrains.ICE;
        } else {
            return Terrains.LAKE;
        }
    } else if (r.coast) {
        return Terrains.BEACH;
    } else if (r.temperature < 0.2) {
        if (r.moisture > 0.50) {
            return Terrains.SNOW;
        } else if (r.moisture > 0.33) {
            return Terrains.TUNDRA;
        } else if (r.moisture > 0.16) {
            return Terrains.BARE;
        } else {
            return Terrains.SCORCHED;
        }
    } else if (r.temperature < 0.4) {
        if (r.moisture > 0.66) {
            return Terrains.TAIGA;
        } else if (r.moisture > 0.33) {
            return Terrains.SHRUB_LAND;
        } else {
            return Terrains.TEMPERATE_DESERT;
        }
    } else if (r.temperature < 0.7) {
        if (r.moisture > 0.83) {
            return Terrains.TEMPERATE_RAIN_FOREST;
        } else if (r.moisture > 0.50) {
            return Terrains.TEMPERATE_DECIDUOUS_FOREST;
        } else if (r.moisture > 0.16) {
            return Terrains.GRASSLAND;
        } else {
            return Terrains.TEMPERATE_DESERT;
        }
    } else {
        if (r.moisture > 0.66) {
            return Terrains.TROPICAL_RAIN_FOREST;
        } else if (r.moisture > 0.33) {
            return Terrains.TROPICAL_SEASONAL_FOREST;
        } else if (r.moisture > 0.16) {
            return Terrains.GRASSLAND;
        } else {
            return Terrains.SUBTROPICAL_DESERT;
        }
    }
}

/**
 * Biomes assignment -- see the biome() function above
 */
export function assign_r_biome(mesh: TriangleMesh): void {
    for (let r of mesh.regions) {
        r.biome = biome(r);
    }
}
