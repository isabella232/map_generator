/**
 * Find regions adjacent to rivers; out_r should be a Set
 */
import TriangleMesh from "../mesh/DualMesh";
import Region from "../model/Region";

export function find_riverbanks_r(out_r: Set<Region>, mesh: TriangleMesh) {
    for (let i = 0; i < mesh.numSolidSides; i++) {
        let s = mesh.sides[i];
        if (s.flow > 0) {
            out_r.add(s.start);
            out_r.add(s.end);
        }
    }
}


/**
 * Find lakeshores -- regions adjacent to lakes; out_r should be a Set
 */
export function find_lakeshores_r(out_r: Set<Region>, mesh: TriangleMesh) {
    for (let i = 0; i < mesh.numSolidSides; i++) {
        let s = mesh.sides[i];
        if (s.start.lake) {
            out_r.add(s.start);
            out_r.add(s.end);
        }
    }
}


/**
 * Find regions that have maximum moisture; returns a Set
 */
export function find_moisture_seeds_r(mesh: TriangleMesh): Region[] {
    let seeds_r = new Set<Region>();

    find_riverbanks_r(seeds_r, mesh);
    find_lakeshores_r(seeds_r, mesh);
    return Array.from(seeds_r);
}


/**
 * Assign moisture level. Oceans and lakes have moisture 1.0. Land
 * regions have moisture based on the distance to the nearest fresh
 * water. Lakeshores and riverbanks are distance 0. Moisture will be
 * 1.0 at distance 0 and go down to 0.0 at the maximum distance.
 */
export function assign_r_moisture(mesh: TriangleMesh, seed_r: Region[]) {
    let out_r: Region[] = [];
    let maxDistance = 1;
    while (seed_r.length > 0) {
        let current_r: Region = seed_r.shift();
        mesh.r_circulate_r(out_r, current_r);
        for (let neighbor of out_r) {
            if (!neighbor.water && neighbor.waterDistance === null) {
                let newDistance = 1 + current_r.waterDistance;
                neighbor.waterDistance = newDistance;
                if (newDistance > maxDistance) {
                    maxDistance = newDistance;
                }
                seed_r.push(neighbor);
            }
        }
    }

    for (let r of mesh.regions) {
        r.moisture = r.water ? 1.0 : 1.0 - Math.pow(r.waterDistance / maxDistance, 0.5);
    }
}


/**
 * Redistribute moisture values evenly so that all moistures
 * from min_moisture to max_moisture are equally represented.
 */
export function redistribute_r_moisture(mesh: TriangleMesh, min_moisture: number, max_moisture: number) {
    let land_r: Region[] = [];
    for (let i = 0; i < mesh.numSolidRegions; i++) {
        let r = mesh.regions[i];
        if (!r.water) {
            land_r.push(r);
        }
    }

    land_r.sort((r1, r2) => r1.moisture - r2.moisture);
    for (let i = 0; i < land_r.length; i++) {
        land_r[i].moisture = min_moisture + (max_moisture - min_moisture) * i / (land_r.length - 1);
    }
}
