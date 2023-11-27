import { ChunkedRecorder, Segment } from './chunkedrecorder';

export class SegmentCollection {
    constructor(
        private readonly chunkedRecorder: ChunkedRecorder,
        public readonly segments: Segment[]
    ) {
        if (segments.length === 0) {
            throw new Error(`The segment collection is empty`);
        }
    }

    get duration() {
        return this.segments.reduce((p, c) => p + c.duration, 0);
    }

    async getSegmentAtTime(timestamp: number) {
        const segments = this.segments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.log(printSegmentRange('Min', segment));
            return { segment, offset: 0 };
        } else if (timestamp >= this.duration) {
            const segment = segments[segments.length - 1];
            this.log(printSegmentRange('Max', segment));
            return { segment, offset: segment.startTime + segment.duration };
        } else {
            let segment = this.findClosestSegmentForTimestamp(timestamp, segments);

            this.log(printSegmentRange('Mid', segment));

            const offset = Math.max(0, timestamp - segment.startTime);

            return { segment, offset };
        }

        function printSegmentRange(prefix: string, segment: Segment) {
            return `${prefix} ${segment.index} = ${segment.startTime} <= ${timestamp} < ${
                segment.startTime + segment.duration
            }`;
        }
    }

    private findClosestSegmentForTimestamp(timestamp: number, segments: Segment[]) {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (isInTheSegment(segment)) {
                return segment;
            } else if (isAtTheEndBoundary(segment)) {
                if (i < segments.length - 2) {
                    return segments[i + 1];
                } else {
                    return segments[segments.length - 1];
                }
            }
        }

        throw new Error(
            `The timestamp ${timestamp} is in the bounds of this chunked recording ${this.duration} but a segment was not found. This likely means the segments array is corrupt.`
        );

        function isInTheSegment(s: Segment) {
            return s.startTime <= timestamp && timestamp < s.startTime + s.duration;
        }

        function isAtTheEndBoundary(s: Segment) {
            return timestamp === s.startTime + s.duration;
        }
    }

    getNextSegment(segment: Segment) {
        if (segment.index >= this.segments.length - 1) {
            return null;
        } else {
            return this.segments[segment.index + 1];
        }
    }

    isFirstSegment(segment: Segment | null) {
        return segment && segment.index == 0;
    }

    isLastSegment(segment: Segment | null) {
        return segment && segment.index == this.segments[this.segments.length - 1].index;
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        this.chunkedRecorder.resetSegmentDuration(segment, duration);
    }

    private log(message: string) {
        // console.log(message);
    }
}
