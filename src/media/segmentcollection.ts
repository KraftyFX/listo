import { ChunkedRecorder, Segment } from "./chunkedrecorder";

export class SegmentCollection
{
    constructor(private readonly chunkedRecorder: ChunkedRecorder, public readonly segments: Segment[]) {
        if (segments.length === 0) {
            throw new Error(`The segment collection is empty`);
        }
    }

    get duration() {
        return this.segments.reduce((p, c) => p + c.duration, 0);
    }
    
    async getSegmentAtTime(timestamp: number) {
        const assertCorrectSegmentWasFound = (segment: Segment) => {
            if (!segment) {
                throw new Error(`The timestamp ${timestamp} is in the bounds of this chunked recording ${this.duration} but a segment was not found. This likely means the segments array is corrupt.`);
            }
        }

        const segments = this.segments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.log(`Min ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);
            return { segment, offset : 0 };
        } else if (timestamp >= this.duration) {
            const segment = segments[segments.length - 1];
            this.log(`Max ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);
            return { segment, offset : segment.startTime + segment.duration };
        } else {
            const segment = segments.find(segment => segment.startTime <= timestamp && timestamp < (segment.startTime + segment.duration));

            assertCorrectSegmentWasFound(segment);

            this.log(`Mid ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);

            const offset = Math.max(0, timestamp - segment.startTime);

            return { segment, offset };
        }
    }

    getNextSegment(segment: Segment) {
        if (segment.index >= this.segments.length - 1) {
            return null;
        } else {
            return this.segments[segment.index + 1];
        }
    }

    isFirstSegment(segment: Segment) {
        return segment.index == 0;
    }

    isLastSegment(segment: Segment) {
        return segment.index == this.segments[this.segments.length - 1].index;
    }

    resetSegmentDuration(segment:Segment, duration:number) {
        this.chunkedRecorder.resetSegmentDuration(segment, duration);
    }

    private log(message: string) {
        // console.log(message);
    }
}