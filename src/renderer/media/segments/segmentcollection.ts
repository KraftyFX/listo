import EventEmitter from 'events';
import { Logger, getLog } from '~/renderer/media/logutil';
import { formatSegment, formaSegmentSpan as formatSegmentSpan } from './formatutil';
import { Segment } from './interfaces';

export class SegmentCollection extends EventEmitter {
    private logger: Logger;
    private readonly _segments: Segment[] = [];

    constructor() {
        super();

        this.logger = getLog('seg-coll', { logging: 'info' });
    }

    private get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get isEmpty() {
        return this._segments.length === 0;
    }

    addSegment(url: string, duration: number) {
        const segment: Segment = {
            index: this._segments.length,
            url,
            startTime: this.isEmpty ? 0 : this.endOfTime,
            duration,
        };

        this.logger.log(`Adding ${formatSegment(segment)}`);

        this._segments.push(segment);
        this.cleanAllStartTimes();

        this.emitSegmentAdded(segment);

        return segment;
    }

    async getSegmentAtTime(timestamp: number) {
        const segments = this.segments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.logger.log(`Min ${formatSegmentSpan(segment, timestamp)}`);
            return { segment, offset: 0 };
        } else if (timestamp >= this.endOfTime) {
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
            `The timestamp ${timestamp} is in the bounds of this segmented recording ${this.endOfTime} but a segment was not found. This likely means the segments array is corrupt.`
        );

        function isInTheSegment(s: Segment) {
            return s.startTime <= timestamp && timestamp < s.startTime + s.duration;
        }

        function isAtTheEndBoundary(s: Segment) {
            return timestamp === s.startTime + s.duration;
        }
    }

    getNextPlayableSegment(segment: Segment) {
        this.assertIsSegmentDefined(segment);

        const segments = this.segments;

        if (segment.index >= segments.length) {
            return null;
        } else {
            return segments[segment.index + 1];
        }
    }

    isFirstPlayableSegment(segment: Segment) {
        this.assertHasSegments();
        this.assertIsSegmentDefined(segment);

        return segment.index == 0;
    }

    get lastSegment() {
        const segments = this.segments;

        return this.segments[segments.length - 1];
    }

    get endOfTime() {
        if (this.isEmpty) {
            return 0;
        } else {
            const segment = this.lastSegment;

            return segment.startTime + segment.duration;
        }
    }

    isLastPlayableSegment(segment: Segment) {
        this.assertHasSegments();
        this.assertIsSegmentDefined(segment);

        return segment.index == this.lastSegment.index;
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        this.assertIsSegmentDefined(segment);

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
        this.assertHasSegments();

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

    private assertHasSegments() {
        if (this.isEmpty) {
            throw new Error(`The segments collection is empty`);
        }
    }

    private assertIsSegmentDefined(segment: Segment) {
        if (!segment) {
            throw new Error(`The provided segment is undefined`);
        }
    }

    private emitSegmentAdded(segment: Segment) {
        this.emit('segmentadded', segment);
    }

    private emitDurationChange(segment: Segment) {
        this.emit('durationchange', segment);
    }
}
