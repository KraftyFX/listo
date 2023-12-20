import { Dayjs } from 'dayjs';
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

    addSegment(startTime: Dayjs, startOffset: number, url: string, duration: number) {
        const segment: Segment = {
            index: this._segments.length,
            url,
            startTime,
            startOffset,
            duration,
        };

        this.logger.log(`Adding ${formatSegment(segment)}`);

        this._segments.push(segment);
        this.cleanAllStartTimes();

        this.emitSegmentAdded(segment);

        return segment;
    }

    async getSegmentAtTimecode(timecode: number) {
        const segments = this.segments;

        if (timecode <= 0) {
            const segment = segments[0];
            this.logger.log(`Min ${formatSegmentSpan(segment, timecode)}`);
            return { segment, offset: 0 };
        } else if (timecode >= this.endOfTime) {
            const segment = segments[segments.length - 1];
            this.logger.log(`Max ${formatSegmentSpan(segment, timecode)}`);
            return { segment, offset: segment.startOffset + segment.duration };
        } else {
            const segment = this.findClosestSegmentForTimecode(timecode);

            this.logger.log(`Mid ${formatSegmentSpan(segment, timecode)}`);

            const offset = Math.max(0, timecode - segment.startOffset);

            return { segment, offset };
        }
    }

    private findClosestSegmentForTimecode(timecode: number) {
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
            `The timecode ${timecode} is in the bounds of this segmented recording ${this.endOfTime} but a segment was not found. This likely means the segments array is corrupt.`
        );

        function isInTheSegment(s: Segment) {
            return s.startOffset <= timecode && timecode < s.startOffset + s.duration;
        }

        function isAtTheEndBoundary(s: Segment) {
            return timecode === s.startOffset + s.duration;
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

    get endOfTime() {
        const segment = this.lastSegment;

        return segment.startOffset + segment.duration;
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

        let [prev, ...rest] = this.segments;

        rest.forEach((curr) => {
            curr.startOffset = prev.startOffset + prev.duration + 0.0001;

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
