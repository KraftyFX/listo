import EventEmitter from 'events';
import { Segment } from '~/renderer/media/interfaces';
import { Logger, getLog } from '~/renderer/media/logutil';
import { formatSegment, formaSegmentSpan as formatSegmentSpan } from './formatutil';

export class SegmentCollection extends EventEmitter {
    private logger: Logger;
    private _recordingStartTime: Date | null = null;
    private readonly _segments: Segment[] = [];

    constructor() {
        super();

        this.logger = getLog('seg-coll', { logging: 'info' });
    }

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

    private get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get duration() {
        return this._segments.reduce((p, c) => p + c.duration, 0);
    }

    get isEmpty() {
        return this._segments.length === 0;
    }

    createSegment() {
        const segment: Segment = {
            index: this._segments.length,
            url: '',
            startTime: this.isEmpty ? 0 : this.duration,
            duration: 0,
            chunks: [],
        };

        return segment;
    }

    addSegment(segment: Segment) {
        this.logger.log(`Adding ${formatSegment(segment)}`);

        this._segments.push(segment);
        this.cleanAllStartTimes();

        this.emitSegmentAdded(segment);
    }

    async getSegmentAtTime(timestamp: number) {
        const segments = this.segments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.logger.log(`Min ${formatSegmentSpan(segment, timestamp)}`);
            return { segment, offset: 0 };
        } else if (timestamp >= this.duration) {
            const segment = segments[segments.length - 1];
            this.logger.log(`Max ${formatSegmentSpan(segment, timestamp)}`);
            return { segment, offset: segment.startTime + segment.duration };
        } else {
            const segment = this.findClosestSegmentForTimestamp(timestamp);

            this.logger.log(`Mid ${formatSegmentSpan(segment, timestamp)}`);

            const offset = Math.max(0, timestamp - segment.startTime);

            return { segment, offset };
        }
    }

    private assertHasSegments() {
        if (this.isEmpty) {
            throw new Error(`The segments collection is empty`);
        }
    }

    private findClosestSegmentForTimestamp(timestamp: number) {
        const segments = this.segments;

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
        const segments = this.segments;

        if (segment.index >= segments.length - 1) {
            return null;
        } else {
            return segments[segment.index + 1];
        }
    }

    isFirstPlayableSegment(segment: Segment | null) {
        this.assertHasSegments();

        return segment && segment.index == 0;
    }

    isLastPlayableSegment(segment: Segment | null) {
        const segments = this.segments;

        return segment && segment.index == segments[segments.length - 1].index;
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        if (segment.duration === duration) {
            return false;
        }

        this.logger.log(
            `Resetting duration of ${formatSegment(segment)} to ${duration.toFixed(2)}`
        );

        segment.duration = duration;

        this.cleanAllStartTimes();

        this.emitDurationChange(segment);

        return true;
    }

    private cleanAllStartTimes() {
        const segments = this.segments;

        let prev = segments[0];

        segments.forEach((curr) => {
            if (curr.index == 0) {
                return;
            }

            curr.startTime = prev.startTime + prev.duration + 0.0001;

            prev = curr;
        });
    }

    private emitSegmentAdded(segment: Segment) {
        this.emit('segmentadded', segment);
    }

    private emitDurationChange(segment: Segment) {
        this.emit('durationchange', segment);
    }
}
