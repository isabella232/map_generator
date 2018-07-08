/**
 * Deserialize binary graph data; see serialize.js for format
 */
function deserializeMesh(arraybuffer: any) {
    let dv = new DataView(arraybuffer);

    // header
    let numRegions = dv.getUint32(0);
    let numBoundaryRegions = dv.getUint32(4);
    let numSides = dv.getUint32(8);
    let numSolidSides = dv.getUint32(12);

    // regions
    let p = 16;
    let _r_vertex = [];
    for (let i = 0; i < numRegions; i++) {
        _r_vertex.push([dv.getFloat32(p), dv.getFloat32(p + 4)]);
        p += 8;
    }

    // sides
    const uintSizeSides = numRegions < (1 << 16) ? 2 : 4;
    const uintSizeOpposites = numSides < (1 << 16) ? 2 : 4;

    let _s_start_r = new (uintSizeSides == 2 ? Int16Array : Int32Array)(arraybuffer, p, numSides);
    p += numSides * uintSizeSides;
    let _s_opposite_s = new (uintSizeOpposites == 2 ? Int16Array : Int32Array)(arraybuffer, p, numSides);
    p += numSides * uintSizeOpposites;

    // check
    if (p != arraybuffer.byteLength) {
        throw "miscalculated buffer length";
    }
    return {numBoundaryRegions, numSolidSides, _r_vertex, _s_start_r, _s_opposite_s};
}
