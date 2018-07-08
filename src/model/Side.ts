import Region from "./Region";
import Triangle from "./Triangle";

export default class Side {
    id: number;

    vert: Region;

    pair: Side;

    face: Triangle;

    next: Side;

    ghost: boolean;

    line: Region[] = [];

    flow: number = 0;

    constructor(id: number, vert: Region, face: Triangle, isGhost: boolean) {
        this.id = id;
        this.vert = vert;
        this.face = face;
        this.ghost = isGhost;
        if (!vert.side) {
            vert.side = this;
        }
    }

    reset(): void {
        this.flow = 0;
    }

    get start(): Region {
        return this.vert;
    }

    get end(): Region {
        return this.next.vert;
    }
}