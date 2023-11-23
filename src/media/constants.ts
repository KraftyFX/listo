import { DvrOptions, PlaybackOptions, RecordingOptions } from "./dvrconfig";

export const LOGITECH_BRIO_CAMERA_ID = '94f3aff55f18fcaa8238d5ae2437608852fcdeae132d61a15b94f197cf364acb';
export const BUILT_IN = '5134f09eebf96f0a8bc51de97e5b2bfb78e846b2cb5791c35516010b8350fc18';

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
    mimeType: 'video/webm',
    minSegmentSizeInSec : 5,
    logging: null
}

export const DEFAULT_PLAYBACK_OPTIONS: PlaybackOptions = {
    logging: null
}

export const DEFAULT_DVR_OPTIONS: DvrOptions = {
    recording : DEFAULT_RECORDING_OPTIONS,
    playback : DEFAULT_PLAYBACK_OPTIONS
}

