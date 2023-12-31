import { Segment } from './interfaces';

export function formatSegment({ index, startTime, duration }: Segment) {
    return `segment=${index}, start=${startTime.format('mm:ss')}, duration=${duration.toFixed(2)}`;
}
