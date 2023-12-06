import EventEmitter from 'events';
import { Segment, printSegment } from './chunkedrecorder';

export class SegmentCollection extends EventEmitter {
    private _recordingStartTime: Date | null = null;
    private readonly _segments: Segment[] = [];

    get hasRecordingStartTime() {
        return !!this._recordingStartTime;
    }

    get recordingStartTime() {
        if (!this._recordingStartTime) {
            throw new Error(`The recording start time has not been set yet`);
        }

        return this._recordingStartTime;
    }

    set recordingStartTime(value: Date) {
        this._recordingStartTime = value;
    }

    get segments() {
        return this._segments;
    }

    get playableSegments() {
        return this._segments.filter((s) => s.duration > 0);
    }

    get duration() {
        return this._segments.reduce((p, c) => p + c.duration, 0);
    }

    get length() {
        return this._segments.length;
    }

    addSegment(segment: Segment) {
        this._segments.push(segment);

        this.emitSegmentAdded(segment);
    }

    async getSegmentAtTime(timestamp: number) {
        this.assertHasSegments();

        const segments = this._segments;

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

    private assertHasSegments() {
        if (this._segments.length === 0) {
            throw new Error(`The segments collection is empty`);
        }
    }

    private findClosestSegmentForTimestamp(timestamp: number, segments: Segment[]) {
        this.assertHasSegments();

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

    get lastSegment() {
        return this._segments[this.segments.length - 1];
    }

    getNextSegment(segment: Segment) {
        this.assertHasSegments();

        if (segment.index >= this._segments.length - 1) {
            return null;
        } else {
            return this._segments[segment.index + 1];
        }
    }

    isFirstSegment(segment: Segment | null) {
        this.assertHasSegments();

        return segment && segment.index == 0;
    }

    isLastSegment(segment: Segment | null) {
        this.assertHasSegments();

        return segment && segment.index == this._segments[this._segments.length - 1].index;
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        this.assertHasSegments();

        if (segment.duration === duration) {
            return false;
        }

        this.log(
            `Resetting segment ${printSegment(segment)} from ${segment.duration.toFixed(
                3
            )} to ${duration.toFixed(3)}`
        );
        segment.duration = duration;

        let prev = this._segments[0];

        this._segments.forEach((curr) => {
            if (curr.index == 0) {
                return;
            }

            curr.startTime = prev.startTime + prev.duration + 0.0001;

            prev = curr;
        });

        this.emitDurationChange(segment);

        return true;
    }

    private emitSegmentAdded(segment: Segment) {
        this.emit('segmentadded', segment);
    }

    private emitDurationChange(segment: Segment) {
        this.emit('durationchange', segment);
    }

    private log(message: string) {
        // console.log(message);
    }
}
