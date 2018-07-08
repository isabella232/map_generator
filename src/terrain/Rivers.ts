import TriangleMesh from "../mesh/DualMesh";
import Triangle from "../model/Triangle";
import { MapCfg } from "../model/MapCfg";

/**
 * Find candidates for river sources
 *
 * Unlike the assign_* functions this does not write into an existing array
 */
export function find_spring_t(mesh: TriangleMesh): Triangle[] {
    let spring_t = new Set<Triangle>();
    // Add everything above some elevation, but not lakes
    for (let i = 0; i < mesh.numSolidTriangles; i++) {
        let t = mesh.triangles[i];
        if (t.elevation >= MapCfg.minSpringElevation && t.elevation <= MapCfg.maxSpringElevation && !t.water) {
            spring_t.add(t);
        }
    }
    return Array.from(spring_t);
}


export function assign_s_flow(mesh: TriangleMesh, river_t: Triangle[]): void {
    // Each river in river_t contributes 1 flow down to the coastline
    for (let t of river_t) {
        for (; ;) {
            let s = t.downslope;
            if (!s) {
                break;
            }
            s.flow++;
            let next_t = TriangleMesh.s_outer_t(s);
            if (next_t.id === t.id) {
                break;
            }
            t = next_t;
        }
    }
}
