import { assert } from 'chai';
import { Segment } from '~/renderer/media/segments/interfaces';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { getLocator } from '~/renderer/services';

describe.only('SegmentCollection', () => {
    describe('addSegment()', () => {
        it('once', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            let raised: Segment = null!;

            segments.on('segmentadded', (segment) => {
                raised = segment;
            });

            const returned = segments.addSegment(host.now, 'test://', 5, false);

            assert.isNotNull(raised, 'raised');
            assert.isNotNull(returned, 'returned');

            assert.equal(raised, returned, 'raised and returned');

            assert.equal(segments.length, 1, 'count');
        });

        it('many times', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            let raised: Segment = null!;

            segments.on('segmentadded', (segment) => {
                raised = segment;
            });

            let last: Segment = null!;

            for (let i = 0; i < 3; i++) {
                last = segments.addSegment(host.now, 'test://', 5, false);

                assert.isNotNull(raised, 'raised');
                assert.isNotNull(last, 'returned');

                assert.equal(raised, last, 'raised and returned');

                assert.equal(segments.length, i + 1, 'count');
                assert.equal(segments.lastSegment, last, `last segment at ${i}`);

                host.advanceTimeBy(5000);
            }
        });

        it('many times with last as partial', async () => {
            const { host } = getLocator();
            const segments = getWithDenseSegments();

            segments.addSegment(host.now, 'test://', 5, true);

            assert.isTrue(segments.isLastSegmentPartial, 'partial');
        });

        it('replaces last partial with new partial', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            const partial = segments.addSegment(host.now, 'test://', 3, true);
            host.advanceTimeBy(3000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            // Fake dispose
            partial.url = '';

            const replacement = segments.addSegment(host.now, 'test://', 4, true);
            host.advanceTimeBy(4000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            assert.equal(segments.lastSegment, replacement, 'last segment');
            assert.equal(segments.length, 1, 'count');
        });

        it('replaces last partial with new full partial', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            const partial = segments.addSegment(host.now, 'test://', 3, true);
            host.advanceTimeBy(3000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            // Fake dispose
            partial.url = '';

            const replacement = segments.addSegment(host.now, 'test://', 4, false);
            host.advanceTimeBy(4000);

            assert.isFalse(segments.isLastSegmentPartial, 'isLastSegmentPartial');
            assert.equal(segments.lastSegment, replacement, 'last segment');
            assert.equal(segments.length, 1, 'count');
        });
    });

    describe('Properties', () => {
        it('firstSegmentStartTime is correct', async () => {
            const segments = getWithDenseSegments();

            assert.equal(
                segments.firstSegmentStartTime,
                segments.segments[0].startTime,
                'start times'
            );
        });

        it('lastSegment is correct', async () => {
            const segments = getWithDenseSegments();
            const actual = segments.segments[segments.length - 1];
            const expected = segments.lastSegment;

            assert.equal(actual, expected, 'segment');
        });

        it('lastSegmentEndTime is correct', async () => {
            const segments = getWithDenseSegments();
            const { startTime, duration } = segments.segments[segments.length - 1];

            const actual = startTime.add(duration, 'seconds');
            const expected = segments.lastSegmentEndTime;

            assert.equal(actual.valueOf(), expected.valueOf(), 'segment');
        });
    });

    describe('Segment instance tests', () => {
        it('isFirstSegment(first) succeeds', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[0];

            assert.isTrue(segments.isFirstSegment(segment), 'first segment');
        });

        it('isFirstSegment(other) fails', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[1];

            assert.isFalse(segments.isFirstSegment(segment), 'first segment');
        });

        it('isLastSegment(last) succeeds', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.lastSegment;

            assert.isTrue(segments.isLastSegment(segment), 'first segment');
        });

        it('isLastSegment(other) fails', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[1];

            assert.isFalse(segments.isLastSegment(segment), 'first segment');
        });

        it('getNextSegment(first) is correct', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.segments[0];
            const next = segments.segments[1];

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(mid) is correct', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.segments[2];
            const next = segments.segments[3];

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(last) is null', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.lastSegment;
            const next = null;

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(null) is null', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();
            const curr = segments.addSegment(host.now, 'test://', 0, false);
            const next = null;

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });
    });

    describe('containsTime()', () => {
        it('before firstSegmentStartTime fails', async () => {
            const segments = getWithDenseSegments();
            const time = segments.firstSegmentStartTime.subtract(1, 'second');

            assert.isFalse(segments.containsTime(time), 'time');
        });

        it('within first/last segment start/end time succeeds', async () => {
            const segments = getWithDenseSegments();
            const duration = segments.lastSegmentEndTime.diff(segments.firstSegmentStartTime);
            const time = segments.firstSegmentStartTime.add(duration / 2, 'milliseconds');

            assert.isTrue(segments.containsTime(time), 'time');
        });

        it('after lastSegmentEndTime fails', async () => {
            const segments = getWithDenseSegments();
            const time = segments.lastSegmentEndTime.add(1, 'second');

            assert.isFalse(segments.containsTime(time), 'time');
        });
    });

    describe('getSegmentAtTime()', () => {
        it('before start returns the start', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[0];
            const time = expectedSegment.startTime.subtract(1, 'second');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });

        it('after end returns the end', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.lastSegment;
            const time = expectedSegment.startTime.add(1, 'second');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, expectedSegment.duration, 'offset');
        });

        it('time within known segment returns it', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = expectedSegment.startTime.add(1.2, 'seconds');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 1.2, 'offset');
        });

        it('time at end of known segment gets the next segment', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = segments.segments[1].startTime.add(
                segments.segments[1].duration,
                'seconds'
            );

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });

        it('time at gap gets next closest segment', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = expectedSegment.startTime.subtract(2, 'seconds');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });
    });
});

function getWithDenseSegments() {
    const segments = new SegmentCollection();
    const { host } = getLocator();
    const duration = 5;

    for (let i = 0; i < 5; i++) {
        segments.addSegment(host.now, 'test://', duration, false);
        host.advanceTimeBy((duration + 0.001) * 1000);
    }

    return segments;
}

function getWithSparseSegments() {
    const segments = new SegmentCollection();
    const { host } = getLocator();

    const recordings = [
        { offset: 0, duration: 4.9 },
        { offset: 5, duration: 4.8 },
        // 5 sec gap
        { offset: 15, duration: 4.9 },
        { offset: 20, duration: 4.8 },
        { offset: 25, duration: 4.9 },
        // 5 sec gap
        { offset: 35, duration: 4.8 },
    ];

    const start = host.now;
    let last: Segment = null!;

    recordings.forEach(({ offset, duration }) => {
        last = segments.addSegment(start.add(offset, 'seconds'), 'test://', duration, false);
    });

    const durationInMs = last.startTime.add(last.duration * 1000).diff(start);
    host.advanceTimeBy(durationInMs);

    return { segments, recordings };
}
