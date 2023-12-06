import { Segment } from './interfaces';

export function formatSegment({ index, startTime, duration }: Segment) {
    return `segment=${index}, start=${startTime.toFixed(2)}, duration=${duration.toFixed(2)}`;
}
