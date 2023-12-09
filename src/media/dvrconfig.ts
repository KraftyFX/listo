export type LogLevel = 'info' | 'log' | 'warn' | 'error' | null;

export interface DvrOptions {
    recording: RecordingOptions;
    playback: PlaybackOptions;
}

export interface RecordingOptions {
    source: 'default' | string;
    mimeType: string;
    minSegmentSizeInSec: number;
    logging: LogLevel;
}

export interface PlaybackOptions {
    maxPlaySpeedFactor: number;
    minPlaySpeedFactor: number;
    logging: LogLevel;
}
