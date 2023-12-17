import { Segment } from '~/renderer/media/interfaces';

export function formatSegment({ index, startTime, duration }: Segment) {
    return `segment=${index}, start=${startTime.toFixed(2)}, duration=${duration.toFixed(2)}`;
}

export function formaSegmentSpan(segment: Segment, timestamp: number) {
    return `${segment.index} = ${segment.startTime} <= ${timestamp} < ${
        segment.startTime + segment.duration
    }`;
}
