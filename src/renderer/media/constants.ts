import { DvrOptions, PlaybackOptions, RecordingOptions, TimelineOptions } from './interfaces';

export const FRAMES_PER_SECOND = 10;
export const SECONDS_PER_FRAME = 1 / FRAMES_PER_SECOND;
export const REFRESH_RATE_IN_MS = 1000 / FRAMES_PER_SECOND;

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
    inMemory: true,
    source: 'default',
    mimeType: 'video/webm',
    minSizeInSec: 5,
    fixDuration: true,
    logging: null,
};

export const DEFAULT_PLAYBACK_OPTIONS: PlaybackOptions = {
    maxPlaySpeedFactor: 32,
    minPlaySpeedFactor: 1 / 8,
    logging: null,
};

export const DEFAULT_TIMELINE_OPTIONS: TimelineOptions = {
    viewport: { seconds: 60 },
    marker: {
        major: { minutes: 10 },
        minor: { seconds: 10 },
    },
    logging: null,
};

export const DEFAULT_DVR_OPTIONS: DvrOptions = {
    recording: DEFAULT_RECORDING_OPTIONS,
    playback: DEFAULT_PLAYBACK_OPTIONS,
    timeline: DEFAULT_TIMELINE_OPTIONS,
    liveDurationPollingInterval: { milliseconds: 500 },
    logging: null,
};
