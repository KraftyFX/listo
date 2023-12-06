import { Segment } from './interfaces';

export function printSegment(segment: Segment) {
    return `segment=${segment.index}, start=${segment.startTime.toFixed(
        2
    )}, duration=${segment.duration.toFixed(2)}`;
}
