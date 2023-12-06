import EventEmitter from 'events';
import { Segment } from './interfaces';
import { formatSegment } from './segmentutil';

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

    get playableSegments() {
        return this._segments.filter((s) => s.duration > 0);
    }

    get duration() {
        return this._segments.reduce((p, c) => p + c.duration, 0);
    }

    get isEmpty() {
        return this._segments.length === 0;
    }

    addNewLiveSegment(startTime: number) {
        // TODO: Think about if this function should accept the relative start
        // time or compute it internally each time a new segment is added
        const liveSegment: Segment = {
            index: this._segments.length,
            url: '',
            startTime,
            duration: 0,
            chunks: [],
        };

        this._segments.push(liveSegment);

        this.emitSegmentAdded(liveSegment);

        return liveSegment;
    }

    finalizeLiveSegment(liveSegment: Segment, url: string, duration: number) {
        this.assertIsLiveSegment(liveSegment);

        liveSegment.url = url;
        liveSegment.duration = duration;

        this.cleanAllStartTimesAndDurations();

        this.log(`Finalizing ${formatSegment(liveSegment)}`);

        this.emitSegmentFinalized(liveSegment);
    }

    private assertIsLiveSegment(liveSegment: Segment) {
        if (liveSegment !== this._segments[this._segments.length - 1]) {
            throw new Error(
                `This function assumes the segment being provided is the` +
                    `active one being recorded which should always be the ` +
                    `last one in the array. There's a bug somewhere.`
            );
        }
    }

    async getSegmentAtTime(timestamp: number) {
        this.assertHasPlayableSegments();

        const segments = this.playableSegments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.log(printSegmentRange('Min', segment));
            return { segment, offset: 0 };
        } else if (timestamp >= this.duration) {
            const segment = segments[segments.length - 1];
            this.log(printSegmentRange('Max', segment));
            return { segment, offset: segment.startTime + segment.duration };
        } else {
            let segment = this.findClosestSegmentForTimestamp(timestamp);

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

    private assertHasPlayableSegments() {
        if (this._segments.length <= 1) {
            throw new Error(`The segments collection is empty`);
        }
    }

    private findClosestSegmentForTimestamp(timestamp: number) {
        this.assertHasPlayableSegments();

        const segments = this.playableSegments;

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

    getNextPlayableSegment(segment: Segment) {
        this.assertHasPlayableSegments();

        const segments = this.playableSegments;

        if (segment.index >= segments.length - 1) {
            return null;
        } else {
            return segments[segment.index + 1];
        }
    }

    isFirstPlayableSegment(segment: Segment | null) {
        this.assertHasPlayableSegments();

        return segment && segment.index == 0;
    }

    isLastPlayableSegment(segment: Segment | null) {
        this.assertHasPlayableSegments();

        const segments = this.playableSegments;

        return segment && segment.index == segments[segments.length - 1].index;
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        this.assertHasPlayableSegments();

        if (segment.duration === duration) {
            return false;
        }

        this.log(`Resetting duration of ${formatSegment(segment)} to ${duration.toFixed(2)}`);

        segment.duration = duration;

        this.cleanAllStartTimesAndDurations();

        this.emitDurationChange(segment);

        return true;
    }

    private cleanAllStartTimesAndDurations() {
        const segments = this._segments;

        let prev = segments[0];

        segments.forEach((curr) => {
            if (curr.index == 0) {
                return;
            }

            curr.startTime = prev.startTime + prev.duration + 0.0001;

            prev = curr;
        });
    }

    private emitSegmentFinalized(segment: Segment) {
        this.emit('segmentfinalized', segment);
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
