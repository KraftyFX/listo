import { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import { Logger, getLog } from '~/renderer/media/logutil';
import { Recording } from '~/renderer/media/recording';
import TypedEventEmitter from '../eventemitter';
import { formatSegment } from './formatutil';
import { Segment } from './interfaces';

type SegmentCollectionEvents = {
    reset: (segment: Segment) => void;
    added: (segment: Segment) => void;
};

export class SegmentCollection extends (EventEmitter as new () => TypedEventEmitter<SegmentCollectionEvents>) {
    private logger: Logger;
    private readonly _segments: Segment[] = [];

    constructor() {
        super();

        // TODO: What to do about this logger?
        this.logger = getLog('seg-coll', { logging: null });
    }

    get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get length() {
        return this._segments.length;
    }

    get isEmpty() {
        return this._segments.length === 0;
    }

    get isLastSegmentPartial() {
        return !this.isEmpty && this.lastSegment.isPartial;
    }

    addSegment({ startTime, duration, isPartial }: Recording, url: string) {
        if (!url || duration < 0) {
            throw new Error(`Arguments are invalid`);
        }

        if (this.isLastSegmentPartial) {
            this.removeLastSegment();
        }

        const segment: Segment = {
            index: this._segments.length,
            url,
            startTime,
            duration,
            isPartial,
            hasErrors: false,
        };

        this.logger.log(`Adding ${formatSegment(segment)}`);

        this._segments.push(segment);

        this.assertIsConsistent();

        this.emitSegmentAdded(segment);

        return segment;
    }

    private removeLastSegment() {
        if (!this.isEmpty) {
            this.assertSegmentIsDisposed(this.lastSegment);
            this._segments.pop();
        }
    }

    async getSegmentAtTime(time: Dayjs, bias: 'forward' | 'backward' = 'forward') {
        const segments = this.segments;

        if (time.isSameOrBefore(this.firstSegmentStartTime)) {
            const segment = segments[0];
            return { segment, offset: 0 };
        }

        if (time.isSameOrAfter(this.lastSegmentEndTime)) {
            const segment = this.lastSegment;
            return { segment, offset: segment.duration };
        }

        const segment = this.findClosestSegmentForTime(time, bias);

        if (time.isSameOrBefore(segment.startTime)) {
            return { segment, offset: 0 };
        } else {
            return { segment, offset: time.diff(segment.startTime) / 1000 };
        }
    }

    private findClosestSegmentForTime(time: Dayjs, bias: 'forward' | 'backward') {
        const segments = this.segments;

        if (bias === 'forward') {
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const end = segment.startTime.add(segment.duration, 'seconds');

                if (end.isAfter(time)) {
                    return segment;
                }
            }
        } else if (bias === 'backward') {
            for (let i = segments.length - 1; i >= 0; i--) {
                const segment = segments[i];

                if (segment.startTime.isBefore(time)) {
                    return segment;
                }
            }
        } else {
            throw new Error(`Unrecognized bias for function "${bias}"`);
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

    /**
     * Converts a time to a timecode relative to the start time of the first segment
     * in the collection.
     * @param time time to convert
     * @returns timecode
     */
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

    containsTime(time: Dayjs) {
        if (this.isEmpty) {
            return false;
        }

        const start = this.firstSegmentStartTime;
        const end = this.lastSegmentEndTime;

        return time.isBetween(start, end, 'seconds', '[]');
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

        this.assertIsConsistent();

        this.emitReset(segment);

        return true;
    }

    private assertHasSegments() {
        if (this.isEmpty) {
            throw new Error(`The segments collection is empty`);
        }
    }

    private assertIsConsistent() {
        this.segments.forEach((segment, index) => {
            if (segment.index !== index) {
                throw new Error(`Segment ${index} has a mismatched location. (${segment.index})`);
            }

            if (segment.url === '') {
                throw new Error(`Segment ${index} is disposed when it should not be.`);
            }

            if (index < this.length - 1 && segment.isPartial) {
                throw new Error(`Segment ${index} is partial when it should not be.`);
            }
        });
    }

    private assertIsSegmentDefined(segment: Segment) {
        if (!segment) {
            throw new Error(`The provided segment is undefined`);
        }
    }

    private assertSegmentIsDisposed(segment: Segment) {
        if (segment.url !== '') {
            throw new Error(
                `A segment is being added but the last one in the list is partial. ` +
                    `The old one should be diposed before the new one is added but ` +
                    `was not. This is a logic error.`
            );
        }
    }

    private emitSegmentAdded(segment: Segment) {
        this.emit('added', segment);
    }

    private emitReset(segment: Segment) {
        this.emit('reset', segment);
    }
}
