/**
 * Coast corners are connected to coast sides, which have
 * ocean on one side and land on the other
 */
import TriangleMesh from "../mesh/DualMesh";
import Triangle from "../model/Triangle";

export function find_coasts_t(mesh: TriangleMesh): Triangle[] {
    let coasts: Triangle[] = [];
    for (let s of mesh.sides) {
        let t = TriangleMesh.s_inner_t(s);
        if (s.start.ocean && !s.end.ocean) {
            // It might seem that we also need to check !r_ocean[r0] && r_ocean[r1]
            // and it might seem that we have to add both t and its opposite but
            // each t vertex shows up in *four* directed sides, so we only have to test
            // one fourth of those conditions to get the vertex in the list once.
            t.coastDistance = 0;
            coasts.push(t);
        }
    }
    return coasts;
}


/**
 * Elevation is based on breadth first search from the seed points,
 * which are the coastal graph nodes. Since breadth first search also
 * calculates the 'parent' pointers, return those for use as the downslope
 * graph. To handle lakes, which should have all corners at the same elevation,
 * there are two deviations from breadth first search:
 * 1. Instead of pushing to the end of the queue, push to the beginning.
 * 2. Like uniform cost search, check if the new distance is better than
 *    previously calculated distances. It is possible that one lake corner
 *    was reached with distance 2 and another with distance 3, and we need
 *    to revisit that node and make sure it's set to 2.
 */
export function assign_t_elevation(mesh: TriangleMesh, randInt: (x: number) => number): void {
    let coasts = find_coasts_t(mesh);
    let minDistance = 1, maxDistance = 1;

    let len = 3;
    while (coasts.length > 0) {
        let t = coasts.shift();
        let off = randInt(len);
        for (let i = 0; i < len; i++) {
            let s = mesh.sides[(3 * t.id) + (i + off) % len];
            let lake = s.start.lake || s.end.lake;
            let neighbor_t = TriangleMesh.s_outer_t(s);
            let newDistance = (lake ? 0 : 1) + t.coastDistance;
            if (neighbor_t.coastDistance === null || newDistance < neighbor_t.coastDistance) {
                neighbor_t.downslope = s.pair;
                neighbor_t.coastDistance = newDistance;
                if (neighbor_t.ocean && newDistance > minDistance) {
                    minDistance = newDistance;
                }
                if (!neighbor_t.ocean && newDistance > maxDistance) {
                    maxDistance = newDistance;
                }
                if (lake) {
                    coasts.unshift(neighbor_t);
                } else {
                    coasts.push(neighbor_t);
                }
            }
            s = s.next;
        }
    }

    for (let t of mesh.triangles) {
        t.elevation = t.ocean ? (-t.coastDistance / minDistance) : (t.coastDistance / maxDistance);
    }
}


/**
 * Set r elevation to the average of the t elevations. There's a
 * corner case though: it is possible for an ocean region (r) to be
 * surrounded by coastline corners (t), and coastlines are set to 0
 * elevation. This means the region elevation would be 0. To avoid
 * this, I subtract a small amount for ocean regions. */
export function assign_r_elevation(mesh: TriangleMesh): void {
    const max_ocean_elevation = -0.01;
    let out_t: Triangle[] = [];
    for (let r of mesh.regions) {
        mesh.r_circulate_t(out_t, r);
        let elevation = 0.0;
        for (let t of out_t) {
            elevation += t.elevation;
        }
        r.elevation = elevation / out_t.length;
        if (r.ocean && r.elevation > max_ocean_elevation) {
            r.elevation = max_ocean_elevation;
        }
    }
}


/**
 * Redistribute elevation values so that lower elevations are more common
 * than higher elevations. Specifically, we want elevation Z to have frequency
 * (1-Z), for all the non-ocean regions.
 */
// TODO: this messes up lakes, as they will no longer all be at the same elevation
export function redistribute_t_elevation(mesh: TriangleMesh): void {
    // NOTE: This is the same algorithm I used in 2010, because I'm
    // trying to recreate that map generator to some extent. I don't
    // think it's a great approach for other games but it worked well
    // enough for that one.

    // SCALE_FACTOR increases the mountain area. At 1.0 the maximum
    // elevation barely shows up on the map, so we set it to 1.1.
    const SCALE_FACTOR = 1.1;

    let nonOcean: Triangle[] = [];
    for (let i = 0; i < mesh.numSolidTriangles; i++) {
        let t = mesh.triangles[i];
        if (t.elevation > 0.0) {
            nonOcean.push(t);
        }
    }

    nonOcean.sort((t1, t2) => t1.elevation - t2.elevation);

    for (let i = 0; i < nonOcean.length; i++) {
        // Let y(x) be the total area that we want at elevation <= x.
        // We want the higher elevations to occur less than lower
        // ones, and set the area to be y(x) = 1 - (1-x)^2.
        let y = i / (nonOcean.length - 1);
        // Now we have to solve for x, given the known y.
        //  *  y = 1 - (1-x)^2
        //  *  y = 1 - (1 - 2x + x^2)
        //  *  y = 2x - x^2
        //  *  x^2 - 2x + y = 0
        // From this we can use the quadratic equation to get:
        let x = Math.sqrt(SCALE_FACTOR) - Math.sqrt(SCALE_FACTOR * (1 - y));
        if (x > 1.0) {
            x = 1.0;
        }
        nonOcean[i].elevation = x;
    }
}
