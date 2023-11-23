import { DvrOptions, RecordingOptions } from "./dvrconfig";

export const LOGITECH_BRIO_CAMERA_ID = '94f3aff55f18fcaa8238d5ae2437608852fcdeae132d61a15b94f197cf364acb';
export const BUILT_IN = '5134f09eebf96f0a8bc51de97e5b2bfb78e846b2cb5791c35516010b8350fc18';

const mimeType = 'video/webm';
const MIN_SEGMENT_DURATION_SEC = 5;

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
    mimeType,
    minSegmentSize : MIN_SEGMENT_DURATION_SEC
}

export const DEFAULT_DVR_OPTIONS: DvrOptions = {
    recording : DEFAULT_RECORDING_OPTIONS
}

