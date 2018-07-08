/**
 * Represent a triangle-polygon dual mesh with:
 *   - Regions (r)
 *   - Sides (s)
 *   - Triangles (t)
 *
 * Each element has an id:
 *   - 0 <= r < numRegions
 *   - 0 <= s < numSides
 *   - 0 <= t < numTriangles
 *
 * Naming convention: x_name_y takes x (r, s, t) as input and produces
 * y (r, s, t) as output. If the output isn't a mesh index (r, s, t)
 * then the _y suffix is omitted.
 *
 * A side is directed. If two sides t0, t1 are adjacent, there will
 * be two sides representing the boundary, one for t0 and one for t1. These
 * can be accessed with s_inner_t and s_outer_t.
 *
 * A side also represents the boundary between two regions. If two regions
 * r0, r1 are adjacent, there will be two sides representing the boundary,
 * sideBegin and sideEnd.
 *
 * Each side will have a pair, accessed with s_opposite_s.
 *
 * The mesh has no boundaries; it wraps around the "back" using a
 * "ghost" region. Some regions are marked as the boundary; these are
 * connected to the ghost region. Ghost sides and ghost sides
 * connect these boundary regions to the ghost region. Elements that
 * aren't "ghost" are called "solid".
 */

import * as Delaunator from "delaunator";
import { Points } from "delaunator";
import Region from "../model/Region";
import Triangle from "../model/Triangle";
import Side from "../model/Side";
import { MapCfg } from "../model/MapCfg";

let Poisson = require('poisson-disk-sampling');

export default class TriangleMesh {
    numSolidSides: number;

    numSolidTriangles: number;

    numSolidRegions: number;

    ghostRegion: Region;

    regions: Region[] = [];

    sides: Side[] = [];

    triangles: Triangle[] = [];

    private _edges: Int32Array;

    private _halfEdges: Int32Array;

    constructor(spacing = Infinity, random = Math.random, points: number[] = []) {
        let generator = new Poisson([MapCfg.poissonSize, MapCfg.poissonSize], spacing, undefined, undefined, random);
        let boundaryPoints: Points = isFinite(spacing) ? TriangleMesh.addBoundaryPoints(spacing, MapCfg.poissonSize) : [];
        boundaryPoints.forEach((p) => generator.addPoint(p));
        points.forEach((p) => generator.addPoint(p));
        let allPoints: Points = generator.fill();

        let delaunator = new Delaunator(allPoints);
        allPoints.forEach(point => {
            let vec = Region.valueOf(point[0], point[1], this.regions.length);
            if (vec.id < boundaryPoints.length) {
                vec.boundary = true;
            }
            this.regions.push(vec);
        });
        this._edges = delaunator.triangles;
        this._halfEdges = delaunator.halfedges;

        this.checkPointInequality();
        this.checkTriangleInequality();

        this.addGhostStructure();
        this.checkMeshConnectivity();

        for (let s = 0; s < this._edges.length; s += 3) {
            let pA = this.regions[this._edges[s]];
            let pB = this.regions[this._edges[s + 1]];
            let pC = this.regions[this._edges[s + 2]];
            let ghost = s >= delaunator.triangles.length;

            let face = Triangle.valueOf(pA, pB, pC, ghost, this.triangles.length);
            this.triangles.push(face);

            let sideA = new Side(s, pA, face, ghost);
            let sideB = new Side(s + 1, pB, face, ghost);
            let sideC = new Side(s + 2, pC, face, ghost);
            sideA.next = sideB;
            sideB.next = sideC;
            sideC.next = sideA;
            this.sides.push(sideA);
            this.sides.push(sideB);
            this.sides.push(sideC);
        }

        for (let s = 0; s < this._halfEdges.length; s += 3) {
            let sA = this._halfEdges[s];
            let sB = this._halfEdges[s + 1];
            let sC = this._halfEdges[s + 2];
            let sideA = this.sides[sA];
            let sideB = this.sides[sB];
            let sideC = this.sides[sC];

            let pairA = this.sides[s];
            pairA.pair = sideA;
            sideA.pair = pairA;

            let pairB = this.sides[s + 1];
            pairB.pair = sideB;
            sideB.pair = pairB;

            let pairC = this.sides[s + 2];
            pairC.pair = sideC;
            sideC.pair = pairC;
        }
    }

    static addBoundaryPoints(spacing: number, size: number): Points {
        let N = Math.ceil(size / spacing);
        let points: Points = [];
        for (let i = 0; i <= N; i++) {
            let t = (i + 0.5) / (N + 1);
            let w = size * t;
            let offset = Math.pow(t - 0.5, 2);
            points.push([offset, w], [size - offset, w]);
            points.push([w, offset], [w, size - offset]);
        }
        return points;
    }

    static s_next_s(s: number): number {
        return (s % 3 === 2) ? s - 2 : s + 1;
    }

