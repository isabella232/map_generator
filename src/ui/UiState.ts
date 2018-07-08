import { UiSize } from "./UiSize";

export default class UiState {
    seed = 187;
    variant = 0;
    rivers = 30;
    size = UiSize.medium;
    noisyFills = true;
    noisyEdges = true;
    icons = true;
    biomes = false;
    lighting = false;
    northTemperature = 0;
    southTemperature = 0;
    rainfall = 0;
    canvasSize = 0;
    persistence = 0;

    cached(uiState: UiState): boolean {
        if (!uiState) {
            return false;
        }
        return this.seed !== uiState.seed
            || this.size !== uiState.size
            || this.canvasSize !== uiState.canvasSize;
    }
}
