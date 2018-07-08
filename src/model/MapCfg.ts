const SCALE = 1;

class MapCfgClass {
    width = Math.ceil(1000 * SCALE);
    height = Math.ceil(1000 * SCALE);
    poissonSize = Math.ceil(1000 * SCALE);
    canvasSize = Math.ceil(1024 * SCALE);

    islandSize = Math.ceil(200 * SCALE);
    islandRound = 0.5;
    islandInflate = 0.4;
    boundaryWater = true;

    minSpringElevation = 0.3;
    maxSpringElevation = 0.9;
}

export const MapCfg = new MapCfgClass();