    private checkPointInequality() {
        // TODO: check for collinear regions. Around each red point P if
        // there's a point Q and R both connected to it, and the angle P→Q and
        // the angle P→R are 180° apart, then there's collinearity. This would
        // indicate an issue with poisson disc point selection.
    }

    private checkTriangleInequality(): void {
        // check for skinny sides
        const badAngleLimit = 30;
        let summary = new Array(badAngleLimit).fill(0);
        let count = 0;
        for (let t of this.triangles) {
            let d0 = t.a.sub(t.b);
            let d2 = t.c.sub(t.b);
            let dotProduct = d0.x * d2.x + d0.y + d2.y;
            let angleDegrees = 180 / Math.PI * Math.acos(dotProduct);
            if (angleDegrees < badAngleLimit) {
                summary[angleDegrees | 0]++;
                count++;
            }
        }
        // NOTE: a much faster test would be the ratio of the inradius to
        // the circumradius, but as I'm generating these offline, I'm not
        // worried about speed right now

        // TODO: consider adding circumcenters of skinny sides to the point set
        if (count > 0) {
            console.log('  bad angles:', summary.join(" "));
        }
    }

    private addGhostStructure(): void {
        const numSolidSides = this._edges.length;
        const ghost_r = this.regions.length;

        let numUnpairedSides = 0, firstUnpairedEdge = -1;
        let r_unpaired_s = []; // seed to side
        for (let s = 0; s < numSolidSides; s++) {
            if (this._halfEdges[s] === -1) {
                numUnpairedSides++;
                r_unpaired_s[this._edges[s]] = s;
                firstUnpairedEdge = s;
            }
        }

        let triangles = new Int32Array(numSolidSides + 3 * numUnpairedSides);
        triangles.set(this._edges);
        let halfedges = new Int32Array(numSolidSides + 3 * numUnpairedSides);
        halfedges.set(this._halfEdges);

        for (let i = 0, s = firstUnpairedEdge; i < numUnpairedSides; i++, s = r_unpaired_s[triangles[TriangleMesh.s_next_s(s)]]) {
            // Construct a ghost side for s
            let ghost_s = numSolidSides + 3 * i;
            halfedges[s] = ghost_s;
            halfedges[ghost_s] = s;
            triangles[ghost_s] = triangles[TriangleMesh.s_next_s(s)];

            // Construct the rest of the ghost triangle
            triangles[ghost_s + 1] = triangles[s];
            triangles[ghost_s + 2] = ghost_r;
            let k = numSolidSides + (3 * i + 4) % (3 * numUnpairedSides);
            halfedges[ghost_s + 2] = k;
            halfedges[k] = ghost_s + 2;
        }

        this.ghostRegion = Region.valueOf(MapCfg.width / 2, MapCfg.height / 2, this.regions.length);
        this.regions.push(this.ghostRegion);
        this._edges = triangles;
        this._halfEdges = halfedges;

        this.numSolidRegions = this.regions.length - 1;
        this.numSolidSides = numSolidSides;
        this.numSolidTriangles = this.numSolidSides / 3;
    }

    private checkMeshConnectivity(): void {
        // 1. make sure each side's opposite is back to itself
        // 2. make sure region-circulating starting from each side works
        let ghost_r = this.regions.length - 1, out_s = [];
        for (let s0 = 0; s0 < this._edges.length; s0++) {
            if (this._halfEdges[this._halfEdges[s0]] !== s0) {
                console.log(`FAIL halfedges[halfedges[${s0}]] !== ${s0}`);
            }
            let s = s0, count = 0;
            out_s.length = 0;
            do {
                count++;
                out_s.push(s);
                s = TriangleMesh.s_next_s(this._halfEdges[s]);
                if (count > 100 && this._edges[s0] !== ghost_r) {
                    console.log(`FAIL to circulate around region with start side=${s0} from region ${this._edges[s0]} to ${this._edges[TriangleMesh.s_next_s(s0)]}, out_s=${out_s}`);
                    break;
                }
            } while (s !== s0);
        }
    }

    static s_inner_t(side: Side): Triangle {
        return side.face;
    }

    static s_outer_t(side: Side): Triangle {
        return side.pair.face;
    }

    r_circulate_s(out: Side[], region: Region): Side[] {
        out.length = 0;
        let start = region.side, side = region.side;
        do {
            out.push(side);
            side = this.sides[side.pair.id].next;
        } while (start !== side);
        return out;
    }

    r_circulate_r(out: Region[], region: Region): Region[] {
        out.length = 0;
        let start = region.side, side = region.side;
        do {
            out.push(side.end);
            side = this.sides[side.pair.id].next;
        } while (start !== side);
        return out;
    }

    r_circulate_t(out: Triangle[], region: Region): Triangle[] {
        out.length = 0;
        let start = region.side, side = region.side;
        do {
            out.push(side.face);
            side = this.sides[side.pair.id].next;
        } while (start !== side);
        return out;
    }

    isGhost(r: Region): boolean {
        return r === this.ghostRegion;
    }
}
