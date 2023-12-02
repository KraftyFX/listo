import { DvrOptions, PlaybackOptions, RecordingOptions } from './dvrconfig';

export const LOGITECH_BRIO_CAMERA_ID =
    '94f3aff55f18fcaa8238d5ae2437608852fcdeae132d61a15b94f197cf364acb';
export const BUILT_IN = '5134f09eebf96f0a8bc51de97e5b2bfb78e846b2cb5791c35516010b8350fc18';

export const FRAMES_PER_SECOND = 10;
export const SECONDS_PER_FRAME = 1 / FRAMES_PER_SECOND;
export const REFRESH_RATE_IN_MS = 1000 / FRAMES_PER_SECOND;

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
    source: LOGITECH_BRIO_CAMERA_ID,
    mimeType: 'video/webm',
    minSegmentSizeInSec: 5,
    logging: 'info',
};

export const DEFAULT_PLAYBACK_OPTIONS: PlaybackOptions = {
    maxPlaySpeedFactor: 16,
    minPlaySpeedFactor: 1 / 8,
    logging: 'info',
};

export const DEFAULT_DVR_OPTIONS: DvrOptions = {
    recording: DEFAULT_RECORDING_OPTIONS,
    playback: DEFAULT_PLAYBACK_OPTIONS,
};
