import { Segment } from './interfaces';

export function formatSegment({ index, startOffset, duration }: Segment) {
    return `segment=${index}, start=${startOffset.toFixed(2)}, duration=${duration.toFixed(2)}`;
}

export function formaSegmentSpan(segment: Segment, timecode: number) {
    const start = segment.startOffset.toFixed(2);
    const end = (segment.startOffset + segment.duration).toFixed(2);

    return `${segment.index} = ${start} <= ${timecode} < ${end}`;
}
