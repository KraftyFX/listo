export interface DvrOptions {
    recording: RecordingOptions;
    playback: PlaybackOptions;
}

export interface RecordingOptions {
    source: 'default' | string;
    mimeType: string;
    minSegmentSizeInSec: number;
    logging: 'info' | 'log' | null;
}

export interface PlaybackOptions {
    maxPlaySpeedFactor: number;
    minPlaySpeedFactor: number;
    logging: 'info' | 'log' | null;
}
