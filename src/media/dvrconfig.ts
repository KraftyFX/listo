import { DurationUnitsObjectType } from 'dayjs/plugin/duration';

export type LogLevel = 'info' | 'log' | 'warn' | 'error' | null;

export interface DvrOptions {
    recording: RecordingOptions;
    playback: PlaybackOptions;
    logging: LogLevel;
    livePollingInterval: number;
    viewport: DurationUnitsObjectType;
    marker: MarkerConfig;
}

export interface MarkerConfig {
    major: DurationUnitsObjectType;
    minor: DurationUnitsObjectType;
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
