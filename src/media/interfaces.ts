import { DurationUnitsObjectType } from 'dayjs/plugin/duration';

export type LogLevel = 'info' | 'log' | 'warn' | 'error' | null;

export interface DvrOptions {
    recording: RecordingOptions;
    playback: PlaybackOptions;
    timeline: TimelineOptions;
    liveDurationPollingInterval: DurationUnitsObjectType;
    logging: LogLevel;
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

export interface TimelineOptions {
    viewport: DurationUnitsObjectType;
    marker: MarkerConfig;
    logging: LogLevel;
}

export interface MarkerConfig {
    major: DurationUnitsObjectType;
    minor: DurationUnitsObjectType;
}

export interface Camera {
    deviceId: string;
    label: string;
}

export interface Segment {
    index: number;
    url: string;
    chunks: Blob[];
    startTime: number;
    duration: number;
}

export type PlayerMode = 'live' | 'playback';
