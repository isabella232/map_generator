function hashInt(x: number): number {
    let A;
    if (typeof Uint32Array === undefined) {
        A = [0];
    } else {
        A = new Uint32Array(1);
    }
    A[0] = x | 0;
    A[0] -= (A[0] << 6);
    A[0] ^= (A[0] >>> 17);
    A[0] -= (A[0] << 9);
    A[0] ^= (A[0] << 4);
    A[0] -= (A[0] << 3);
    A[0] ^= (A[0] << 10);
    A[0] ^= (A[0] >>> 15);
    return A[0];
}

export function makeRandInt(seed: number): (x: number) => number {
    let i = 0;
    return function (N: number) {
        i++;
        return hashInt(seed + i) % N;
    };
}

export function makeRandFloat(seed: number): () => number {
    let randInt = makeRandInt(seed);
    let divisor = 0x10000000;
    return function () {
        return randInt(divisor) / divisor;
    };
}
