export const FRAMES_PER_SECOND = 10;
export const SECONDS_PER_FRAME = 1 / FRAMES_PER_SECOND;
export const REFRESH_RATE_IN_MS = 1000 / FRAMES_PER_SECOND;

export interface Options {
    nextFrameDistance : number
}

export interface PlaySpeedOptions {
    assumedFrameRatePerSecond : number
}