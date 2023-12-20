import { Segment } from './interfaces';

export function formatSegment({ index, startTime, duration }: Segment) {
    return `segment=${index}, start=${startTime.toFixed(2)}, duration=${duration.toFixed(2)}`;
}

export function formaSegmentSpan(segment: Segment, timecode: number) {
    return `${segment.index} = ${segment.startTime} <= ${timecode} < ${
        segment.startTime + segment.duration
    }`;
}
