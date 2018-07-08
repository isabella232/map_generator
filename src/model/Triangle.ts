import Region from "./Region";
import Side from "./Side";

export default class Triangle {
    id: number;

    a: Region;

    b: Region;

    c: Region;

    centroid: Region;

    ghost: boolean;

    /* Terrain */
    coastDistance: number = null;

    elevation: number;

    downslope: Side;

    private constructor(a: Region, b: Region, c: Region, ghost: boolean, id: number) {
        this.id = id;
        this.a = a;
        this.b = b;
        this.c = c;
        this.ghost = ghost;
        if (this.ghost) {
            // ghost triangle center is just outside the unpaired side
            let d = b.sub(a, true);
            this.centroid = Region.valueOf(a.x + 0.5 * (d.x + d.y), a.y + 0.5 * (d.y - d.x));
        } else {
            // solid triangle center is at the centroid
            this.centroid = Region.valueOf((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3);
        }
    }

    static valueOf(a: Region, b: Region, c: Region, ghost: boolean, id: number): Triangle {
        return new Triangle(a, b, c, ghost, id);
    }

    reset(): void {
        this.coastDistance = null;
        this.elevation = 0;
        this.downslope = null;
    }

    get pos(): Region {
        return this.centroid;
    }

    get ocean(): boolean {
        return this.a.ocean;
    }

    get water(): boolean {
        return this.a.water || this.b.water || this.c.water;
    }
}