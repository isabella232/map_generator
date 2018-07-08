import Side from "./Side";
import { Terrain } from "./Terrain";

export default class Region {
    x: number;

    y: number;

    id: number;

    boundary: boolean;

    side: Side;

    /* Terrains */
    water = false;

    ocean = false;

    elevation: number;

    moisture: number;

    waterDistance: number = null;

    temperature: number;

    biome: Terrain;

    coast = false;

    private constructor(x: number, y: number, id: number = undefined) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.reset();
    }

    static valueOf(x: number, y: number, id: number = undefined) {
        return new Region(x, y, id);
    }

    reset(): void {
        this.water = false;
        this.ocean = false;
        this.elevation = 0;
        this.moisture = 0;
        this.waterDistance = null;
        this.temperature = 0;
        this.biome = null;
        this.coast = false;
    }

    get lake(): boolean {
        return this.water && !this.ocean;
    }

    add(v: Region, create: boolean = true): Region {
        if (create) {
            return new Region(this.x + v.x, this.y + v.y);
        }
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v: Region, create: boolean = true): Region {
        if (create) {
            return new Region(this.x - v.x, this.y - v.y);
        }
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mul(v: Region, create: boolean = true): Region {
        if (create) {
            return new Region(this.x * v.x, this.y * v.y);
        }
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    dot(v: Region) {
        return this.x * v.x + this.y * v.y;
    }

    disSq(v: Region) {
        let dx = this.x - v.x;
        let dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    dis(v: Region) {
        Math.sqrt(this.disSq(v));
    }
}
