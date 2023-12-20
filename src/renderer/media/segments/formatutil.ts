import { Segment } from './interfaces';

export function formatSegment({ index, startOffset, duration }: Segment) {
    return `segment=${index}, start=${startOffset.toFixed(2)}, duration=${duration.toFixed(2)}`;
}

export function formaSegmentSpan(segment: Segment, timecode: number) {
    return `${segment.index} = ${segment.startOffset} <= ${timecode} < ${
        segment.startOffset + segment.duration
    }`;
}
