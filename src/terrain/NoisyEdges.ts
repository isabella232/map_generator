/**
 * Noisy sides is a variant of midpoint subdivision that keeps the lines
 * constrained to a quadrilateral. See the explanation here:
 * http://www.redblobgames.com/maps/mapgen2/noisy-edges.html
 */

import { mixp } from "../utility/Utils";
import TriangleMesh from "../mesh/DualMesh";
import { NoisyEdgeOpts } from "../model/MapOptions";
import Region from "../model/Region";

/**
 * Return the noisy line from a to b, within quadrilateral a-p-b-q,
 * as an array of points, not including a. The recursive subdivision
 * has up to 2^levels segments. Segments below a given length are
 * not subdivided further.
 */
const divisor = 0x10000000;

function recursiveSubdivision(length: number, amplitude: number, randInt: (x: number) => number):
    (a: Region, b: Region, p: Region, q: Region) => Region[] {
    return function recur(a: Region, b: Region, p: Region, q: Region): Region[] {
        if (a.disSq(b) < length * length) {
            return [b];
        }

        let ap = mixp(a, p, 0.5),
            bp = mixp(b, p, 0.5),
            aq = mixp(a, q, 0.5),
            bq = mixp(b, q, 0.5);

        let division = 0.5 * (1 - amplitude) + randInt(divisor) / divisor * amplitude;
        let center = mixp(p, q, division);

        let results1: Region[] = recur(a, center, ap, aq),
            results2: Region[] = recur(center, b, bp, bq);

        return results1.concat(results2);
    };
}

// TODO: this allocates lots of tiny arrays; find a data format that
// doesn't have so many allocations
export function assign_s_segments(mesh: TriangleMesh, noisyEdge: NoisyEdgeOpts, randInt: (x: number) => number): void {
    for (let s of mesh.sides) {
        let t0 = s.face, t1 = s.pair.face;
        if (s.start.id < s.end.id) {
            if (s.ghost) {
                s.line = [t1.pos];
            } else {
                let divisor = recursiveSubdivision(noisyEdge.length, noisyEdge.amplitude, randInt);
                s.line = divisor(t0.pos, t1.pos, s.start, s.end);
            }
            // construct line going the other way; since the line is a
            // half-open interval with [p1, p2, p3, ..., pn] but not
            // p0, we want to reverse all but the last element, and
            // then append p0
            let opposite: Region[] = s.line.slice(0, -1);
            opposite.reverse();
            opposite.push(t0.pos);
            s.pair.line = opposite;
        }
    }
}
