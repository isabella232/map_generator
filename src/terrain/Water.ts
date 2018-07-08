import * as util from '../utility/Utils';
import TriangleMesh from "../mesh/DualMesh";
import * as SimplexNoise from "simplex-noise";
import { ShapeOpts } from "../model/MapOptions";
import Region from "../model/Region";
import { MapCfg } from "../model/MapCfg";

// NOTE: r_water, r_ocean, other fields are boolean valued so it
// could be more efficient to pack them as bit fields in Uint8Array

/* a region is water if the noise value is low */
export function assign_r_water(mesh: TriangleMesh, noise: SimplexNoise, opts: ShapeOpts): void {
    for (let r of mesh.regions) {
        if (MapCfg.boundaryWater && (mesh.isGhost(r) || r.boundary)) {
            r.water = true;
        } else {
            let px = MapCfg.width / 2;
            let nx = (r.x - px) / px;
            let py = MapCfg.height / 2;
            let ny = (r.y - py) / py;
            let distance = Math.max(Math.abs(nx), Math.abs(ny));
            let n = util.fbm_noise(noise, opts.amplitudes, nx, ny);
            n = util.mix(n, 0.5, opts.round);
            r.water = (n - (1.0 - opts.inflate) * distance * distance) < 0;
        }
    }
}

/* a region is ocean if it is a water region connected to the ghost region,
   which is outside the boundary of the map; this could be any seed set but
   for islands, the ghost region is a good seed */
export function assign_r_ocean(mesh: TriangleMesh): void {
    let stack: Region[] = [mesh.ghostRegion];
    let regions: Region[] = [];
    while (stack.length > 0) {
        let r1 = stack.pop();
        mesh.r_circulate_r(regions, r1);
        for (let r2 of regions) {
            if (r2.lake) {
                r2.ocean = true;
                stack.push(r2);
            }
        }
    }
}
