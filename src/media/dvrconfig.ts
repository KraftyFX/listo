export interface DvrOptions {
    recording : RecordingOptions,
    playback: PlaybackOptions
}

export interface RecordingOptions {
    mimeType: string,
    minSegmentSizeInSec: number,
    logging: string
}

export interface PlaybackOptions {
    maxPlaySpeedFactor: number,
    minPlaySpeedFactor: number,
    logging: string
}
