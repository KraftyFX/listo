import { DvrOptions, PlaybackOptions, RecordingOptions, TimelineOptions } from './interfaces';

export const FRAMES_PER_SECOND = 10;
export const SECONDS_PER_FRAME = 1 / FRAMES_PER_SECOND;
export const REFRESH_RATE_IN_MS = 1000 / FRAMES_PER_SECOND;

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
    inMemory: true,
    source: 'default',
    mimeType: 'video/webm',
    minSegmentSizeInSec: 30,
    logging: 'info',
};

export const DEFAULT_PLAYBACK_OPTIONS: PlaybackOptions = {
    maxPlaySpeedFactor: 32,
    minPlaySpeedFactor: 1 / 8,
    logging: 'info',
};

export const DEFAULT_TIMELINE_OPTIONS: TimelineOptions = {
    viewport: { minutes: 5 },
    marker: {
        major: { minutes: 5 },
        minor: { minutes: 1 },
    },
    logging: 'info',
};

export const DEFAULT_DVR_OPTIONS: DvrOptions = {
    recording: DEFAULT_RECORDING_OPTIONS,
    playback: DEFAULT_PLAYBACK_OPTIONS,
    timeline: DEFAULT_TIMELINE_OPTIONS,
    liveDurationPollingInterval: { milliseconds: 500 },
    logging: 'info',
};
