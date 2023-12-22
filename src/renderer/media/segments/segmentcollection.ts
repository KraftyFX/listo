import { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import { Logger, getLog } from '~/renderer/media/logutil';
import TypedEventEmitter from '../eventemitter';
import { formatSegment } from './formatutil';
import { Segment } from './interfaces';

type SegmentedCollectionEvents = {
    reset: (segment: Segment) => void;
    segmentadded: (segment: Segment) => void;
};

export class SegmentCollection extends (EventEmitter as new () => TypedEventEmitter<SegmentedCollectionEvents>) {
    private logger: Logger;
    private readonly _segments: Segment[] = [];

    constructor() {
        super();

        this.logger = getLog('seg-coll', { logging: 'info' });
    }

    get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get isEmpty() {
        return this._segments.length === 0;
    }

    addSegment(startTime: Dayjs, url: string, duration: number, isForced: boolean) {
        const startOffset = this.isEmpty ? 0 : this.getAsTimecode(startTime);

        const segment: Segment = {
            index: this._segments.length,
            url,
            startTime,
            startOffset,
            duration,
            isForced,
        };

        this.logger.log(`Adding ${formatSegment(segment)}`);

        if (!this.isEmpty && this.lastSegment.isForced) {
            this._segments.pop();
        }

        this._segments.push(segment);
        this.cleanAllStartOffsets();

        this.emitSegmentAdded(segment);

        return segment;
    }

    async getSegmentAtTime(time: Dayjs) {
        return this.getSegmentAtTimecode(time);
    }

    async getSegmentAtTimecode(time: Dayjs) {
        const segments = this.segments;

        if (time.isBefore(this.startOfTimeAsTime)) {
            const segment = segments[0];
            return { segment, offset: 0 };
        }

        if (time.isAfter(this.endOfTimeAsTime)) {
            const segment = this.lastSegment;
            return { segment, offset: segment.duration };
        }

        const segment = this.findClosestSegmentForTimecode(time);
        const offset = time.diff(segment.startTime) / 1000;

        return { segment, offset };
    }

    private findClosestSegmentForTimecode(time: Dayjs) {
        const segments = this.segments;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (isInTheSegment(segment)) {
                return segment;
            } else if (isAtTheEndBoundary(segment)) {
                if (i < segments.length - 2) {
                    return segments[i + 1];
                } else {
                    return this.lastSegment;
                }
            }
        }

        throw new Error(
            `The timecode ${this.getAsTimecode(time)} is in the bounds of this segmented ` +
                `recording ${this.getAsTimecode(this.endOfTimeAsTime)} but ` +
                `a segment was not found. This likely means the segments ` +
                `array is corrupt.`
        );

        function isInTheSegment(s: Segment) {
            const isAfterStart = time.isAfter(s.startTime) || time.isSame(s.startTime);
            const isBeforeEnd = time.isBefore(s.startTime.add(s.duration, 'seconds'));

            return isAfterStart && isBeforeEnd;
        }

        function isAtTheEndBoundary(s: Segment) {
            return time.isSame(s.startTime.add(s.duration, 'seconds'));
        }
    }

    getNextSegment(segment: Segment) {
        this.assertIsSegmentDefined(segment);

        const segments = this.segments;

        if (segment.index >= segments.length - 1) {
            return null;
        } else {
            return segments[segment.index + 1];
        }
    }

    isFirstSegment(segment: Segment) {
        this.assertHasSegments();
        this.assertIsSegmentDefined(segment);

        return segment.index == 0;
    }

    isLastSegment(segment: Segment) {
        this.assertHasSegments();
        this.assertIsSegmentDefined(segment);

        return segment.index == this.lastSegment.index;
    }

    get lastSegment() {
        const segments = this.segments;

        return this.segments[segments.length - 1];
    }

    getAsTimecode(time: Dayjs) {
        return time.diff(this.startOfTimeAsTime) / 1000;
    }

    get startOfTimeAsTime() {
        return this.segments[0].startTime;
    }

    get endOfTimeAsTime() {
        const segment = this.lastSegment;

        return segment.startTime.add(segment.duration, 'seconds');
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

        this.cleanAllStartOffsets();

        this.emitReset(segment);

        return true;
    }

    private cleanAllStartOffsets() {
        this.assertHasSegments();

        let [prev, ...rest] = this.segments;

        rest.forEach((curr) => {
            curr.startOffset = prev.startOffset + prev.duration + 0.0001;
            curr.startTime = prev.startTime.add(prev.duration + 0.0001, 'seconds');

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

    private emitReset(segment: Segment) {
        this.emit('reset', segment);
    }
}
