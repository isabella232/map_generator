import * as util from "../utility/Utils";
import * as Water from "../terrain/Water";
import * as Elevation from "../terrain/Elevation";
import * as Rivers from "../terrain/Rivers";
import * as Moisture from "../terrain/Moisture";
import * as Biomes from "../terrain/Biomes";
import * as NoisyEdges from "../terrain/NoisyEdges";
import { NoisyEdgeOpts, MapOpts } from "./MapOptions";
import TriangleMesh from "../mesh/DualMesh";

/**
 * Map generator
 *
 * Map coordinates are 0 ≤ x ≤ 1000, 0 ≤ y ≤ 1000.
 *
 * mesh: DualMesh
 * noisyEdgeOptions: {length, amplitude, seed}
 * makeRandInt: function(seed) -> function(N) -> an int from 0 to N-1
 */
export default class WorldMap {
    mesh: TriangleMesh;

    makeRandInt: (s: number) => (x: number) => number;

    constructor(mesh: TriangleMesh, noisyEdge: NoisyEdgeOpts, makeRandInt: (s: number) => (x: number) => number) {
        this.mesh = mesh;
        this.makeRandInt = makeRandInt;
        NoisyEdges.assign_s_segments(this.mesh, noisyEdge, this.makeRandInt(noisyEdge.seed));
    }

    calculate() {
        let mesh = this.mesh;
        mesh.regions.map(r => r.reset());
        mesh.sides.map(s => s.reset());
        mesh.triangles.map(t => t.reset());

        Water.assign_r_water(mesh, MapOpts.noise, MapOpts.shape);
        Water.assign_r_ocean(mesh);

        Elevation.assign_t_elevation(mesh, this.makeRandInt(MapOpts.drainageSeed));
        Elevation.redistribute_t_elevation(mesh);
        Elevation.assign_r_elevation(mesh);

        let spring_t = Rivers.find_spring_t(mesh);
        util.randomShuffle(spring_t, this.makeRandInt(MapOpts.riverSeed));
        let river_t = spring_t.slice(0, MapOpts.numRivers);
        Rivers.assign_s_flow(mesh, river_t);

        let seeds_r = Moisture.find_moisture_seeds_r(mesh);
        Moisture.assign_r_moisture(mesh, seeds_r);
        Moisture.redistribute_r_moisture(mesh, MapOpts.biomeBias.moisture, 1 + MapOpts.biomeBias.moisture);

        Biomes.assign_r_coast(mesh);
        Biomes.assign_r_temperature(mesh, MapOpts.biomeBias.northTemperature, MapOpts.biomeBias.southTemperature);
        Biomes.assign_r_biome(mesh);
    }
}
