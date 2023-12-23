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

    addSegment(startTime: Dayjs, url: string, duration: number, isPartial: boolean) {
        const segment: Segment = {
            index: this._segments.length,
            url,
            startTime,
            duration,
            isPartial,
        };

        this.logger.log(`Adding ${formatSegment(segment)}`);

        this._segments.push(segment);

        this.emitSegmentAdded(segment);

        return segment;
    }

    removeLastSegment() {
        if (!this.isEmpty) {
            this._segments.pop();
        }
    }

    async getSegmentAtTime(time: Dayjs) {
        const segments = this.segments;

        if (time.isBefore(this.firstSegmentStartTime)) {
            const segment = segments[0];
            return { segment, offset: 0 };
        }

        if (time.isAfter(this.lastSegmentEndTime)) {
            const segment = this.lastSegment;
            return { segment, offset: segment.duration };
        }

        const segment = this.findClosestSegmentForTime(time);
        const offset = time.diff(segment.startTime) / 1000;

        return { segment, offset };
    }

    private findClosestSegmentForTime(time: Dayjs) {
        const segments = this.segments;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const end = segment.startTime.add(segment.duration, 'seconds');

            if (end.isAfter(time)) {
                return segment;
            }
        }

        const timecode = this.getAsTimecode(time);
        const max = this.getAsTimecode(this.lastSegmentEndTime);

        console.warn(`Segment for time was not found. time=${timecode} ${max}`);

        return this.lastSegment;
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
        return time.diff(this.firstSegmentStartTime) / 1000;
    }

    get firstSegmentStartTime() {
        return this.segments[0].startTime;
    }

    get lastSegmentEndTime() {
        const segment = this.lastSegment;

        return segment.startTime.add(segment.duration, 'seconds');
    }

    resetSegmentDuration(segment: Segment, duration: number) {
        this.assertIsSegmentDefined(segment);

        const delta = segment.duration - duration;

        if (segment.duration === duration || delta < 0.1) {
            return false;
        }

        this.logger.log(
            `Resetting duration of ${formatSegment(segment)} to ${duration.toFixed(2)}`
        );

        if (delta > 1) {
            this.logger.warn(
                `Segment ${segment.index} had a big delta ${delta.toFixed(2)}s. Adjust start time.`
            );
            segment.startTime = segment.startTime.add(delta, 'seconds');
        }

        segment.duration = duration;

        this.emitReset(segment);

        return true;
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
