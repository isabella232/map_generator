export class Terrain {
    name: string;

    icon: number;

    color: string;

    constructor(name: string, icon: number, color: string) {
        this.name = name;
        this.icon = icon;
        this.color = color;
    }
}

export class Terrains {
    static OCEAN = new Terrain("OCEAN", 0, "#44447a");
    static COAST = new Terrain("COAST", -1, "#33335a");
    static LAKE_SHORE = new Terrain("LAKE_SHORE", -1, "#225588");
    static LAKE = new Terrain("LAKE", 0, "#336699");
    static RIVER = new Terrain("RIVER", -1, "#225588");
    static MARSH = new Terrain("MARSH", 7, "#2f6666");
    static ICE = new Terrain("ICE", -1, "#99ffff");
    static BEACH = new Terrain("BEACH", -1, "#a09077");
    static SNOW = new Terrain("SNOW", -1, "#ffffff");
    static TUNDRA = new Terrain("TUNDRA", -1, "#bbbbaa");
    static BARE = new Terrain("BARE", -1, "#888888");
    static SCORCHED = new Terrain("SCORCHED", -1, "#555555");
    static TAIGA = new Terrain("TAIGA", 9, "#99aa77");
    static SHRUB_LAND = new Terrain("SHRUB_LAND", 2, "#889977");
    static TEMPERATE_DESERT = new Terrain("TEMPERATE_DESERT", 3, "#c9d29b");
    static TEMPERATE_RAIN_FOREST = new Terrain("TEMPERATE_RAIN_FOREST", 5, "#448855");
    static TEMPERATE_DECIDUOUS_FOREST = new Terrain("TEMPERATE_DECIDUOUS_FOREST", 5, "#679459");
    static GRASSLAND = new Terrain("GRASSLAND", 6, "#88aa55");
    static SUBTROPICAL_DESERT = new Terrain("SUBTROPICAL_DESERT", 3, "#d2b98b");
    static TROPICAL_RAIN_FOREST = new Terrain("TROPICAL_RAIN_FOREST", 4, "#337755");
    static TROPICAL_SEASONAL_FOREST = new Terrain("TROPICAL_SEASONAL_FOREST", 4, "#559944");
}
